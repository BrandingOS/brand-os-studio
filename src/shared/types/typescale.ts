// src/shared/types/typescale.ts

export type FontSource = 'google' | 'system' | 'upload';

export interface FontFile {
  weight: number;
  italic: boolean;
  url: string;
  format: 'woff2' | 'woff' | 'ttf';
}

export interface FontRef {
  family: string;
  source: FontSource;
  weights: number[];
  italic: boolean;
  files?: FontFile[];
  fallback: string;
}

export interface FontPair {
  heading: FontRef;
  body: FontRef;
  mono?: FontRef;
}

export type RatioName =
  | 'minor-second' | 'major-second' | 'minor-third' | 'major-third'
  | 'perfect-fourth' | 'augmented-fourth' | 'perfect-fifth' | 'golden' | 'custom';

export interface Ratio { name: RatioName; value: number }

export type LeadingCurve = 'tight' | 'normal' | 'loose' | 'custom';
export type TrackingCurve = 'tight' | 'normal' | 'loose' | 'custom';

export interface FluidSpec {
  minPx: number;
  maxPx: number;
  minVwPx: number;
  maxVwPx: number;
  clamp: string;
}

export interface ScaleStep {
  id: string;
  index: number;
  sizePx: number;
  lineHeight: number;
  letterSpacingEm: number;
  weight: number;
  fluid?: FluidSpec;
}

export type SemanticRole =
  | 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'bodyLg' | 'body' | 'bodySm' | 'caption' | 'overline' | 'label' | 'button' | 'code';

export interface SemanticEntry {
  stepId: string;
  font: 'heading' | 'body' | 'mono';
  weight?: number;
  italic?: boolean;
  transform?: 'none' | 'uppercase' | 'lowercase' | 'smallcaps';
  trackingEmOverride?: number;
}

export type SemanticMap = Partial<Record<SemanticRole, SemanticEntry>>;

export type SurfaceKey = 'web' | 'ui' | 'presentation' | 'social';

export interface SurfaceFluidConfig {
  minVwPx: number;
  maxVwPx: number;
  minRatioMultiplier: number;
}

export interface ScaleSurface {
  key: SurfaceKey;
  basePx: number;
  ratio: Ratio;
  stepsUp: number;
  stepsDown: number;
  leading: LeadingCurve;
  tracking: TrackingCurve;
  fluid?: SurfaceFluidConfig;
  steps: ScaleStep[];
  semantic: SemanticMap;
}

export interface Typescale {
  schemaVersion: 1;
  fonts: FontPair;
  surfaces: Record<SurfaceKey, ScaleSurface>;
  activeSurface: SurfaceKey;
  updatedAt: string;
}
