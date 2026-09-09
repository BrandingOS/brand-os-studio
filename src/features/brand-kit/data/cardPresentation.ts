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

/** The design a card's COVER paints, per family.
 *
 *  This is no longer a browsing decision. The drilldown shows the whole
 *  library — every design the family has, filtered by search and chips —
 *  and "featured" survives only as the answer to "which one of these is
 *  the face of the card, and the default a download ships". A tile's ⋯
 *  menu offers `Set as cover`, which writes the user's own answer over
 *  the curated one below.
 *
 *  The lists still hold three ids rather than one: the FIRST is the
 *  cover, and the rest are what an export ships for the card. Anything
 *  not listed here falls back to template order. */
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

  /* The four decks. One variant is one SLIDE (`pres-pitch-ext-3` is slide
   * three), so a deck's shelf is not three designs — it is three PAGES,
   * and the three worth showing are the three GROUNDS the family paints
   * on: the cover, a divider, and a working page. Picking slides 1, 2 and
   * 3 would have shown the cover twice over, because slide 2 is a divider
   * and slide 3 is a page anyway, only with less on it.
   *
   * Without an entry here `featuredTemplates` falls back to the whole
   * library, so each of these cards drew ten tiles where it promises
   * three — which is how a ten-slide deck read as ten separate designs. */
  'Pitch Deck': [
    'pres-pitch-ext-1', // Cover
    'pres-pitch-ext-5', // Offer divider
    'pres-pitch-ext-6', // What we make
  ],
  'Business Plan': [
    'pres-plan-ext-1', // Cover
    'pres-plan-ext-5', // Operations divider
    'pres-plan-ext-6', // Products and services
  ],
  Proposal: [
    'pres-proposal-ext-1', // Cover
    'pres-proposal-ext-5', // Scope divider
    'pres-proposal-ext-6', // Scope of work
  ],
  'Case Studies': [
    'pres-case-ext-1', // Cover
    'pres-case-ext-5', // Work divider
    'pres-case-ext-6', // What we made
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

/** Card labels that have a curated featured list to promote INTO.
 *
 *  It used to decide what the drilldown showed — three designs here,
 *  twenty-seven behind a modal — and it decides nothing of the sort any
 *  more: every family shows its whole library. What is left is narrow
 *  and true: these are the cards whose cover is chosen from a template
 *  library, so these are the cards where a tile can offer `Set as
 *  cover`. Brand-asset cards (Logos / Colors / Fonts / Icons / Photos /
 *  About) are excluded because they are driven by real Setup data and
 *  their cover is composed, not picked. */
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

/** Per-label width-over-height ratio a design is drawn at — on the
 *  card, on a drilldown tile and in an export alike. Falls back to 1.6
 *  (the common business-card / landscape default). Keep this aligned
 *  with each card's natural orientation so a wall of them reads at a
 *  glance. */
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

/* ── Tile density ─────────────────────────────────────────────────
 *
 * How wide a tile has to be before the thing inside it is legible.
 *
 * The drilldown used to be a fixed wall of 260px-minimum cells, which
 * is one answer to four different questions. Twenty-eight icons got a
 * 335×209 cell to show a 48px glyph — a page of mostly empty boxes you
 * scroll for a minute — while a letterhead got the same cell and had to
 * shrink a whole A4 page into it.
 *
 * So the grid is keyed to the MATERIAL, not to a column count. Four
 * steps, each named after what it has to hold:
 *
 *   glyph     one symbol, no text                    (Icons)
 *   swatch    a colour, its name and its hex         (Colors)
 *   mark      a logo, a typeface, a square format    (Logos, Typography…)
 *   document  a printed or screen page               (stationery, decks…)
 *
 * `swatch` exists because a colour tile is not a glyph: the renderer
 * paints the colour's NAME at 22px inside the tile, and at 140px wide
 * that name wraps into the hex under it.
 */
export type TileDensity = 'glyph' | 'swatch' | 'mark' | 'document';

/** Minimum tile width per density — the `minmax()` floor of the grid. */
export const TILE_MIN_PX: Record<TileDensity, number> = {
  glyph: 140,
  swatch: 180,
  mark: 260,
  // 320, measured rather than guessed: the drilldown's content column is
  // ~1045px on a 1440px window, and 340 tips it from three columns to two
  // — a pair of 512px-wide letterheads, which is a magazine spread rather
  // than a library. 320 holds three there and gives four on a wide screen,
  // which is what a floor is for.
  document: 320,
};

/** Families whose material is smaller than a document. Everything not
 *  named here is a document, which is the honest default: most of the
 *  kit is the brand printed or rendered onto a page. */
const DENSITY_BY_LABEL: Record<string, TileDensity> = {
  Icons: 'glyph',
  Colors: 'swatch',
  Logos: 'mark',
  Fonts: 'mark',
  // Square formats. A favicon is a 16px mark and a profile picture is a
  // circle; at document width they are a wall of whitespace.
  Favicon: 'mark',
  Profile: 'mark',
  'Logo Reveal': 'mark',
  'Slide In': 'mark',
  Fade: 'mark',
  Rotate: 'mark',
};

export function densityForLabel(label: string): TileDensity {
  return DENSITY_BY_LABEL[label] ?? 'document';
}

/** The `minmax()` floor a family's grid should use, in px. */
export function tileMinWidth(label: string): number {
  return TILE_MIN_PX[densityForLabel(label)];
}
