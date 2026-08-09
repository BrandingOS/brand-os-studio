/**
 * Canonical Asset domain (Stage 2C foundation).
 *
 * An Asset is any stored binary a brand owns — a logo file, a photo, an uploaded
 * font, a generated image, a document. It is a SEPARATE lifecycle entity that
 * references a brand (Owner Decision 3), not part of the Brand identity aggregate.
 * LogoSystem and Typography reference assets by id (`LogoRef.assetId`,
 * `FontToken.fontAssetId`) — assets are stored once and never inlined.
 *
 * The storage-relevant shape (kind, formats, content-hash metadata) is reused
 * from the correct v3 `BrandAsset`; the canonical `Asset` adds the two aggregate
 * concerns it was missing: explicit ownership (`brandId`) and lifecycle (`status`).
 */
import type { BrandAsset } from '@/shared/types/brandAssets';

export type {
  BrandAssetKind as AssetKind,
  AssetFile,
  AssetFormat,
  LogoRole,
  AssetRef,
  LogoRef,
  BrandAsset,
} from '@/shared/types/brandAssets';

/** Asset lifecycle status. */
export type AssetStatus = 'active' | 'archived' | 'processing';

/**
 * The canonical Asset aggregate: the storage-relevant `BrandAsset` fields plus
 * explicit ownership and lifecycle.
 */
export interface Asset extends BrandAsset {
  /** Owning brand (assets belong to a brand). */
  brandId: string;
  /** Lifecycle status. */
  status: AssetStatus;
}
