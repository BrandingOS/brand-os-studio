/**
 * Sorting a pile of images into a logo system.
 *
 * Three jobs, in order, because each depends on the last:
 *
 *  1. **Drop exact duplicates.** Identified by content hash, which intake
 *     already computed — so the same file uploaded twice under two names is
 *     one logo, not two. Filename comparison would miss exactly the case
 *     people actually hit.
 *  2. **Group near-duplicates.** A brand's logo and its white-on-dark twin are
 *     the same mark, not two logos. They are grouped under one entry with the
 *     variants attached, rather than listed as separate items — which is what
 *     turned a tidy upload into a wall of near-identical tiles before.
 *  3. **Assign roles from what the artwork IS.** `artwork.ts` looks at the
 *     picture and answers two questions — what is it made of, and how do the
 *     pieces sit — and those answers name the role directly:
 *
 *         a symbol on its own          the icon
 *         the name set as type         the wordmark
 *         symbol beside the name       the primary logo
 *         symbol above the name        the vertical lockup
 *         light artwork                made for dark backgrounds
 *
 *     The filename is kept, below all of that, for images that could not be
 *     read at all. It used to be the primary evidence, which is how a wide
 *     logotype called `Logomark.svg` ended up labelled Icon.
 *
 * Everything returned is a proposal. The user's drag or swap outranks all of
 * it by source priority, and re-running classification cannot undo their
 * placement.
 *
 * Pure — no service, no store, no React.
 */
import type { KnownSlot, LogoSlot, OnboardingAsset } from '@/shared/upload/intakeTypes';
import { sameArtwork, type Artwork } from './artwork';

/** What each image turned out to be, by asset id. */
export type Artworks = ReadonlyMap<string, Artwork | null>;

/**
 * The role the picture itself names — `null` when it is not clear enough.
 *
 * Every branch here is something a person would say out loud looking at the
 * file, which is the point: a role nobody can explain is a role nobody can
 * check.
 */
export function roleFromArtwork(a: Artwork | null | undefined): { slot: LogoSlot; evidence: string } | null {
  if (!a) return null;
  if (a.parts === 'shape') return { slot: 'mark', evidence: 'it is a symbol on its own' };
  if (a.parts === 'text') return { slot: 'wordmark', evidence: 'it is the name, set as type' };
  if (a.parts === 'both') {
    return a.arrangement === 'stacked'
      ? { slot: 'vertical', evidence: 'the symbol sits above the name' }
      : { slot: 'primary', evidence: 'the symbol sits beside the name' };
  }
  return null;
}

export interface LogoGroup {
  /** The item that represents this mark. */
  lead: OnboardingAsset;
  /** Near-identical siblings, folded in rather than listed separately. */
  variants: OnboardingAsset[];
  /** The role the evidence supports, or `null` when nothing does. */
  slot: LogoSlot | null;
  /** Why, in the user's language. Rendered as the origin line. */
  evidence: string;
}

export interface ClassifyResult {
  groups: LogoGroup[];
  /** How many exact duplicates were dropped. Surfaced as a quiet note. */
  duplicatesIgnored: number;
}

/**
 * Normalised stem, for the near-duplicate heuristic.
 *
 * Export noise is stripped before comparing, because it is the SAME artwork
 * that carries it: "Primary Logo.svg" and "Primary Logo@2x.png" are one mark
 * exported twice, and leaving `@2x` in the stem made them two. Density
 * suffixes, pixel dimensions and the usual copy/final/v2 tails all go.
 */
function stem(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    // @2x · @3x · -2x
    .replace(/[@-]\d+x\b/g, '')
    // 1024x1024 · 512×512
    .replace(/\b\d+\s*[x×]\s*\d+\b/g, '')
    .replace(/\b(v?\d+|copy|final|new|old|export|asset|artboard)\b/g, '')
    .replace(/[\s_-]+/g, '');
}

/** Tokens that only ever appear in a variant's name, never in the base mark. */
const VARIANT_TOKENS = [
  'white', 'black', 'mono', 'inverse', 'inverted', 'reverse', 'reversed',
  'light', 'dark', 'ondark', 'onlight', 'negative', 'positive',
];

function withoutVariantTokens(s: string): string {
  let out = s;
  for (const token of VARIANT_TOKENS) out = out.split(token).join('');
  return out;
}

