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
import {
  FACE_PRIORITY,
  knownInkOfRole,
  pickFgOnBackground,
  variantsInPriorityOrder,
} from '@/shared/brand/logoOnBackground';
import {
  inkCoverage,
  inkReadsOn,
  solidInk,
  useImageFit,
  useLogoInks,
  type LogoInk,
} from '@/shared/brand/logoInk';

/** Format preference for a cover — a photograph, so raster before vector. */
const COVER_FORMATS: AssetFormat[] = ['webp', 'png', 'jpg', 'svg'];

/** A card's cover, and how it should sit in the band. */
export interface BrandCover {
  url: string;
  /** `cover` fills and crops (a photograph); `contain` shows the whole thing. */
  fit: 'cover' | 'contain';
}

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
export function resolveBrandCover(brand: Brand | null | undefined): BrandCover | undefined {
  const card = brand?.workspaceCard;
  if (!card) return undefined;

  if (card.coverAssetId) {
    const asset = brand?.brandAssets?.find((a) => a.id === card.coverAssetId);
    if (!asset) return undefined;
    // A LOGO is artwork with a subject, and cropping it is not a crop — it is
    // a mark cut in half. Someone who picks their logo as a cover gets it
    // whole, on the brand's colour, at a sane size. Only a photograph is
    // filled edge to edge, which is what `cover` is for.
    const fit: BrandCover['fit'] = asset.kind === 'logo' ? 'contain' : 'cover';
    for (const format of COVER_FORMATS) {
      const url = asset.formats?.[format]?.url;
      if (url) return { url, fit };
    }
    // An asset stored under a format this list does not name is still a cover.
    const any = Object.values(asset.formats ?? {}).find((f) => f?.url);
    return any?.url ? { url: any.url, fit } : undefined;
  }

  // A bare url carries no record of what it is, so it is treated as a picture.
  return card.coverUrl ? { url: card.coverUrl, fit: 'cover' } : undefined;
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
  if (!next.logoRole) delete next.logoRole;
  if (!next.coverBackground) delete next.coverBackground;
  if (!next.folder?.trim()) delete next.folder;
  // `null`, not `undefined`: a patch key set to undefined is skipped by every
  // layer between here and the database, so clearing the last field would
  // silently keep the old value. Null is the instruction to clear it.
  return Object.keys(next).length > 0 ? next : null;
}

/** A ground the cover picker can offer, with something to call it. */
export interface CardGroundOption {
  hex: string;
  name: string;
}

/**
 * The grounds a card may be set to — the brand's own colours, and the two the
 * automatic rule already reaches for.
 *
 * Those last two matter more than they look. When a logo cannot be seen on the
 * brand's colour, the fix is almost always a near-black or near-white ground,
 * and `surfacePalette(…, 'inverted')` returns them carrying the brand's hue —
 * so the card stays the brand's rather than going neutral. Offering the same
 * two the measurement uses means the manual list can express every answer the
 * automatic one could have reached, plus the ones it could not.
 */
export function brandCardGrounds(brand: Brand | null | undefined): CardGroundOption[] {
  const out: CardGroundOption[] = [];
  const seen = new Set<string>();
  const add = (hex: string | undefined, name: string) => {
    const value = hex?.trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ hex: value, name });
  };

  const colors = brand?.colorSystem;
  add(colors?.primary?.hex ?? brand?.primaryColor, colors?.primary?.name || 'Primary');
  add(colors?.secondary?.hex ?? brand?.secondaryColor, colors?.secondary?.name || 'Secondary');
  add(colors?.accent?.hex ?? brand?.accentColor, colors?.accent?.name || 'Accent');
  colors?.neutrals?.forEach((token, i) => add(token?.hex, token?.name || `Neutral ${i + 1}`));
  brand?.neutrals?.forEach((hex, i) => add(hex, `Neutral ${i + 1}`));

  add(surfacePalette(brand as Brand, 'inverted', 'light').bg, 'Dark');
  add(surfacePalette(brand as Brand, 'inverted', 'dark').bg, 'Light');

  return out;
}

/** What a dashboard card draws behind its name — decided once, for both surfaces. */
export interface BrandCardFace {
  /** The brand's own colour whenever any of its artwork reads on it. */
  background: string;
  /** Readable ink on that colour, for the letter. */
  color: string;
  /** Present when there is artwork that can be seen. */
  logoUrl?: string;
  /** Present only when there is not. */
  letter?: string;
}

/** Contrast a mark must clear to count as visible on a card. */
const FACE_FLOOR = 2.2;

/**
 * The brand's face on a dashboard card: its logo, on its colour.
 *
 * Two rules, and the ORDER of them is the design:
 *
 *   1. The ground is the brand's own colour. It moves only when nothing the
 *      brand owns can be seen on it — and then it moves to the palette's
 *      brand-TINTED extreme, never to a neutral cream tile, because a grid of
 *      those is a grid of beige squares with the brand taken out of it.
 *   2. On that ground, the Primary logo, then the Brand Icon, then any other
 *      variant. Priority decides between variants that can be SEEN; it does not
 *      get to pick one that cannot.
 *
 * What makes rule 2 trustworthy is that "can be seen" is now measured. A
 * coloured variant used to be scored as though it were painted in the brand's
 * primary colour — the only colour the record carries — so a lockup with a
 * yellow mark and a dark grey wordmark scored as YELLOW, cleared the floor on a
 * near-black card, and rendered as a yellow asterisk beside an invisible name.
 * `inks` maps a logo url to the colour the artwork actually is (`logoInk.ts`);
 * `useBrandCardFace` fills it in. Mono variants need no measurement — white is
 * white — and an unmeasured coloured variant falls back to the old guess, which
 * is no worse than where it started.
 *
 * Both dashboard surfaces call this. The grid paints a 240px band and the list
 * a 48px tile — different markup, one decision.
 */
