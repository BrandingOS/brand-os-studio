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
 *  3. **Assign roles from evidence only.** A role with nothing to support it
 *     is left EMPTY. Guessing "this must be the wordmark" because a slot is
 *     free produces a confident wrong answer, and the user then has to notice
 *     and undo it — strictly worse than an empty slot they can fill.
 *
 * Everything returned is a proposal. The user's drag or swap outranks all of
 * it by source priority, and re-running classification cannot undo their
 * placement.
 *
 * Pure — no service, no store, no React.
 */
import type { LogoSlot, OnboardingAsset } from '@/shared/upload/intakeTypes';

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

/** Normalised stem, for the near-duplicate heuristic. */
function stem(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[\s_-]+/g, '')
    .replace(/\b(v?\d+|copy|final|new|old)\b/g, '');
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
 * Deliberately name-based rather than pixel-based: comparing rendered pixels
 * needs a canvas, which would make this impure and untestable in jsdom, and
 * the naming signal is strong — people call these files `logo-white.svg`.
 */
function sameMark(a: OnboardingAsset, b: OnboardingAsset): boolean {
  const sa = withoutVariantTokens(stem(a.name));
  const sb = withoutVariantTokens(stem(b.name));
  if (!sa || !sb) return false;
  return sa === sb;
}

/** The role a single item's evidence supports. `null` when nothing does. */
function roleFor(a: OnboardingAsset): { slot: LogoSlot | null; evidence: string } {
  // Classification already ran and had something to say. That IS evidence.
  if (a.aiLogoSlot) return { slot: a.aiLogoSlot, evidence: 'what we saw in the file' };

  const n = a.name.toLowerCase();
  const has = (...tokens: string[]) => tokens.some((t) => n.includes(t));

  if (has('wordmark', 'logotype', '-type', 'text')) return { slot: 'wordmark', evidence: 'its filename' };
  if (has('icon', 'mark', 'symbol', 'monogram', 'favicon')) return { slot: 'mark', evidence: 'its filename' };
  if (has('white', 'inverse', 'inverted', 'reverse', 'ondark', 'on-dark')) {
    // NOTE the mirrored naming, kept from the flow this restores: the "on dark"
    // slot holds the LIGHT-coloured artwork.
    return { slot: 'dark', evidence: 'its filename' };
  }
  if (has('black', 'onlight', 'on-light')) return { slot: 'light', evidence: 'its filename' };
  if (has('horizontal', 'wide', 'lockup-h')) return { slot: 'horizontal', evidence: 'its filename' };
  if (has('vertical', 'stacked', 'lockup-v')) return { slot: 'vertical', evidence: 'its filename' };

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
export function classifyLogos(items: readonly OnboardingAsset[]): ClassifyResult {
  const images = items.filter((a) => a.kind === 'image' && !a.generated);

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
    const host = groups.find((g) => sameMark(g.lead, a));
    if (host) {
      host.variants.push(a);
      continue;
    }
    const { slot, evidence } = roleFor(a);
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