/**
 * Whether two images are the same mark in different dress.
 *
 * The name is a weak signal and often no signal at all — real exports are
 * called "Artboard 26.png" and "Asset 23.png", which agree on nothing. So the
 * caller may supply what the picture turned out to be (see `artwork.ts`) and
 * that decides when it is available; the filename is the fallback for anything
 * that could not be rendered.
 */
function sameMark(
  a: OnboardingAsset,
  b: OnboardingAsset,
  art?: Artworks,
): boolean {
  const pa = art?.get(a.id) ?? null;
  const pb = art?.get(b.id) ?? null;
  if (pa && pb) return sameArtwork(pa, pb);

  const sa = withoutVariantTokens(stem(a.name));
  const sb = withoutVariantTokens(stem(b.name));
  if (!sa || !sb) return false;
  return sa === sb;
}

/**
 * Whether an image is plausibly a logo at all.
 *
 * Photographs are not logos, and treating every image as one filled the board
 * with product shots while the real mark sat in a slot behind them. Anything
 * that fails this stays an ordinary image and lands in Brand Assets, which is
 * where the user will look for it.
 */
export function looksLikeLogo(a: OnboardingAsset): boolean {
  if (a.isLogo || a.logoSlot || a.aiLogoSlot) return true;
  if (a.aiPlacement === 'logos') return true;
  // The classifier has spoken and did not say logos, so this is not a mark.
  // A truthiness check, not a second comparison — the line above already
  // narrowed 'logos' out of the type.
  if (a.aiPlacement) return false;
  const n = a.name.toLowerCase();
  // Vector artwork is almost never a photograph.
  if (/\.svg$/.test(n)) return true;
  return /logo|wordmark|logotype|monogram|brandmark|icon|mark|symbol|favicon|lockup/.test(n);
}

/**
 * Whether a filename contains a token as its OWN word.
 *
 * Substring matching is what made this wrong in the most visible way: `"mark"`
 * is inside `"logomark"`, `"wordmark"`, `"brandmark"` and `"watermark"`, so a
 * wide logotype exported as `Logomark.svg` was labelled Icon on the board. A
 * separator or an end of string has to sit either side of the token now, which
 * keeps `logo-mark.svg` matching and stops `logomark.svg` from doing so.
 */
function word(name: string, ...tokens: string[]): boolean {
  return tokens.some((t) => new RegExp(`(?:^|[\\s_\\-/.])${t}(?:[\\s_\\-/.]|$)`).test(name));
}

/**
 * The role a single item's evidence supports. `null` when nothing does.
 *
 * Order is the whole design: what the picture IS beats what the file is
 * CALLED, always. The filename branches below only run for an image that could
 * not be read — a PDF, a broken export, anything the canvas refused.
 */
function roleFor(a: OnboardingAsset, art?: Artwork | null): { slot: LogoSlot | null; evidence: string } {
  // Classification already ran and had something to say. That IS evidence.
  if (a.aiLogoSlot) return { slot: a.aiLogoSlot, evidence: 'what we saw in the file' };

  const seen = roleFromArtwork(art);
  if (seen) return seen;

  const n = a.name.toLowerCase();
  if (word(n, 'wordmark', 'logotype', 'type', 'text')) {
    return { slot: 'wordmark', evidence: 'its filename' };
  }
  if (word(n, 'icon', 'mark', 'symbol', 'monogram', 'favicon')) {
    return { slot: 'mark', evidence: 'its filename' };
  }
  // Tone, not composition — these say which background the artwork is FOR.
  if (word(n, 'white', 'inverse', 'inverted', 'reverse', 'ondark', 'on-dark')) {
    // NOTE the mirrored naming, kept from the flow this restores: the "on dark"
    // slot holds the LIGHT-coloured artwork.
    return { slot: 'dark', evidence: 'its filename' };
  }
  // Below the tone tokens on purpose: "Primary Logo White" is the on-dark
  // artwork of the primary, and the tone is the more specific fact about it.
  if (word(n, 'primary', 'main')) return { slot: 'primary', evidence: 'its filename' };
  if (word(n, 'horizontal', 'wide', 'lockup-h')) return { slot: 'horizontal', evidence: 'its filename' };
  if (word(n, 'vertical', 'stacked', 'lockup-v')) return { slot: 'vertical', evidence: 'its filename' };

  return { slot: null, evidence: '' };
}

/**
 * Classifies uploaded images into a logo system.
 *
 * `items` should be the images the user brought, in supply order. The first
 * item with no other role becomes `primary`, because something has to be the
 * main logo and "the first one you gave us" is honest and correctable — unlike
 * inventing a reason.
 */
