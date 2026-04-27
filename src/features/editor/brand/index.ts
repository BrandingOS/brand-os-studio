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
} from './applyBrandToDocument';
// `BrandResolution` is the canonical type — re-exported from the
// schema module so brand-engine consumers don't need to know which
// file owns it.
export type { BrandResolution } from '@/features/editor/schema';
export { convertToTemplate } from './convertToTemplate';
