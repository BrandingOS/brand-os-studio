/**
 * Library query semantics, defined once.
 *
 * `LocalAssetsService` filters in JS with `matchesLibraryQuery`;
 * `SupabaseAssetsService` builds the equivalent SQL. Keeping the rules written
 * down in one place is what stops the two implementations from quietly
 * disagreeing about what "the Library" contains — the exact drift this feature
 * exists to remove.
 *
 * SQL equivalents (kept in sync by hand; each is a one-liner in the adapter):
 *   deleted_at IS NULL                          — tombstones are never listed
 *   archived_at IS NULL                         — unless includeArchived
 *   folder_id IS NULL / folder_id = $           — null means "unfiled"
 *   origin = ANY($)                             — origin
 *   is_favorite = true                          — favorite
 *   use_as_reference = true                     — references
 *   name ILIKE %$%                              — search
 *   tags && $                                   — tags (array overlap)
 */
import type { Asset } from '@/shared/types/brand';
import type { LibraryQuery } from '@/core/types/services';

/** An asset the Library will never show: tombstoned. */
export function isTombstoned(a: Asset): boolean {
  return a.deletedAt != null;
}

export function isArchived(a: Asset): boolean {
  return a.archivedAt != null;
}

export function matchesLibraryQuery(a: Asset, q: LibraryQuery = {}): boolean {
  // A tombstone is an inert lineage record, not Library content. It is never
  // listed, by any query — `getById` is how lineage resolves it.
  if (isTombstoned(a)) return false;
  if (!q.includeArchived && isArchived(a)) return false;

  if (q.folderId !== undefined) {
    const folder = a.folderId ?? null;
    if (folder !== q.folderId) return false;
  }
  if (q.origin?.length && !q.origin.includes(a.origin ?? 'uploaded')) return false;
  if (q.favorite && !a.isFavorite) return false;
  if (q.references && !a.useAsReference) return false;

  if (q.search) {
    const needle = q.search.toLowerCase();
    const haystack = `${a.name} ${(a.tags ?? []).join(' ')}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  if (q.tags?.length) {
    const own = new Set(a.tags ?? []);
    if (!q.tags.some((t) => own.has(t))) return false;
  }
  return true;
}

/** Newest first — the order every Library view expects. */
export function byNewestFirst(a: Asset, b: Asset): number {
  return (
    new Date(b.createdAt as unknown as string).getTime() -
    new Date(a.createdAt as unknown as string).getTime()
  );
}

/**
 * Favourite and dislike are mutually exclusive (a DB CHECK enforces it
 * server-side). Setting one clears the other rather than erroring, because the
 * user's intent is unambiguous: favouriting something you had disliked means
 * you changed your mind, not that you want both.
 */
export function reconcileFlags(
  current: Pick<Asset, 'isFavorite' | 'isDisliked' | 'useAsReference'>,
  patch: Partial<{ isFavorite: boolean; isDisliked: boolean; useAsReference: boolean }>,
): { isFavorite: boolean; isDisliked: boolean; useAsReference: boolean } {
  let isFavorite = patch.isFavorite ?? current.isFavorite ?? false;
  let isDisliked = patch.isDisliked ?? current.isDisliked ?? false;

  if (patch.isFavorite === true) isDisliked = false;
  if (patch.isDisliked === true) isFavorite = false;

  return {
    isFavorite,
    isDisliked,
    useAsReference: patch.useAsReference ?? current.useAsReference ?? false,
  };
}
