/**
 * The dashboard shows PROJECTS. A project is not the brand inside it.
 *
 * Someone can hold the same identity twice — a rebrand beside the brand it
 * replaces, one client's brand in two states — and the two cards are then
 * indistinguishable. The obvious fix, renaming one of them, is the wrong one:
 * `Brand.name` is the brand's name in the editor, in the guidelines, in every
 * export, and on the public page. Renaming a card must not reach any of that.
 *
 * So the card carries its own name and its own cover, and this module is the
 * only place that interprets them. Everything above it asks two questions —
 * "what does this card say" and "what does this card show" — and gets an
 * answer that already accounts for an absent label, a deleted cover, and a
 * brand that has neither.
 */
import type { Brand, WorkspaceCard } from '@/shared/types/brand';
import type { AssetFormat } from '@/shared/types/brandAssets';

/** Format preference for a cover — a photograph, so raster before vector. */
const COVER_FORMATS: AssetFormat[] = ['webp', 'png', 'jpg', 'svg'];

/**
 * What this card is called.
 *
 * The brand's own name is the default, not a fallback of last resort: a card
 * whose project was never renamed should read exactly as it always did.
 */
export function brandCardLabel(brand: Brand | null | undefined): string {
  const label = brand?.workspaceCard?.label?.trim();
  if (label) return label;
  return brand?.name?.trim() || 'Untitled';
}

/** True when the card carries a name of its own, distinct from the brand's. */
export function hasProjectLabel(brand: Brand | null | undefined): boolean {
  const label = brand?.workspaceCard?.label?.trim();
  return Boolean(label && label !== brand?.name?.trim());
}

/**
 * The cover image to draw, or `undefined` for none.
 *
 * `coverAssetId` is the identity and is resolved against the brand's Library
 * projection every render, so a replaced asset updates the card and a DELETED
 * one removes the cover. That last part is the point of preferring the id: the
 * projection drops tombstoned items, so an id that no longer resolves means the
 * user deleted the picture, and the honest answer is to show the brand's colour
 * and logo again — not the url the bytes used to live at.
 *
 * `coverUrl` answers only when there is no id at all, which is the case for a
 * cover that never came from the Library.
 */
export function resolveBrandCover(brand: Brand | null | undefined): string | undefined {
  const card = brand?.workspaceCard;
  if (!card) return undefined;

  if (card.coverAssetId) {
    const asset = brand?.brandAssets?.find((a) => a.id === card.coverAssetId);
    if (!asset) return undefined;
    for (const format of COVER_FORMATS) {
      const url = asset.formats?.[format]?.url;
      if (url) return url;
    }
    // An asset stored under a format this list does not name is still a cover.
    const any = Object.values(asset.formats ?? {}).find((f) => f?.url);
    return any?.url ?? undefined;
  }

  return card.coverUrl || undefined;
}

/**
 * Merge a change into the card, and drop the whole value when nothing is left.
 *
 * An empty object would persist as `{}` — a stored decision that says nothing,
 * which is worse than an absent one because every reader then has to prove it
 * is empty. Clearing the last field returns `null`, which is the one value that
 * survives the trip: `undefined` is dropped as "no change" by the patch
 * splitter and by the adapter alike, so it would leave the old card in place.
 */
export function mergeWorkspaceCard(
  current: WorkspaceCard | null | undefined,
  change: WorkspaceCard,
): WorkspaceCard | null {
  const next: WorkspaceCard = { ...current, ...change };
  if (!next.label?.trim()) delete next.label;
  if (!next.coverAssetId) delete next.coverAssetId;
  if (!next.coverUrl) delete next.coverUrl;
  // `null`, not `undefined`: a patch key set to undefined is skipped by every
  // layer between here and the database, so clearing the last field would
  // silently keep the old value. Null is the instruction to clear it.
  return Object.keys(next).length > 0 ? next : null;
}
