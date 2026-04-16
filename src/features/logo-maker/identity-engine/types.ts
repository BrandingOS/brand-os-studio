// Identity Engine — core types. See docs/logo-maker/IDENTITY_ENGINE_BRIEF.md.
//
// The IdentitySystem is the single source of truth for a brand's logo system.
// It's produced by the external flow, consumed by the internal flow, and
// persisted into the existing Brand entity in src/shared/types/brand.ts
// (no parallel schema).

import type { Brief } from '../flow/state/types';

export type VariantId =
  | 'primary'
  | 'horizontal'
  | 'stacked'
  | 'icon_only'
  | 'wordmark_only'
  | 'monogram'
  | 'mono_black'
  | 'mono_white'
  | 'inverse'
  | 'dark_bg'
  | 'light_bg'
  | 'transparent'
  | 'favicon'
  | 'social_avatar'
  | 'watermark'
  | 'print_safe';

export const VARIANT_ORDER: VariantId[] = [
  'primary',
  'horizontal',
  'stacked',
  'icon_only',
  'wordmark_only',
  'monogram',
  'mono_black',
  'mono_white',
  'inverse',
  'dark_bg',
  'light_bg',
  'transparent',
  'favicon',
  'social_avatar',
  'watermark',
  'print_safe',
];

export const VARIANT_LABELS: Record<VariantId, string> = {
  primary: 'Primary',
  horizontal: 'Horizontal',
  stacked: 'Stacked',
  icon_only: 'Icon only',
  wordmark_only: 'Wordmark only',
  monogram: 'Monogram',
  mono_black: 'Monochrome black',
  mono_white: 'Monochrome white',
  inverse: 'Inverse',
  dark_bg: 'Dark background',
  light_bg: 'Light background',
  transparent: 'Transparent',
  favicon: 'Favicon',
  social_avatar: 'Social avatar',
  watermark: 'Watermark',
  print_safe: 'Print-safe',
};

export type DirectionId =
  | 'typographic'
  | 'monogram'
  | 'symbolic'
  | 'geometric'
  | 'editorial'
  | 'luxury'
  | 'institutional'
  | 'tech'
  | 'playful';

export type CreationMode = 'quick' | 'hybrid' | 'craft' | 'upload';

export type Score = 'excellent' | 'good' | 'poor';

export interface GroupRef {
  /** Fabric object name attribute used to locate this logical group. */
  name: string;
  /** Cached bounding box on last evaluation. */
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface LogoDocument {
  svg: string;
  groups: {
    wordmark?: GroupRef;
    symbol?: GroupRef;
    tagline?: GroupRef;
  };
  bounds: { width: number; height: number };
  rendered?: {
    pngUrl?: string;
    png2xUrl?: string;
    thumbnailUrl?: string;
  };
}

export interface ColorSystem {
  primary: string;
  secondary: string;
  accents: string[];
  neutrals: {
    darkest: string;
    dark: string;
    mid: string;
    light: string;
    lightest: string;
  };
}

export interface FontSpec {
  family: string;
  weights: number[];
  source: 'google' | 'system' | 'adobe';
  cssImport?: string;
  fallback: string;
}

export interface TypographySystem {
  heading: FontSpec;
  body: FontSpec;
  mono?: FontSpec;
}

export interface VariantQuality {
  score: Score;
  issues: string[];
}

export interface QualityReport {
  contrast: { score: Score; detail: string };
  scalability: { score: Score; detail: string };
  readability: { score: Score; detail: string };
  balance: { score: Score; detail: string };
  detailDensity: { score: Score; detail: string };
  perVariant: Partial<Record<VariantId, VariantQuality>>;
  overall: Score;
  generatedAt: string;
}

export interface GenerationMetadata {
  mode: CreationMode;
  aiPrompts: string[];
  iterationCount: number;
  timeSpentSeconds: number;
  directionIdsExplored: DirectionId[];
  conceptsGenerated: number;
  remixesCount: number;
}

export interface IdentitySystem {
  id: string;
  brandId: string | null;
  version: number;
  status: 'draft' | 'approved' | 'archived';
  createdAt: string;
  updatedAt: string;

  primary: LogoDocument;
  variants: Partial<Record<VariantId, LogoDocument>>;

  colors: ColorSystem;
  typography: TypographySystem;

  quality: QualityReport;

  brief: Brief;
  direction: DirectionId | null;
  conceptId: string | null;
  parentId: string | null;
  generationMetadata: GenerationMetadata;
}

export interface IdentityEngineContext {
  mode: 'external' | 'internal';
  workspaceId?: string;
  brandId?: string;
  userId?: string;
}
