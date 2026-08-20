/**
 * `/` is the marketing landing; everything else is the product SPA.
 *
 * Both documents live in the same deploy (see scripts/build-landing.mjs):
 * the SPA at dist/index.html, the landing at dist/landing/index.html.
 * A `_redirects` rule cannot express this — Pages serves an existing
 * asset before it consults the file, and hands unknown paths to
 * `/index.html` before a `/*` rewrite to another document applies. So
 * the swap happens here, in front of asset serving.
 *
 * Only the two paths the landing owns are intercepted; everything else —
 * every asset, every app route — is passed straight through, so this
 * costs the product nothing.
 */
const LANDING_PATHS = new Set(['/', '/archive']);

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    return context.next();
  }
  // The landing document has a real address of its own under /landing/.
  // Send it home so the page is reachable at exactly one URL.
  if (pathname === '/landing') return Response.redirect(new URL('/', url).toString(), 308);

  if (!LANDING_PATHS.has(pathname)) return context.next();

  // `/landing/` and not `/landing/index.html`: Pages canonicalises an
  // explicit index.html to its directory, so asking for the file answers
  // a 308 rather than the document.
  const landing = new URL('/landing/', url);
  const response = await context.env.ASSETS.fetch(new Request(landing, context.request));

  // If the landing document is missing from this deploy, fall through to
  // whatever the deploy does serve rather than showing the visitor a 404.
  if (!response.ok) return context.next();

  // Rebuilt so the body is served AT the requested URL — a 200 for `/`,
  // not a document that claims to live at /landing/index.html.
  return new Response(response.body, {
    status: 200,
    headers: response.headers,
  });
};
