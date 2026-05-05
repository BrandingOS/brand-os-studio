/**
 * Rewrite a brand-scoped URL so it points at a different brand while
 * keeping the current page/tool subpath and query string intact.
 *
 * Phase A namespace-aware: paths under /a/<slug>/ rewrite to /a/<newSlug>/
 * (sticky Classic) so users don't bounce out of their current experience
 * when they switch brands. Studio (/b) and legacy (/dashboard/brand) URLs
 * normalize to the short /b form.
 *
 * Examples (oldSlug=a, newSlug=b):
 *   /b/a/tools/typescale       → /b/b/tools/typescale
 *   /b/a/identity?tab=colors   → /b/b/identity?tab=colors
 *   /dashboard/brand/a/design  → /b/b/design    (normalizes to short form)
 *   /a/a/identity              → /a/b/identity  (sticky Classic)
 *   /a/a                       → /a/b
 *   /dashboard                 → /b/b           (no current brand → root)
 */
export function rewriteBrandPath(
  pathname: string,
  oldSlug: string | undefined,
  newSlug: string,
  search?: string,
): string {
  if (!oldSlug) return `/b/${newSlug}`;

  const studioPrefix = `/b/${oldSlug}`;
  const classicPrefix = `/a/${oldSlug}`;
  const dashboardPrefix = `/dashboard/brand/${oldSlug}`;

  let tail = '';
  let targetNamespace: 'a' | 'b' = 'b';

  if (pathname.startsWith(classicPrefix)) {
    tail = pathname.slice(classicPrefix.length).replace(/^\/+/, '');
    targetNamespace = 'a';
  } else if (pathname.startsWith(studioPrefix)) {
    tail = pathname.slice(studioPrefix.length).replace(/^\/+/, '');
  } else if (pathname.startsWith(dashboardPrefix)) {
    tail = pathname.slice(dashboardPrefix.length).replace(/^\/+/, '');
  }

  const root = `/${targetNamespace}/${newSlug}`;
  return tail ? `${root}/${tail}${search || ''}` : root;
}
