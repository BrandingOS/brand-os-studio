// Brand engine — public API.

export { BrandKitSchema, LogoAssetSchema, type BrandKit, type LogoAsset } from './BrandKit';
export { brandToBrandKit } from './brandToBrandKit';
export { useBrandKit } from './useBrandKit';
export { normalizeNeutrals } from './neutrals';
export {
  applyBrandToDocument,
  resolveSlotRef,
  type ApplyMode,
  type ApplyBrandOptions,
  type BrandResolutionAnnotation,
} from './applyBrandToDocument';
export { convertToTemplate } from './convertToTemplate';
