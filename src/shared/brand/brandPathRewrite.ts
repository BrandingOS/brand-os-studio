/**
 * Rewrite a brand-scoped URL so it points at a different brand while
 * keeping the current page/tool subpath and query string intact.
 *
 * Examples (oldSlug=a, newSlug=b):
 *   /b/a/tools/typescale       → /b/b/tools/typescale
 *   /b/a/identity?tab=colors   → /b/b/identity?tab=colors
 *   /dashboard/brand/a/design  → /b/b/design    (normalizes to short form)
 *   /dashboard                 → /b/b           (no current brand → land on root)
 */
export function rewriteBrandPath(
  pathname: string,
  oldSlug: string | undefined,
  newSlug: string,
  search?: string,
): string {
  if (!oldSlug) return `/b/${newSlug}`;

  const shortPrefix = `/b/${oldSlug}`;
  const longPrefix = `/dashboard/brand/${oldSlug}`;

  let tail = '';
  if (pathname.startsWith(shortPrefix)) {
    tail = pathname.slice(shortPrefix.length).replace(/^\/+/, '');
  } else if (pathname.startsWith(longPrefix)) {
    tail = pathname.slice(longPrefix.length).replace(/^\/+/, '');
  }

  return tail
    ? `/b/${newSlug}/${tail}${search || ''}`
    : `/b/${newSlug}`;
}
