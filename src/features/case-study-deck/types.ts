/**
 * Adaptive Case Study Deck — types.
 *
 * A brand-scoped presentation generator that composes a Behance-style case
 * study from a brand's logo system, color system, typography, strategy, and
 * assets. Not one fixed template — 10 slide archetypes × 3–4 variants each,
 * with a director that picks variants based on brand character so every
 * brand's deck feels authored, not stamped.
 */

export type DeckMode = 'bold' | 'editorial' | 'technical' | 'elegant' | 'playful';

export type SlideArchetype =
  | 'cover'
  | 'manifesto'
  | 'moodboard'
  | 'palette'
  | 'typography'
  | 'signature'
  | 'environmental'
  | 'digital'
  | 'stationery'
  | 'outdoor';

export type VariantId = 'A' | 'B' | 'C' | 'D';

export interface SlideOverrides {
  /** Overrides the image URL for the slide's hero slot, if it has one. */
  image?: string;
  /** Overrides the headline copy. */
  headline?: string;
  /** Overrides the subhead / body copy. */
  subhead?: string;
  /** Designer credit override. Cover slides read this. */
  credit?: string;
  /** If true, skip rendering this slide. */
  hidden?: boolean;
}

export interface SlidePick {
  archetype: SlideArchetype;
  variant: VariantId;
  overrides?: SlideOverrides;
}

export interface DeckPlan {
  brandId: string;
  mode: DeckMode;
  slides: SlidePick[];
  /** Hash of brand state at generation time; used to detect staleness. */
  signature: string;
  generatedAt: string;
  /** A short credit line rendered on the cover. */
  credit?: string;
}

/** Factual read-out of a brand's palette for director decisions. */
export interface PaletteAnalysis {
  primary: string;
  secondary?: string;
  accent?: string;
  /** All color tokens with name + specs. */
  swatches: Swatch[];
  /** True if the primary color is dark (luminance < 0.4). */
  primaryIsDark: boolean;
  /** True if palette has high chroma (saturated). */
  isVibrant: boolean;
  /** Light neutral for paper bgs. */
  paper: string;
  /** Dark neutral for ink bgs. */
  ink: string;
}

export interface Swatch {
  hex: string;
  name: string;
  rgb: string;
  cmyk?: string;
  hsv?: string;
  hsl?: string;
  role?: string;
}

/** Factual read-out of a brand's assets for director decisions. */
export interface AssetInventory {
  /** Primary logo URL (any format). */
  logoPrimary?: string;
  /** Wordmark-only URL. */
  logoWordmark?: string;
  /** Iconmark-only URL. */
  logoIconmark?: string;
  /** Monochrome light URL (for dark bg slides). */
  logoWhite?: string;
  /** Monochrome dark URL. */
  logoBlack?: string;
  /** Image assets tagged as portrait / hero. */
  portraits: string[];
  /** Lifestyle / scene imagery. */
  scenes: string[];
  /** Any image asset available. */
  allImages: string[];
}

/** What the director knows about a brand. Derived, pure. */
export interface BrandProfile {
  id: string;
  name: string;
  tagline: string;
  mission: string;
  personality: string[];
  typography: {
    headingFamily: string;
    bodyFamily: string;
    headingWeight: number;
    bodyWeight: number;
    /** Google Fonts URL(s) to inject into the viewer document. */
    fontUrls: string[];
  };
  palette: PaletteAnalysis;
  assets: AssetInventory;
  mode: DeckMode;
}
