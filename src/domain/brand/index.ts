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
  type VisualStyle,
  type StyleDescriptor,
  type BrandRules,
  type LogoProhibition,
  type Positioning,
  type BusinessInfo,
} from './identity';

export {
  CORE_FIELD_PATHS,
  isCoreFieldPath,
  readCoreValue,
  coreSubsystemOf,
  type CoreFieldPath,
} from './coreFieldPaths';

export {
  AUTHORITY_ORDER,
  HUMAN_ONLY_AUTHORITIES,
  DEFAULT_CORE_VALUE_META,
  isAtLeast,
  isHumanOnlyAuthority,
  sanitizeIdentityMeta,
  coreValueMeta,
  assertActorMayReach,
  recordCoreWrite,
  recordCoreAuthorityChange,
  coreCompleteness,
  type Authority,
  type Provenance,
  type CoreValueMeta,
  type IdentityMeta,
  type Actor,
  type HumanActor,
  type SystemActor,
} from './coreMeta';

export {
  validateCanonicalBrand,
  assertCanonicalBrand,
  type CanonicalBrandValidation,
} from './invariants';

export { fromLegacyBrand } from './fromLegacy';
export { toLegacyBrandPatch } from './toLegacy';
