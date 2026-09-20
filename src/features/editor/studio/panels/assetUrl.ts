import type { BrandAsset } from '@/shared/types/brandAssets';

/**
 * The best file we have for a brand asset: vector before raster.
 *
 * An asset carries one file per format it was stored in, and which one
 * to draw is a question two panels ask, so it lives beside them rather
 * than inside whichever component happened to need it first.
 */
export function assetUrl(asset: BrandAsset): string | null {
  const order = ['svg', 'png', 'webp', 'jpg', 'jpeg'] as const;
  for (const format of order) {
    const file = asset.formats?.[format as keyof typeof asset.formats];
    if (file?.url) return file.url;
  }
  const first = Object.values(asset.formats ?? {}).find((f) => f?.url);
  return first?.url ?? null;
}