export function classifyLogos(
  items: readonly OnboardingAsset[],
  /** What each picture turned out to be. Absent falls back to filenames. */
  art?: Artworks,
): ClassifyResult {
  const images = items.filter((a) => a.kind === 'image' && !a.generated && looksLikeLogo(a));

  // ── 1. exact duplicates ──────────────────────────────────────────────────
  const seenHash = new Set<string>();
  const unique: OnboardingAsset[] = [];
  let duplicatesIgnored = 0;
  for (const a of images) {
    if (a.contentHash) {
      if (seenHash.has(a.contentHash)) {
        duplicatesIgnored++;
        continue;
      }
      seenHash.add(a.contentHash);
    }
    unique.push(a);
  }

  // ── 2. near-duplicate grouping ───────────────────────────────────────────
  const groups: LogoGroup[] = [];
  for (const a of unique) {
    const host = groups.find((g) => sameMark(g.lead, a, art));
    if (host) {
      host.variants.push(a);
      continue;
    }
    const { slot, evidence } = roleFor(a, art?.get(a.id));
    groups.push({ lead: a, variants: [], slot, evidence });
  }

  // ── 3. roles, from evidence only ─────────────────────────────────────────
  const taken = new Set<LogoSlot>();
  // Tracked because "we could not place it" and "it told us nothing" are
  // different situations, and only the second may become the primary.
  const displaced = new Set<LogoGroup>();

  // Dark artwork is asked first, whatever order the files arrived in.
  //
  // A brand that brings both dresses of one logo brings the black one as the
  // logo and the white one as its on-dark version — but if the white one is
  // simply uploaded first it would take the role and leave the black one
  // homeless. Asking the dark ones first makes the answer the same either way.
  const byTone = [...groups].sort(
    (a, b) => Number(art?.get(a.lead.id)?.tone === 'light') - Number(art?.get(b.lead.id)?.tone === 'light'),
  );
  for (const g of byTone) {
    if (g.slot && !taken.has(g.slot)) {
      taken.add(g.slot);
      continue;
    }
    if (!g.slot) continue;
    // The role is spoken for. If THIS artwork is light, it is not a second
    // primary — it is the on-dark version of the one already there, which is
    // exactly the slot standing empty beside it.
    if (art?.get(g.lead.id)?.tone === 'light' && !taken.has('dark')) {
      g.slot = 'dark';
      g.evidence = 'the artwork is light — made to sit on dark';
      taken.add('dark');
      continue;
    }
    // Leaving this one unplaced is better than displacing a group whose
    // evidence was just as good.
    g.slot = null;
    g.evidence = '';
    displaced.add(g);
  }
  if (!taken.has('primary')) {
    // Only a group that gave NO role evidence at all. A second icon is still
    // an icon — calling it the primary logo because the slot happens to be
    // free is exactly the confident wrong answer this module avoids.
    const first = groups.find((g) => g.slot === null && !displaced.has(g));
    if (first) {
      first.slot = 'primary';
      first.evidence = 'the first logo you brought';
      taken.add('primary');
    }
  }

  // Everything the user brought gets a place on the board.
  //
  // Leaving unplaced logos out was the stricter reading of "evidence only", and
  // it meant someone who uploaded five marks saw two — the rest silently absent
  // with nothing to click. A named slot the user can correct beats a logo they
  // cannot see. What is left here is a second logo of a kind already placed, so
  // the only honest thing to say is the order it arrived in.
  for (const g of groups) {
    if (g.slot !== null) continue;
    const free = SLOT_ORDER.find((s) => !taken.has(s));
    if (!free) break;
    g.slot = free;
    g.evidence = 'the order you brought them';
    taken.add(free);
  }

  return { groups, duplicatesIgnored };
}

/**
 * The slots the board offers, in the order it shows them.
 *
 * No "on light": a logo on a light background is the ordinary case, and every
 * other tile already shows it. `light` survives in the TYPE so a brand saved
 * before this still loads, but nothing places anything there again.
 */
export const SLOT_ORDER: KnownSlot[] = [
  'primary', 'wordmark', 'mark', 'dark', 'horizontal', 'vertical',
];

export const SLOT_LABEL: Record<KnownSlot, string> = {
  primary: 'Primary',
  wordmark: 'Wordmark',
  mark: 'Icon',
  dark: 'On dark',
  light: 'On light',
  horizontal: 'Horizontal',
  vertical: 'Vertical',
};
