/**
 * Deck-wide style system.
 *
 * Replaces the old per-slide A/B/C/D variants with deck-wide STYLES — one
 * style propagates across every archetype, so the deck feels like one
 * branded template (Canva/GAMMA-style) rather than ten loose layouts.
 *
 * A style is a token bundle that the archetype renderers read to decide:
 *   - typography (family / weight / tracking / casing / scale)
 *   - spacing (edge padding, block gap, rule thickness)
 *   - color treatment (paper vs flood vs ink, accent role)
 *   - chrome (top/bottom bars, page numerals, rules)
 *   - layout density (column count, asymmetry, card corner radius)
 *   - effect (gradient/noise, shadow)
 *
 * Future expansion: this is also the unit a "template" pivots on. A
 * template = (style + layout palette + asset overrides). Adding new
 * templates means adding new entries to STYLES + small tweaks per
 * archetype's switch.
 */

export type DeckStyleId =
  | 'bold'
  | 'editorial'
  | 'minimal'
  | 'swiss'
  | 'brutalist'
  | 'monolith'
  | 'technical'
  | 'magazine'
  | 'playful'
  | 'modern';

export type DeckStyleCategory = 'editorial' | 'expressive' | 'technical' | 'modern';

export interface DeckStyle {
  id: DeckStyleId;
  name: string;
  /** One-sentence description shown in the picker. */
  description: string;
  /** Used to recommend a style for a brand mode. */
  category: DeckStyleCategory;
  /** Eight-character emoji-free tag rendered in chrome. */
  tag: string;

  typography: {
    /** 'brand' = use the brand's headingFamily; otherwise force a generic stack. */
    headingFamily: 'brand' | 'sans' | 'serif' | 'mono';
    bodyFamily: 'brand' | 'sans' | 'serif' | 'mono';
    headingWeight: number;
    bodyWeight: number;
    eyebrowWeight: number;
    headingTransform?: 'uppercase' | 'none';
    eyebrowTransform: 'uppercase' | 'none';
    headingTracking: string;
    bodyTracking: string;
    eyebrowTracking: string;
    /** Multiplier applied to base heading sizes (1.0 = neutral, 1.25 = bold, 0.85 = quiet). */
    headingScale: number;
    /** Body text scale multiplier. */
    bodyScale: number;
  };

  spacing: {
    /** Edge padding for the slide (px at 1920×1080). */
    pad: number;
    blockGap: number;
    columnGap: number;
    rule: number;
  };

  color: {
    /** Which surface kind dominates. */
    bgRole: 'paper' | 'brand' | 'ink' | 'tinted-paper' | 'tinted-ink';
    /** How brand accent is applied. */
    accentUsage: 'flood' | 'stripe' | 'border' | 'sparingly';
    /** Tonality offset for tinted bgs (-0.2 darken, 0.2 lighten). */
    tint: number;
    /** Quiet text opacity. */
    mutedOpacity: number;
  };

  chrome: {
    /** Top-edge band style. */
    topBar: 'minimal' | 'tabular' | 'numbered' | 'none';
    bottomBar: 'page-num' | 'tagline' | 'meta' | 'none';
    /** Treatment for the slide's section number. */
    cornerNumeral: 'none' | 'oversized' | 'tabular' | 'thin';
    /** Horizontal rules inside chrome. */
    pageRule: 'top' | 'top-bottom' | 'none';
    /** Casing of eyebrow labels. */
    eyebrowCase: 'upper' | 'mixed';
  };

  layout: {
    /** Default column count for body slides. */
    columns: 1 | 2 | 3;
    /** Card corner radius (0 = hard, 24 = soft). */
    cardCorner: number;
    /** Border treatment around content blocks. */
    bordering: 'frame' | 'inset' | 'none';
    /** Layout proportion preference. */
    proportions: 'symmetric' | 'asymmetric-left' | 'asymmetric-right';
  };

  effect: {
    /** Slide background treatment. */
    background: 'flat' | 'gradient' | 'noise' | 'grid' | 'pattern';
    /** Shadow language. */
    shadow: 'none' | 'soft' | 'sharp';
  };
}

/** Where the user's choice lives — auto = use deck default, otherwise an explicit style. */
export type SlideStyleChoice = 'auto' | DeckStyleId;
