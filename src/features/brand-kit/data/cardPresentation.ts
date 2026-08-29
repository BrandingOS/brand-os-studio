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
  // `business-cards-ext-113` ("Wave 2 · 95") used to sit here: a generated
  // design that printed "VP" over the bound job title, featured on the
  // page a customer opens first. It is archived; the three below are a
  // dark card, a paper-and-brand-panel card and a tinted one, so the row
  // shows the family's range rather than three readings of one idea.
  'Business Card': [
    'business-cards-ext-2', // Colour Block
    'business-cards-ext-3', // Brute Slab
    'business-cards-ext-4', // Soft Layer
  ],
  Letterhead: [
    // `letterhead-ext-69` and `-ext-73` ("Wave 2 · 39" / "Wave 2 · 43")
    // stood in the two slots below until the letterhead curation archived
    // the whole of wave 2 — a featured design named by its generator was
    // the clearest sign this shelf had never been curated at all.
    'letterhead-ext-1',  // Header Bar
    'letterhead-ext-6',  // Bottom Block
    'letterhead-ext-19', // Editorial Masthead
  ],
  Envelope: [
    // `envelope-ext-127` ("Wave 2 · 97") stood here until the envelope
    // curation archived the whole of wave 2. `featuredTemplates` drops an
    // id that no longer resolves, so leaving it would have silently shown
    // two tiles where the card promises three.
    'envelope-ext-30',  // Subtle Lux
    'envelope-ext-3',   // Top Flap
    'envelope-ext-12',  // Half Colour
  ],
  Invoice: [
    'invoices-ext-4', // Brute Force
    'invoices-ext-3', // Editorial Header
    'invoices-ext-8', // Receipt Roll
  ],
  // Three readings of the same signature rather than three variations of
  // one: a quiet rule, a colour band, and a reversed panel. Without an
  // entry here `featuredTemplates` falls back to the WHOLE library, which
  // for a card whose pattern is "three featured + picker" means sixteen
  // tiles where three were promised.
  // Social — four cards, one system. Each shelf shows three readings of
  // the same format rather than three variations of one design: a brand
  // ground, a paper one, and the brand's own near-black. Without an entry
  // here `featuredTemplates` falls back to the WHOLE library, which for a
  // card whose pattern is "three featured + picker" means sixteen tiles
  // where three were promised.
  Profile: [
    'profile-icons-ext-1',  // Solid Circle
    'profile-icons-ext-5',  // Circle Row
    'profile-icons-ext-13', // Ring Circle
  ],
  Cover: [
    'facebook-covers-ext-1', // Wide Banner
    'facebook-covers-ext-3', // Split Panel
    'facebook-covers-ext-6', // Centre Mark
  ],
  Post: [
    'instagram-posts-ext-1', // Statement
    'instagram-posts-ext-2', // Pull Quote
    'instagram-posts-ext-6', // Night Offer
  ],
  Story: [
    'instagram-stories-ext-1', // Tall Statement
    'instagram-stories-ext-4', // Top Chrome
    'instagram-stories-ext-6', // Night Drop
  ],
  'Email Signature': [
    'email-sig-ext-1',  // Brand Rule
    'email-sig-ext-5',  // Brand Header
    'email-sig-ext-12', // Reverse Panel
  ],
  // The web three. Each shelf is three READINGS of the deliverable rather
  // than three decorations of one: for the favicon that is where the mark
  // is first seen, where it is biggest, and where it has to survive.
  Favicon: [
    'favicon-ext-1', // Browser Tab
    'favicon-ext-4', // App Icon
    'favicon-ext-8', // Four Grounds
  ],
  Website: [
    'website-ext-1', // Centre Stage
    'website-ext-3', // Editorial
    'website-ext-5', // Night Shift
  ],
  'Landing Page': [
    'landing-ext-1', // Centre Hero
    'landing-ext-2', // Split Hero
    'landing-ext-6', // Night
  ],
  // The four motion cards. Three READINGS of the family rather than three
  // variations of one — for Slide In that is a plain entrance, a two-part
  // entrance, and one that carries a panel with it. Without an entry here
  // `featuredTemplates` falls back to the whole library, so a card that
  // promises three tiles would draw ten.
  'Logo Reveal': [
    'anim-reveal-ext-1', // Curtain Wipe
    'anim-reveal-ext-6', // Iris Open
    'anim-reveal-ext-9', // Stack Build
  ],
  'Slide In': [
    'anim-slide-ext-1', // From the Left
    'anim-slide-ext-6', // Mark then Word
    'anim-slide-ext-7', // Push Across
  ],
  Fade: [
    // Three GROUNDS, because at rest a fade is its ground: paper, ink and
    // the tinted surface. `anim-fade-ext-8` (Dissolve Grid) stood in the
    // third slot until the drilldown was looked at — its rest frame is
    // paper, identical to Fade In's, so the shelf read as one design twice.
    'anim-fade-ext-1', // Fade In
    'anim-fade-ext-5', // Soft Glow
    'anim-fade-ext-7', // Stagger Fade
  ],
  Rotate: [
    'anim-rotate-ext-1', // Spin In
    'anim-rotate-ext-6', // Ring Spin
    'anim-rotate-ext-9', // Turn & Reveal
  ],

  /* Mockups — eight cards, three readings each rather than three
   * variations of one: the object plain, the object in the brand's own
   * colour, and the object in use beside something else.
   *
   * Signage, Business Card Stack and Device Screen share the `mockups`
   * type and therefore ONE id range (21–26 / 27–32 / 33–38). An id from
   * the wrong range resolves to nothing and `featuredTemplates` drops it
   * silently, so a card that promises three tiles would draw two. */
  Signage: [
    'mockups-ext-21', // Shop Fascia
    'mockups-ext-22', // Blade Sign
    'mockups-ext-25', // Reception Wall
  ],
  Apparel: [
    'mockup-tshirt-ext-1', // Chest Mark
    'mockup-tshirt-ext-2', // Colourway Tee
    'mockup-tshirt-ext-5', // Two Colourways
  ],
  Mug: [
    'mockup-mug-ext-1', // Studio Mug
    'mockup-mug-ext-2', // Colour Block
    'mockup-mug-ext-5', // Mug & Coaster
  ],
  Tote: [
    'mockup-tote-ext-1', // Natural Canvas
    'mockup-tote-ext-2', // Colour Drop
    'mockup-tote-ext-5', // Swing Tag
  ],
  Sticker: [
    'mockup-sticker-ext-1', // Circle Die-Cut
    'mockup-sticker-ext-2', // Rounded Square
    'mockup-sticker-ext-5', // Laptop Lid
  ],
  'Business Card Stack': [
    'mockups-ext-27', // Stack & Face
    'mockups-ext-28', // Front & Back
    'mockups-ext-30', // Painted Edge
  ],
  'Device Screen': [
    'mockups-ext-33', // Phone Splash
    'mockups-ext-34', // Laptop Site
    'mockups-ext-36', // Two Screens
  ],
  Billboard: [
    'mockup-billboard-ext-1', // Roadside Board
    'mockup-billboard-ext-2', // Colour Field
    'mockup-billboard-ext-5', // Digital Screen
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
