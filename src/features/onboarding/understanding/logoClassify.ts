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
 *  3. **Assign roles from evidence, strongest first.** What the classifier saw
 *     in the file, then the artwork's own proportions, then the filename — in
 *     that order, because that is the order they are trustworthy in. A name is
 *     a label someone typed once; a shape is the thing itself.
 *
 * Everything returned is a proposal. The user's drag or swap outranks all of
 * it by source priority, and re-running classification cannot undo their
 * placement.
 *
 * Pure — no service, no store, no React.
 */
import type { LogoSlot, OnboardingAsset } from '@/shared/upload/intakeTypes';
import { sameArtwork, shapeSuggests, type Print } from './imageFingerprint';

/** Visual prints by asset id. Absent falls back to filenames alone. */
export type Prints = ReadonlyMap<string, Print | null>;

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
 * caller may supply a visual fingerprint (see `imageFingerprint.ts`) and that
 * decides when it is available; the filename is the fallback for anything that
 * could not be rendered.
 */
function sameMark(
  a: OnboardingAsset,
  b: OnboardingAsset,
  prints?: Prints,
): boolean {
  const pa = prints?.get(a.id) ?? null;
  const pb = prints?.get(b.id) ?? null;
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
 * The filename is the weakest of the three signals here and the one most often
 * wrong, so the artwork's own proportions get a VETO over it: an icon is not
 * four times wider than it is tall, and a wordmark is not square, whatever the
 * file happens to be called. A vetoed claim leaves the group unroled rather
 * than substituting a second guess — the fill pass below reads the shape
 * directly and says so.
 */
function roleFor(a: OnboardingAsset, print?: Print | null): { slot: LogoSlot | null; evidence: string } {
  // Classification already ran and had something to say. That IS evidence.
  if (a.aiLogoSlot) return { slot: a.aiLogoSlot, evidence: 'what we saw in the file' };

  const n = a.name.toLowerCase();
  const shape = shapeSuggests(print);

  if (word(n, 'wordmark', 'logotype', 'type', 'text')) {
    if (shape !== 'mark') return { slot: 'wordmark', evidence: 'its filename' };
  } else if (word(n, 'icon', 'mark', 'symbol', 'monogram', 'favicon')) {
    if (shape !== 'wordmark') return { slot: 'mark', evidence: 'its filename' };
  }
  // Tone, not shape — these say which background the artwork is FOR, so the
  // proportions have nothing to contradict.
  if (word(n, 'white', 'inverse', 'inverted', 'reverse', 'ondark', 'on-dark')) {
    // NOTE the mirrored naming, kept from the flow this restores: the "on dark"
    // slot holds the LIGHT-coloured artwork.
    return { slot: 'dark', evidence: 'its filename' };
  }
  if (word(n, 'black', 'onlight', 'on-light')) return { slot: 'light', evidence: 'its filename' };
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
  /** Visual fingerprints by asset id. Absent falls back to filenames. */
  prints?: Prints,
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
    const host = groups.find((g) => sameMark(g.lead, a, prints));
    if (host) {
      host.variants.push(a);
      continue;
    }
    const { slot, evidence } = roleFor(a, prints?.get(a.id));
    groups.push({ lead: a, variants: [], slot, evidence });
  }

  // ── 3. roles, from evidence only ─────────────────────────────────────────
  const taken = new Set<LogoSlot>();
  // Tracked because "we could not place it" and "it told us nothing" are
  // different situations, and only the second may become the primary.
  const displaced = new Set<LogoGroup>();
  for (const g of groups) {
    if (g.slot && !taken.has(g.slot)) {
      taken.add(g.slot);
    } else if (g.slot) {
      // The role is already spoken for. Leaving this one unplaced is better
      // than displacing a group whose evidence was just as good.
      g.slot = null;
      g.evidence = '';
      displaced.add(g);
    }
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
  // cannot see.
  //
  // Shape decides first and order is only the fallback. It runs HERE rather
  // than up with the filename evidence because the primary has been settled by
  // now: a symbol-plus-name lockup is wide too, and reading its width earlier
  // would have called the brand's main logo a wordmark.
  for (const g of groups) {
    if (g.slot !== null) continue;
    const shaped = shapeSuggests(prints?.get(g.lead.id));
    if (shaped && !taken.has(shaped)) {
      g.slot = shaped;
      g.evidence = shaped === 'wordmark' ? 'its shape — wide, like set text' : 'its shape — square, like a symbol';
      taken.add(shaped);
      continue;
    }
    const free = SLOT_ORDER.find((s) => !taken.has(s));
    if (!free) break;
    g.slot = free;
    g.evidence = 'the order you brought them';
    taken.add(free);
  }

  return { groups, duplicatesIgnored };
}

/** The slots the board shows, in the order the retired board showed them. */
export const SLOT_ORDER: LogoSlot[] = [
  'primary', 'wordmark', 'mark', 'dark', 'light', 'horizontal', 'vertical',
];

export const SLOT_LABEL: Record<LogoSlot, string> = {
  primary: 'Primary',
  wordmark: 'Wordmark',
  mark: 'Icon',
  dark: 'On dark',
  light: 'On light',
  horizontal: 'Horizontal',
  vertical: 'Vertical',
};
