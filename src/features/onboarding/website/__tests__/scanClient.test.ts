import { describe, expect, it, vi } from 'vitest';
import { runWebsiteScan, type ScanClientDeps } from '../scanClient';
import type { ScanEvent, WebsiteEvidence } from '../evidence';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } }, SUPABASE_URL: 'http://x', SUPABASE_PUBLISHABLE_KEY: 'k' }));

const evidence = (status: WebsiteEvidence['crawl']['status'], problems: WebsiteEvidence['problems'] = []): WebsiteEvidence => ({
  crawl: { requestedUrl: 'https://n.studio', startedAt: '', finishedAt: '', pagesAttempted: 5, pagesRead: 5, bytes: 1234, requests: 9, status, budgetMs: 15000, elapsedMs: 900 },
  pages: [], metadata: {}, business: { names: [], products: [], contact: {} }, links: [], logoCandidates: [], colors: [], typography: [],
  copy: { voiceSample: [], ctaLabels: [], navLabels: [] }, imagery: { imageCount: 0, altSample: [], hasHero: false }, problems,
  quality: { copyWords: 0, pagesRead: 5, hasAbout: true, hasStructuredData: true, nameCandidates: 1, languages: ['en'] },
});

function streamOf(lines: unknown[], chunking: 'lines' | 'split' = 'lines'): ReadableStream<Uint8Array> {
  const text = lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
  const enc = new TextEncoder();
  const parts = chunking === 'lines' ? text.split(/(?<=\n)/) : [text.slice(0, 17), text.slice(17)];
  return new ReadableStream({
    start(c) {
      for (const p of parts) c.enqueue(enc.encode(p));
      c.close();
    },
  });
}

function deps(res: Response | (() => Promise<Response>), over: Partial<ScanClientDeps> = {}): ScanClientDeps {
  return {
    fetch: vi.fn(async () => (typeof res === 'function' ? res() : res)),
    token: async () => 'jwt',
    baseUrl: 'http://x',
    anonKey: 'k',
    ...over,
  };
}

const REQ = { brandId: 'b1', url: 'https://n.studio' };

describe('streaming the scan', () => {
  it('narrates every event in order and resolves with the evidence', async () => {
    const lines: ScanEvent[] = [
      { type: 'opened', url: 'https://n.studio', finalUrl: 'https://n.studio/', status: 200, redirected: false, ms: 300 },
      { type: 'signals', name: 'Northwind', socials: 2, hasStructuredData: true, ms: 400 },
      { type: 'pages', read: 4, attempted: 4, failed: [], roles: ['about'], ms: 2000 },
      { type: 'identity', logos: 2, colors: 3, fonts: ['Inter'], ms: 2100 },
      { type: 'done', evidence: evidence('complete') },
    ];
    const seen: string[] = [];
    const out = await runWebsiteScan(REQ, (e) => seen.push(e.type), deps(new Response(streamOf(lines), { status: 200 })));
    expect(seen).toEqual(['opened', 'signals', 'pages', 'identity', 'done']);
    expect(out.status).toBe('complete');
    expect(out.evidence?.crawl.pagesRead).toBe(5);
    expect(out.telemetry).toMatchObject({ pagesRead: 5, requests: 9, bytes: 1234, ceilingHit: false });
    expect(out.telemetry.openedMs).toBeDefined();
  });

  it('reassembles lines split across chunks', async () => {
    const lines: ScanEvent[] = [{ type: 'opened', url: 'u', finalUrl: 'u', status: 200, redirected: false, ms: 1 }, { type: 'done', evidence: evidence('partial', [{ code: 'http_error', page: 'u/about', message: 'x', fatal: false }]) }];
    const out = await runWebsiteScan(REQ, () => {}, deps(new Response(streamOf(lines, 'split'), { status: 200 })));
    expect(out.status).toBe('partial');
    expect(out.problems).toHaveLength(1);
  });

  it('sends the session bearer and the brand, never a browser-chosen identity', async () => {
    const d = deps(new Response(streamOf([{ type: 'done', evidence: evidence('complete') }]), { status: 200 }));
    await runWebsiteScan(REQ, () => {}, d);
    const [url, init] = (d.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://x/functions/v1/scan-website');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt');
    expect(JSON.parse(String(init.body))).toEqual(REQ);
  });
});

describe('when the scan cannot run', () => {
  it('no session: failed with a reason, without a request', async () => {
    const d = deps(new Response(''), { token: async () => null });
    const out = await runWebsiteScan(REQ, () => {}, d);
    expect(out).toMatchObject({ status: 'failed', reasonCode: 'not_authenticated' });
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it('a rate-limit answer is named as such', async () => {
    const out = await runWebsiteScan(REQ, () => {}, deps(new Response('slow down', { status: 429 })));
    expect(out).toMatchObject({ status: 'failed', reasonCode: 'rate_limited' });
  });

  it('a fatal error event without evidence is a failed scan carrying that reason', async () => {
    const lines = [{ type: 'error', code: 'dns_failed', message: "We couldn't find n.studio.", fatal: true }, { type: 'done', evidence: evidence('failed', [{ code: 'dns_failed', message: "We couldn't find n.studio.", fatal: true }]) }];
    const out = await runWebsiteScan(REQ, () => {}, deps(new Response(streamOf(lines), { status: 200 })));
    expect(out).toMatchObject({ status: 'failed', reasonCode: 'dns_failed', reason: "We couldn't find n.studio." });
  });

  it('a hung stream is cut at the ceiling and reported as a timeout', async () => {
    const never = new ReadableStream<Uint8Array>({ start() {} });
    const d = deps(() => Promise.resolve(new Response(never, { status: 200 })), { ceilingMs: 30 });
    const out = await runWebsiteScan(REQ, () => {}, d);
    expect(out).toMatchObject({ status: 'failed', reasonCode: 'timeout' });
    expect(out.telemetry.ceilingHit).toBe(true);
  });

  it('a transport failure is a failed scan, not an exception', async () => {
    const d = deps(() => Promise.reject(new Error('offline')));
    await expect(runWebsiteScan(REQ, () => {}, d)).resolves.toMatchObject({ status: 'failed', reasonCode: 'network' });
  });
});
