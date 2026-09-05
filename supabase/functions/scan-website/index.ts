// Edge Function: scan-website — read a brand's website into WebsiteEvidence.
//
// Deterministic only: no AI runs here and the deterministic scan costs no
// credits. Streams NDJSON events (`opened`, `signals`, `identity`, `pages`,
// `done` / `error`) so the client can narrate real progress, then closes.
//
// AUTH: a valid user JWT and a brand the caller can reach. Rate-limited per
// user (10/hour, 40/day) with the kernel's IP secondary cap. Every address it
// touches goes through `safeFetch` (SSRF policy, redirect re-validation, size
// and content-type caps). Telemetry records counts and timings, never copy.
import { corsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit, getClientIp, logCall, withCors } from '../_shared/rate_limit.ts';
import { AuthzError, requireCaller, resolveBrandContext } from '../_shared/authz.ts';
import { denoDeps } from '../_shared/safeFetch.ts';
import { scanWebsite, type ScanEvent } from '../_shared/scanWebsite.ts';

const FUNCTION_NAME = 'scan-website';
const cors = { ...corsHeaders, 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

Deno.serve(withCors(cors, async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  // Who is asking, before anything of theirs is read: an unauthenticated
  // request costs nothing but a token check.
  let caller;
  try {
    caller = await requireCaller(req);
  } catch (err) {
    if (err instanceof AuthzError) return err.toResponse();
    throw err;
  }
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > 4096) return Response.json({ error: 'body_too_large' }, { status: 413, headers: cors });
  let body: { brandId?: string; url?: string };
  try {
    const text = await req.text();
    if (text.length > 4096) return Response.json({ error: 'body_too_large' }, { status: 413, headers: cors });
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400, headers: cors });
  }
  if (typeof body.url !== 'string' || !body.url.trim()) return Response.json({ error: 'url_required' }, { status: 400, headers: cors });
  try {
    if (typeof body.brandId === 'string' && body.brandId) await resolveBrandContext(caller, body.brandId);
  } catch (err) {
    if (err instanceof AuthzError) return err.toResponse();
    throw err;
  }
  const ipAddress = getClientIp(req);
  await enforceRateLimit({
    userId: caller.userId,
    ipAddress,
    functionName: FUNCTION_NAME,
    windows: [{ windowMinutes: 60, maxCalls: 10 }, { windowMinutes: 1440, maxCalls: 40 }],
    ipWindow: { windowMinutes: 1440, maxCalls: 100 },
  });

  const encoder = new TextEncoder();
  const url = body.url.trim();
  const userId = caller.userId;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (e: ScanEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + '\n'));
      scanWebsite(url, emit, { fetch: denoDeps() })
        .then(async (evidence) => {
          await logCall({ userId, ipAddress, functionName: FUNCTION_NAME });
          // Telemetry in the function log: counts and timings only.
          console.log(JSON.stringify({ fn: FUNCTION_NAME, status: evidence.crawl.status, pages: evidence.crawl.pagesRead, requests: evidence.crawl.requests, bytes: evidence.crawl.bytes, ms: evidence.crawl.elapsedMs, problems: evidence.problems.map((p) => p.code) }));
        })
        .catch((err) => {
          emit({ type: 'error', code: 'network', message: String((err as Error)?.message ?? err), fatal: true });
        })
        .finally(() => controller.close());
    },
  });
  return new Response(stream, { headers: { ...cors, 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
}));
