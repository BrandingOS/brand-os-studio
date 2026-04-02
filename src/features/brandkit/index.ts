/**
 * BrandKit feature — public API.
 *
 * Only export what pages need to compose the Brand Kit experience.
 * Internal components (renderers, modules, galleries) are implementation details.
 */

// ─── Page-level components ─────────────────────────────────────
export { BrandKitHub } from './components/BrandKitHub';
export { BrandKitModuleView } from './components/BrandKitModuleView';

// ─── Types (for page props) ────────────────────────────────────
export type { BrandKitModuleType, BrandKitTemplate, BrandKitModuleConfig } from './types';

// ─── Engine (for cross-feature use) ────────────────────────────
export { validateBrand, contrastRatio, isLightColor } from './engine/brandRules';
export type { BrandValidationResult, BrandIssue } from './engine/brandRules';
