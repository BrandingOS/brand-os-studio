/**
 * Canonical Asset domain — public API (Stage 2C).
 *
 * One Asset contract, one classification boundary (`classifyAsset`), and the
 * Asset↔identity relationship resolvers. New/migrated paths import from here.
 */
export {
  type Asset,
  type AssetKind,
  type AssetStatus,
  type AssetFile,
  type AssetFormat,
  type AssetRef,
  type LogoRef,
  type LogoRole,
  type BrandAsset,
} from './asset';

export { classifyAsset, type ClassifyInput } from './classify';

export {
  isLegacyUrlRef,
  legacyUrlFromRef,
  formatFromUrl,
  mintAssetFromUrl,
  mintAssetFromLegacyLogoRef,
  resolveLogoAsset,
  resolveFontAsset,
  type MintAssetInput,
} from './assetRelations';
