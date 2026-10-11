/**
 * Start From Logo — the model.
 *
 * Three things flow through this path, and they are kept apart on purpose:
 *
 *   LogoRead      what the product SAW in the mark (measured, never asked)
 *   BrandContext  what the owner TOLD us (a handful of answers)
 *   BrandSystem   what the two of them DECIDED together (a direction, refined)
 *
 * A direction is a proposal; a system is a decision. Everything downstream —
 * the board, the guidelines, the deck, the files — reads the SYSTEM only, so
 * nothing the owner rejected can leak into a deliverable.
 */

/* ── What the logo is ──────────────────────────────────────────────── */

/** Raw measurements of the ink. Every value is 0–1 unless stated. */
export interface LogoMetrics {
  /** Width ÷ height of the trimmed artwork (not a 0–1 value). */
  ratio: number;
  /** Ink pixels ÷ trimmed-box pixels. */
  coverage: number;
  /** Agreement with its own left-right mirror. */
  symmetry: number;
  /** Share of edge pixels whose gradient is near horizontal/vertical. */
  straightness: number;
  /** Edge pixels ÷ ink pixels — how much outline there is per unit of ink. */
  detail: number;
  /** Mean saturation of the ink, 0–100. A black logo is ~0. */
  inkSaturation: number;
  /** Hue of the ink when it has one (degrees), else null. */
  inkHue: number | null;
  /** True when the source had a real alpha channel. */
  hadTransparency: boolean;
}

export type Geometry = 'geometric' | 'balanced' | 'organic';
export type Weight = 'light' | 'regular' | 'heavy';
export type Proportion = 'wide' | 'square' | 'tall';
export type Composition = 'symbol' | 'wordmark' | 'combination' | 'unclear';

/** The metrics, read as a designer would describe them. */
export interface LogoTraits {
  geometry: Geometry;
  weight: Weight;
  proportion: Proportion;
  symmetric: boolean;
  /** Fine detail / thin features that will not survive small sizes. */
  detailed: boolean;
  composition: Composition;
  /** The mark is already coloured (not a solid black). */
  colored: boolean;
}

export interface LogoRead {
  metrics: LogoMetrics;
  traits: LogoTraits;
  /** Plain-language findings, each tied to a decision it will drive. */
  findings: Array<{ id: string; title: string; detail: string }>;
}

/** The uploaded logo, in the forms the flow needs. */
export interface LogoSource {
  name: string;
  /** The file as uploaded, as a data URL (durable across reloads). */
  originalUrl: string;
  /** The ink isolated onto transparency, black, as a PNG data URL. Used as a mask. */
  inkUrl: string;
  /** The SVG source when the upload was vector — enables true vector exports. */
  svgText?: string;
  /** Pixel size of `inkUrl`. */
  width: number;
  height: number;
}

/* ── What the owner told us ────────────────────────────────────────── */

/** Hue families the owner can love or rule out. */
export type HueFamily =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'neutral';

/** The answers the intake can fill on the owner's behalf. */
export type IntakeField = 'industry' | 'audience' | 'positioning' | 'personality' | 'oneLiner';
/** Where an answer came from — shown beside it, so nothing is a mystery. */
export type IntakeSource = 'website' | 'brief' | 'text' | 'logo' | 'you';

export interface BrandContext {
  name: string;
  /** Whatever the owner pasted: a brief, a website, a few sentences. */
  about: string;
  /** Who filled each answer. Absent = nobody yet. */
  sources: Partial<Record<IntakeField, IntakeSource>>;
  /** One sentence, the owner's own words. Optional. */
  oneLiner: string;
  /** Vocabulary ids (`onboarding/vocabulary`), so Setup reads them back as-is. */
  industry?: string;
  audience?: string;
  positioning?: string;
  personality: string[];
  loveHues: HueFamily[];
  avoidHues: HueFamily[];
}

/* ── What a direction proposes ─────────────────────────────────────── */

export type CornerStyle = 'sharp' | 'soft' | 'rounded' | 'pill';
export type ShapeMotif = 'block' | 'arc' | 'circle' | 'diagonal' | 'blob' | 'line';
export type PatternKind = 'grid' | 'dots' | 'diagonal' | 'waves' | 'mark' | 'confetti' | 'rings';

export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  /** A near-white ground and a near-black ink, both tinted by the primary. */
  light: string;
  dark: string;
}

export interface TypePairing {
  heading: string;
  body: string;
  /** Heading weight the specimen and exports use. */
  headingWeight: number;
}

export interface VoiceSystem {
  /** TONE vocabulary id. */
  tone: string;
  principles: Array<{ title: string; detail: string }>;
  doList: string[];
  dontList: string[];
  /** Sample lines written in the voice. */
  samples: string[];
}

export interface Direction {
  /** Archetype id + variation, stable for one generation. */
  id: string;
  archetypeId: string;
  name: string;
  /** One line a strategist would say about it. */
  essence: string;
  /** Why this fits THIS logo and THESE answers — never generic. */
  rationale: string[];
  palette: Palette;
  /** Alternatives inside the same direction, for refinement. */
  paletteAlternates: Palette[];
  type: TypePairing;
  typeAlternates: TypePairing[];
  corner: CornerStyle;
  motif: ShapeMotif;
  pattern: PatternKind;
  patternAlternates: PatternKind[];
  voice: VoiceSystem;
  /** STYLE vocabulary ids, for `visualStyle.descriptors`. */
  descriptors: string[];
  contrast: 'low' | 'medium' | 'high';
  density: 'tight' | 'balanced' | 'airy';
  /** 0–1 fit score, for ordering only. Never shown as a number. */
  score: number;
}

/* ── What was decided ──────────────────────────────────────────────── */

/** How the mark is coloured by default. */
export type LogoInk = 'dark' | 'primary';

export interface LogoUsage {
  ink: LogoInk;
  /** Clear space as a share of the logo's height. */
  clearSpace: number;
  /** Smallest digital width, px. */
  minWidthPx: number;
  /** When the mark is a symbol, set it beside the name in the heading face. */
  lockup: boolean;
}

/** The sections the owner approves one by one. */
export type SystemSection = 'color' | 'type' | 'shape' | 'pattern' | 'logo' | 'voice';

export interface BrandSystem {
  directionId: string;
  archetypeId: string;
  directionName: string;
  palette: Palette;
  /** The direction's other palettes, kept so refinement can offer them. */
  paletteAlternates: Palette[];
  type: TypePairing;
  corner: CornerStyle;
  motif: ShapeMotif;
  pattern: PatternKind;
  voice: VoiceSystem;
  logo: LogoUsage;
  descriptors: string[];
  contrast: Direction['contrast'];
  density: Direction['density'];
  approved: SystemSection[];
}
