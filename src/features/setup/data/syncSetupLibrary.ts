/**
 * Setup's photos and icons finally get a home.
 *
 * They were the one part of Setup that never persisted: `mockBrandToPatch`
 * deliberately left them in local component state because there was nowhere
 * good to put them — the brand record's asset arrays were already contested.
 * Now there is: the Brand Library.
 *
 * The read side needs nothing. `brandToMockBrand.mapPhotos` already derives
 * photos from `brand.brandAssets`, and that array is now a projection of the
 * Library, so anything written here flows back into Setup on the next
 * hydration. This module only handles the write.
 *
 * Additive by design: it CREATES items that are not in the Library yet and
 * touches nothing else. Removing a photo in Setup does not delete Library
 * material — deletion is an explicit Library action, with its own tombstone
 * and its own blockers, and quietly discarding a user's asset because they
 * rearranged a Setup slot would be exactly the wrong behaviour.
 */
import type { Asset } from '@/shared/types/brand';
import type { IAssetsService } from '@/core/types/services';
import type { MockBrand } from './mockBrand';

/** Matches a Library item to a Setup entry by the url it renders. */
function urlIndex(items: Asset[]): Set<string> {
  return new Set(items.filter((a) => a.deletedAt == null).map((a) => a.url));
}

export interface SetupLibrarySyncResult {
  createdPhotos: number;
  createdIcons: number;
}

export async function syncSetupLibrary(
  brandId: string,
  mock: MockBrand,
  assets: IAssetsService,
): Promise<SetupLibrarySyncResult> {
  const existing = urlIndex(await assets.listForBrand(brandId));
  let createdPhotos = 0;
  let createdIcons = 0;

  for (const photo of mock.photos ?? []) {
    const src = photo?.src;
    if (!src || existing.has(src)) continue;
    await assets.create({
      brandId,
      name: `Photo ${photo.slot ?? ''}`.trim(),
      type: 'image',
      category: 'photo',
      source: 'upload',
      url: src,
      tags: ['setup'],
      metadata: { originalName: `photo-${photo.slot ?? photo.id}` },
      origin: 'uploaded',
    });
    existing.add(src);
    createdPhotos += 1;
  }

  for (const icon of mock.icons ?? []) {
    if (!icon || existing.has(icon)) continue;
    await assets.create({
      brandId,
      name: 'Icon',
      type: 'icon',
      category: 'icon',
      source: 'upload',
      url: icon,
      tags: ['setup'],
      origin: 'uploaded',
    });
    existing.add(icon);
    createdIcons += 1;
  }

  return { createdPhotos, createdIcons };
}
