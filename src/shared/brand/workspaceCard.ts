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
import { surfacePalette } from '@/shared/brand/brandPalette';
import { pickLogoByPriority } from '@/shared/brand/logoOnBackground';

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

/** What a dashboard card draws behind its name — decided once, for both surfaces. */
export interface BrandCardFace {
  /** Always the brand's own colour. */
  background: string;
  /** Readable ink on that colour, for the letter. */
  color: string;
  /** Present when there is artwork that can be seen. */
  logoUrl?: string;
  /** Present only when there is not. */
  letter?: string;
}

/**
 * The brand's face on a dashboard card: its Primary logo, then its Brand Icon,
 * on the brand's own colour.
 *
 * The GROUND is not negotiable — a dashboard of brand colours is the point, and
 * a neutral tile turns it into a page of beige squares. So the colour stays and
 * the LOGO moves: `pickLogoByPriority` takes the primary, then the icon, and
 * hands off to the contrast search only when neither can be seen on this
 * ground, which is what routes a brand-coloured mark on its own colour to its
 * mono twin.
 *
 * When a brand has ONLY coloured artwork and no mono twin, nothing can be seen
 * on its own colour — a mark inked in the primary, on the primary, is an empty
 * card. That brand keeps a brand ground, just a different one: `inverted` is
 * the palette's near-black TINTED WITH THE BRAND'S HUE, so the logo appears and
 * the card still belongs to the brand. It is never a neutral cream tile; a page
 * of those is a page of beige squares with the brand taken out of it.
 *
 * The letter is the last resort and means something specific: not one variant
 * of this brand's artwork reads on any of its own grounds.
 *
 * Both dashboard surfaces call this. The grid paints a 240px band and the list
 * a 48px tile — different markup, one decision.
 */
export function brandCardFace(brand: Brand | null | undefined): BrandCardFace {
  const surface = surfacePalette(brand as Brand, 'brand');
  const onBrand = pickLogoByPriority(brand, surface.bg)?.url;
  if (onBrand) return { background: surface.bg, color: surface.text, logoUrl: onBrand };

  const inverted = surfacePalette(brand as Brand, 'inverted');
  const onInverted = pickLogoByPriority(brand, inverted.bg)?.url;
  if (onInverted) {
    return { background: inverted.bg, color: inverted.text, logoUrl: onInverted };
  }

  const letter = (brand?.name ?? 'B').trim().slice(0, 1).toUpperCase() || 'B';
  return { background: surface.bg, color: surface.text, letter };
}
