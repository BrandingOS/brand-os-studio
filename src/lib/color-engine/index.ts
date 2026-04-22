/**
 * Public surface of the UI Color System engine.
 *
 * Consumers (the generator UI, the tool session payload, the exporter)
 * should import from this barrel and never reach into individual files —
 * that lets us refactor internals freely.
 */
export * from './types';
export {
  isValidHex,
  normalizeHex,
  hexToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex,
  hexToOklch,
  oklchToHex,
  rgbToHsl,
  hslToRgb,
} from './conversions';
export {
  relativeLuminance,
  wcagContrast,
  wcagLevel,
  apcaContrast,
  apcaLevel,
  evaluatePair,
  type WcagLevel,
  type ApcaLevel,
  type ContrastResult,
} from './contrast';
export { generateShades, type GenerateShadesOptions } from './generateShades';
export { generateHarmony, ALL_HARMONIES, HARMONY_DESCRIPTORS } from './harmony';
export { suggestSemanticSeed, suggestAllSemanticSeeds } from './semantic';
export {
  suggestNeutralScale,
  pickOnColor,
  generateSemanticTokens,
  buildChartRamp,
  type Theme,
} from './roles';
export { validatePalette, type Finding, type Severity } from './validate';
