/**
 * Canonical Brand domain — public API (Stage 2A).
 *
 * Import the canonical Brand model from here, never from internal files. The
 * canonical types + validation are the authoritative representation; the legacy
 * mappers are the single boundary to the old `Brand` shape.
 */
export {
  CANONICAL_BRAND_SCHEMA_VERSION,
  type CanonicalBrand,
  type BrandIdentity,
  type Strategy,
  type Voice,
  type ColorSystem,
  type ColorToken,
  type LogoSystemRefs,
  type LogoRef,
  type LogoUsageRule,
  type TypographySystem,
  type FontToken,
  type BrandAsset,
  type BrandAssetKind,
  type AssetRef,
  type AssetFormat,
  type LogoRole,
} from './identity';

export {
  validateCanonicalBrand,
  assertCanonicalBrand,
  type CanonicalBrandValidation,
} from './invariants';

export { fromLegacyBrand } from './fromLegacy';
export { toLegacyBrandPatch } from './toLegacy';
