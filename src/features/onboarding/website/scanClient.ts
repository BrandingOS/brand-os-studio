/**
 * The browser side of the website scan.
 *
 * Streams the Edge Function's NDJSON events so the processing moment can
 * narrate real progress, and resolves with the evidence. Never throws: every
 * way the scan can fail comes back as an outcome the flow can continue from.
 *
 * `supabase.functions.invoke` buffers the whole body, which is why this uses
 * `fetch` directly with the session's token — the same bearer the client
 * library would attach.
 */
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/client';
import type { Problem, ScanEvent, WebsiteEvidence } from './evidence';

/** The client's ceiling. The server budgets 15s; this only catches a hung stream. */
export const SCAN_CEILING_MS = 25_000;

export interface ScanRequest {
  brandId: string;
  url: string;
}

export interface ScanTelemetry {
  startedAt: number;
  firstEventMs?: number;
  openedMs?: number;
  signalsMs?: number;
  identityMs?: number;
  pagesMs?: number;
  doneMs?: number;
  pagesRead?: number;
  requests?: number;
  bytes?: number;
  ceilingHit: boolean;
  httpStatus?: number;
}

export type ScanStatus = 'complete' | 'partial' | 'failed';

export interface ScanOutcome {
  status: ScanStatus;
  evidence: WebsiteEvidence | null;
  problems: Problem[];
  /** The one-line reason a failed scan failed, in the user's language. */
  reason?: string;
  reasonCode?: string;
  telemetry: ScanTelemetry;
}

export interface ScanClientDeps {
  fetch: typeof fetch;
  token(): Promise<string | null>;
  baseUrl: string;
  anonKey: string;
  ceilingMs?: number;
  now?(): number;
}

export function defaultScanDeps(): ScanClientDeps {
  return {
    fetch: (input, init) => fetch(input, init),
    token: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
    baseUrl: SUPABASE_URL,
    anonKey: SUPABASE_PUBLISHABLE_KEY,
  };
}

function failed(problem: Problem, telemetry: ScanTelemetry): ScanOutcome {
  return { status: 'failed', evidence: null, problems: [problem], reason: problem.message, reasonCode: problem.code, telemetry };
}

/** Runs one scan, narrating events as they arrive. */
export async function runWebsiteScan(req: ScanRequest, onEvent: (e: ScanEvent) => void, deps: ScanClientDeps): Promise<ScanOutcome> {
  const now = deps.now ?? (() => Date.now());
  const telemetry: ScanTelemetry = { startedAt: now(), ceilingHit: false };
  const ms = () => now() - telemetry.startedAt;

  const token = await deps.token();
  if (!token) return failed({ code: 'not_authenticated', message: 'Sign in to read a website.', fatal: true }, telemetry);

  const controller = new AbortController();
  const ceiling = setTimeout(() => {
    telemetry.ceilingHit = true;
    controller.abort();
  }, deps.ceilingMs ?? SCAN_CEILING_MS);

  let res: Response;
  try {
    res = await deps.fetch(`${deps.baseUrl}/functions/v1/scan-website`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: deps.anonKey },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(ceiling);
    return failed({ code: telemetry.ceilingHit ? 'timeout' : 'network', message: telemetry.ceilingHit ? 'Reading the site took too long.' : "We couldn't start reading the site.", fatal: true }, telemetry);
  }
  telemetry.httpStatus = res.status;
  if (!res.ok || !res.body) {
    clearTimeout(ceiling);
    const code = res.status === 429 ? 'rate_limited' : res.status === 401 ? 'not_authenticated' : res.status === 404 ? 'brand_access_denied' : 'unavailable';
    const message =
      res.status === 429 ? "You've read a lot of sites today — try again in a while." : res.status === 401 ? 'Sign in to read a website.' : "The site reader isn't available right now.";
    return failed({ code, message, fatal: true }, telemetry);
  }

  let evidence: WebsiteEvidence | null = null;
  let fatal: Problem | null = null;
  const reader = res.body.getReader();
  // Aborting the fetch does not always wake a pending read; cancelling the
  // reader does, so the ceiling ends the loop either way.
  controller.signal.addEventListener('abort', () => {
    reader.cancel().catch(() => {});
  });
  const decoder = new TextDecoder();
  let buffer = '';
  const handle = (line: string) => {
    if (!line.trim()) return;
    let event: ScanEvent;
    try {
      event = JSON.parse(line) as ScanEvent;
    } catch {
      return;
    }
    if (telemetry.firstEventMs === undefined) telemetry.firstEventMs = ms();
    if (event.type === 'opened') telemetry.openedMs = ms();
    if (event.type === 'signals') telemetry.signalsMs = ms();
    if (event.type === 'identity') telemetry.identityMs = ms();
    if (event.type === 'pages') telemetry.pagesMs = ms();
    if (event.type === 'done') {
      telemetry.doneMs = ms();
      evidence = event.evidence;
      telemetry.pagesRead = event.evidence.crawl.pagesRead;
      telemetry.requests = event.evidence.crawl.requests;
      telemetry.bytes = event.evidence.crawl.bytes;
    }
    if (event.type === 'error' && event.fatal) fatal = { code: event.code, message: event.message, fatal: true };
    onEvent(event);
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl = buffer.indexOf('\n');
      while (nl >= 0) {
        handle(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
        nl = buffer.indexOf('\n');
      }
    }
    if (buffer) handle(buffer);
  } catch {
    /* an aborted or broken stream: judged on what arrived */
  } finally {
    clearTimeout(ceiling);
  }

  if (!evidence) {
    if (fatal) return failed(fatal, telemetry);
    return failed({ code: telemetry.ceilingHit ? 'timeout' : 'stream_ended', message: telemetry.ceilingHit ? 'Reading the site took too long.' : 'The site could not be read.', fatal: true }, telemetry);
  }
  const ev = evidence as WebsiteEvidence;
  if (ev.crawl.status === 'failed') {
    const p = ev.problems.find((x) => x.fatal) ?? { code: 'failed', message: 'The site could not be read.', fatal: true };
    return { status: 'failed', evidence: ev, problems: ev.problems, reason: p.message, reasonCode: p.code, telemetry };
  }
  return { status: ev.crawl.status, evidence: ev, problems: ev.problems, telemetry };
}
