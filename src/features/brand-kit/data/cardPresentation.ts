/**
 * How a Brand Kit card presents itself — its natural shape, and the
 * three variants it opens with.
 *
 * This lives beside the data rather than inside the page because the
 * page is no longer its only reader: an export has to snapshot a card at
 * the shape the card is drawn in, and pick the same featured variant the
 * user is looking at. Two copies of these numbers is two exports that
 * disagree with the screen.
 */
import type { BrandKitTemplate } from '@/features/brandkit/types';

/** Curated 3-tile defaults for cards that have a designed picker
 *  pattern. Anything not listed here falls back to the first 3
 *  templates returned by `variantsForCard` (in template order). The
 *  user-facing UX: each drilldown shows three featured tiles, plus a
 *  "+" button that opens the picker modal to browse the full library
 *  and append more tiles for the session. */
export const DEFAULT_FEATURED_IDS_BY_LABEL: Record<string, string[]> = {
  'Business Card': [
    'business-cards-ext-3',   // Brute Force
    'business-cards-ext-4',   // Frosted Layer
    'business-cards-ext-113', // Wave 2 · 95
  ],
  Letterhead: [
    'letterhead-ext-6',  // Bottom Block
    'letterhead-ext-69', // Wave 2 · 39
    'letterhead-ext-73', // Wave 2 · 43
  ],
  Envelope: [
    'envelope-ext-30',  // Subtle Lux
    'envelope-ext-3',   // Top Flap
    'envelope-ext-127', // Wave 2 · 97
  ],
  Invoice: [
    'invoices-ext-4', // Brute Force
    'invoices-ext-3', // Editorial Header
    'invoices-ext-8', // Receipt Roll
  ],
};

/** Set of card labels that get the "3 featured + picker" pattern.
 *  Brand-asset cards (Logos / Colors / Fonts / Icons / Photos / About)
 *  are intentionally excluded — they're driven by real Setup data,
 *  not template variants. */
export const PICKER_LABELS: ReadonlySet<string> = new Set<string>([
  // Stationery
  'Business Card',
  'Letterhead',
  'Envelope',
  'Invoice',
  // Social
  'Profile',
  'Cover',
  'Post',
  'Story',
  // Web
  'Favicon',
  'Website',
  'Email Signature',
  'Landing Page',
  // Brand Guides
  'Logo Guide',
  'Color Guide',
  'Typography Guide',
  'Voice Guide',
  'Imagery Guide',
  // Presentations
  'Pitch Deck',
  'Business Plan',
  'Proposal',
  'Case Studies',
  // Animations
  'Logo Reveal',
  'Slide In',
  'Fade',
  'Rotate',
]);

/** Per-label width-over-height ratio for the picker modal tiles.
 *  Falls back to 1.6 (the common business-card / landscape default).
 *  Keep this aligned with each card's natural orientation so the
 *  picker grid reads at a glance. */
export const PICKER_ASPECT_BY_LABEL: Record<string, number> = {
  'Business Card': 1.6,
  Letterhead: 1 / 1.414,
  Envelope: 1.6,
  Invoice: 1 / 1.414,
  Profile: 1,
  Cover: 1.6,
  Post: 1,
  Story: 9 / 16,
  Favicon: 1,
  Website: 1.6,
  'Email Signature': 1.6,
  'Landing Page': 1.6,
  'Logo Guide': 1 / 1.414,
  'Color Guide': 1 / 1.414,
  'Typography Guide': 1 / 1.414,
  'Voice Guide': 1 / 1.414,
  'Imagery Guide': 1 / 1.414,
  'Pitch Deck': 1.6,
  'Business Plan': 1.6,
  Proposal: 1.6,
  'Case Studies': 1.6,
  'Logo Reveal': 1,
  'Slide In': 1,
  Fade: 1,
  Rotate: 1,
  // Mockups (spec §3). The ratio is the SCENE's, not the object's: a
  // signage shot, a billboard, a device screen and a stack of cards are
  // all photographed wide; a mug, a tote, a sticker and a tee are all
  // photographed square, because the object fills the frame.
  Signage: 1.6,
  Billboard: 1.6,
  'Device Screen': 1.6,
  'Business Card Stack': 1.6,
  Mug: 1,
  Tote: 1,
  Sticker: 1,
  Apparel: 1,
};

/** The width-over-height ratio a card is drawn at. */
export function aspectForLabel(label: string): number {
  return PICKER_ASPECT_BY_LABEL[label] ?? 1.6;
}

/**
 * The variants a card shows, in the order it shows them.
 *
 * `featuredIds` is the user's own pick when they have made one, the
 * curated default otherwise, and the library's own order for cards that
 * have neither. An id that no longer resolves is dropped rather than
 * rendered as a hole.
 */
export function featuredTemplates(
  label: string,
  all: ReadonlyArray<BrandKitTemplate>,
  saved?: Record<string, string[]>,
): BrandKitTemplate[] {
  const ids = saved?.[label] ?? DEFAULT_FEATURED_IDS_BY_LABEL[label];
  if (!ids) return [...all];
  const picked = ids
    .map((id) => all.find((t) => t.id === id))
    .filter((t): t is BrandKitTemplate => Boolean(t));
  return picked.length > 0 ? picked : [...all];
}

/**
 * Is this a machine's name for a design, rather than a designer's?
 *
 * The Brand Kit's Wave 2 template families were generated in bulk and
 * named by their loop index — `Wave 2 · 95`, `Wave 2 · 43` — which is
 * how a curated picker ends up telling a customer to choose between
 * "Wave 2 · 43" and "Wave 2 · 44". Spec §1 ("Curated"): every variant
 * shown is "named by a designer (never 'Wave 2 · 43')".
 *
 * This is the predicate the curation pass and its guards read, so the
 * shape of the generated name is written down ONCE. It is deliberately
 * narrow — it matches only the exact generated form, so a real design
 * called "Wave" or "Second Wave" is never mistaken for one.
 *
 * The separator is U+00B7 MIDDLE DOT, the character the generator emits.
 */
const GENERATED_NAME = /^Wave \d+ · \d+$/;

export function isGeneratedName(name: string | null | undefined): boolean {
  return typeof name === 'string' && GENERATED_NAME.test(name.trim());
}
