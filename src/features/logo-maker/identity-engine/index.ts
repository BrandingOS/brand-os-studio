// Barrel export for the Identity Engine. External callers should only import
// from here, never reach into internal modules.

export { identityEngine, createLocalEngine } from './engine';
export type { IdentityEngine } from './engine';
export { generateAllVariants } from './variants/generator';
export {
  VARIANT_ORDER,
  VARIANT_LABELS,
  type VariantId,
  type DirectionId,
  type LogoDocument,
  type IdentitySystem,
  type IdentityEngineContext,
  type ColorSystem,
  type TypographySystem,
  type QualityReport,
  type Score,
  type CreationMode,
} from './types';
