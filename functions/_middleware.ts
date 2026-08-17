// Canonical-host redirect for the Demo environment.
//
// The demo is served from https://demo.brandingos.ai. Cloudflare cannot express
// this with a Redirect Rule, because those apply to zones you own and
// `demo-25t.pages.dev` sits in Cloudflare's own zone — so the redirect has to
// come from the deployment itself.
//
// Scope is deliberately narrow: ONLY the bare project subdomain redirects.
//
//   demo-25t.pages.dev            → redirected (this is the alias being retired)
//   <hash>.demo-25t.pages.dev     → left alone, so per-deployment previews stay
//                                   inspectable
//   demo-b.pages.dev              → left alone; a second project builds from the
//                                   same branch and is not ours to change
//   demo.brandingos.ai            → served normally
//
// 308 rather than 301: it is permanent AND preserves the method and body, so a
// POST is never silently downgraded to a GET. Path and query are carried over
// verbatim; the hash never leaves the browser, so it needs no handling.

/** The one host that should hand traffic over. */
const RETIRED_HOST = 'demo-25t.pages.dev';
const CANONICAL_ORIGIN = 'https://demo.brandingos.ai';

/** Exported for tests: decide where (if anywhere) a request should be sent. */
export function canonicalRedirectFor(requestUrl: string): string | null {
  const url = new URL(requestUrl);
  if (url.hostname !== RETIRED_HOST) return null;
  return `${CANONICAL_ORIGIN}${url.pathname}${url.search}`;
}

export const onRequest: PagesFunction = async (context) => {
  const target = canonicalRedirectFor(context.request.url);
  if (target) {
    return new Response(null, {
      status: 308,
      headers: {
        Location: target,
        // The old host should not be cached as the answer for long.
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
  return context.next();
};