export function brandCardFace(
  brand: Brand | null | undefined,
  inks?: Record<string, LogoInk | undefined>,
): BrandCardFace {
  const brandGround = surfacePalette(brand as Brand, 'brand');
  const letter = (brand?.name ?? 'B').trim().slice(0, 1).toUpperCase() || 'B';

  const all = variantsInPriorityOrder(brand, FACE_PRIORITY);

  // A ground the user chose by hand ends the search rather than joining it.
  // Everything below this line exists to GUESS a readable pairing; once the
  // person looking at the card has said which one they want, guessing again —
  // and moving the ground out from under their choice — is the bug, not the
  // safeguard. It is why they were given the control.
  const chosenGround = brand?.workspaceCard?.coverBackground;
  if (chosenGround) {
    const ink = pickFgOnBackground(chosenGround, ['#111111', '#ffffff']);
    const forcedRole = brand?.workspaceCard?.logoRole;
    const picked = forcedRole ? all.find((v) => v.role === forcedRole) : all[0];
    return picked
      ? { background: chosenGround, color: ink, logoUrl: picked.resolved.url }
      : { background: chosenGround, color: ink, letter };
  }

  if (all.length === 0) {
    return { background: brandGround.bg, color: brandGround.text, letter };
  }

  // A variant the user picked by hand is not a suggestion. It leads, and if it
  // is the only one they want, the ground is what moves around it.
  const forced = brand?.workspaceCard?.logoRole;
  const variants = forced ? all.filter((v) => v.role === forced) : all;
  const candidates = variants.length > 0 ? variants : all;

  const inkOf = (v: (typeof all)[number]): LogoInk | undefined => {
    const known = knownInkOfRole(v.role);
    if (known) return solidInk(known);
    return inks?.[v.resolved.url] ?? (brand?.primaryColor ? solidInk(brand.primaryColor) : undefined);
  };

  // Rule 1 first: keep the brand's colour if a variant READS on it — every
  // significant part of it, not the average — and let priority choose among
  // the ones that do.
  for (const variant of candidates) {
    if (inkReadsOn(inkOf(variant), brandGround.bg, FACE_FLOOR)) {
      return {
        background: brandGround.bg,
        color: brandGround.text,
        logoUrl: variant.resolved.url,
      };
    }
  }

  // Nothing reads on the brand's colour. Keep the brand's OWN logo — the first
  // in priority order — and move the ground to a brand-tinted extreme. Asking
  // the palette for `inverted` in both modes gives near-black and near-white,
  // both carrying the brand's hue.
  const dark = surfacePalette(brand as Brand, 'inverted', 'light');
  const light = surfacePalette(brand as Brand, 'inverted', 'dark');
  for (const variant of candidates) {
    const ink = inkOf(variant);
    for (const ground of [dark, light]) {
      if (inkReadsOn(ink, ground.bg, FACE_FLOOR)) {
        return { background: ground.bg, color: ground.text, logoUrl: variant.resolved.url };
      }
    }
  }

  // No pairing is perfect. This happens for real artwork and is not a defect in
  // it: a light accent beside a dark body wants two different grounds at once,
  // and no flat colour is both. Showing the brand's initial instead would lose
  // MORE of the logo than any of these, so take the pairing that loses least —
  // and, on a tie, the brand's own colour.
  let best: { face: BrandCardFace; coverage: number } | undefined;
  for (const variant of candidates) {
    const ink = inkOf(variant);
    for (const ground of [brandGround, dark, light]) {
      const coverage = inkCoverage(ink, ground.bg, FACE_FLOOR);
      if (!best || coverage > best.coverage) {
        best = {
          coverage,
          face: {
            background: ground.bg,
            color: ground.text,
            logoUrl: variant.resolved.url,
          },
        };
      }
    }
  }

  if (best && best.coverage > 0) return best.face;
  // Nothing of any variant can be seen anywhere. Only now is a letter right.
  return { background: brandGround.bg, color: brandGround.text, letter };
}

/**
 * `brandCardFace`, with the artwork's ink actually measured.
 *
 * The first render uses the guess; measurements land a frame or two later and,
 * for a logo already seen this session, are there immediately. Use this
 * anywhere a card is rendered — the pure function is for tests and for code
 * that cannot hold state.
 */
export function useBrandCardFace(brand: Brand | null | undefined): BrandCardFace {
  const variants = variantsInPriorityOrder(brand, FACE_PRIORITY);
  // Only the coloured variants are a question. A mono variant's ink is certain,
  // so there is nothing to load for it.
  const unknown = variants.filter((v) => !knownInkOfRole(v.role)).map((v) => v.resolved.url);
  const inks = useLogoInks(unknown);
  return brandCardFace(brand, inks);
}

/**
 * A cover, with how it should sit decided by the picture rather than by what
 * the Library happened to call it.
 *
 * `resolveBrandCover` reads the asset's kind, which is right when the kind is
 * right — and a logo uploaded through the DAM as a plain image is filed as one.
 * That is how a mark ended up scaled to fill a card and bleeding past both its
 * edges. So the image itself is asked: anything with a transparent field is
 * shown whole, and only a demonstrably opaque picture is allowed to crop.
 */
export function useBrandCover(brand: Brand | null | undefined): BrandCover | undefined {
  const cover = resolveBrandCover(brand);
  const measured = useImageFit(cover?.url);
  if (!cover) return undefined;
  // Either signal saying "artwork" is enough. Only agreement allows a crop.
  const fit = cover.fit === 'contain' || measured === 'contain' ? 'contain' : 'cover';
  return { url: cover.url, fit };
}
