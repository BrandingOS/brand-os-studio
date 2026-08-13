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
import { hashUrl } from '@/shared/assets/assetOperations';

/**
 * A stable deletion-match key, derived from the IMAGE, not from where it sits.
 *
 * Deleting a Library item clears its url, so a key has to be stored at creation
 * time or the tombstone becomes unrecognisable and the next Setup save
 * re-creates what the user deleted.
 *
 * The key must identify the IMAGE. Photos used to key on the slot
 * (`photo-<slot>`), which fails in the other direction: delete the photo in
 * slot B, drop a DIFFERENT image into slot B, and the tombstone still matches
 * — so the new photo is never created, and the next hydration drops it from
 * Setup entirely, because Setup reads photos back out of the projection. That
 * loses work the user just did.
 *
 * Hashing the url identifies the image itself, is stable across reordering, and
 * is short enough to store (icons and photos are often data URLs).
 */
function mediaKey(kind: 'photo' | 'icon', url: string): string {
  return `${kind}-${hashUrl(url)}`;
}

/**
 * Matches a Library item to a Setup entry by the url it renders.
 *
 * TOMBSTONES ARE INCLUDED deliberately. A deleted item's url may still sit in
 * a Setup slot, so skipping tombstones here would re-create the asset on the
 * next sync and silently undo an explicit deletion. A tombstone means "the
 * user removed this" — it counts as known.
 */
function urlIndex(items: Asset[]): Set<string> {
  const seen = new Set<string>();
  for (const a of items) {
    if (a.url) seen.add(a.url);
    // A tombstone has its url cleared on delete, so match on what it rendered.
    if (a.deletedAt != null && a.metadata?.originalName) {
      seen.add(a.metadata.originalName);
    }
  }
  return seen;
}

/** True when this Setup entry corresponds to something already known. */
function isKnown(index: Set<string>, url: string, originalName?: string): boolean {
  return index.has(url) || (originalName ? index.has(originalName) : false);
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
  // TOMBSTONES INCLUDED. Without them a deleted photo whose url still sits in
  // a Setup slot would be re-created on the next save, silently undoing an
  // explicit deletion.
  const existing = urlIndex(
    await assets.listLibrary(brandId, { includeArchived: true, includeDeleted: true }),
  );
  let createdPhotos = 0;
  let createdIcons = 0;

  for (const photo of mock.photos ?? []) {
    const src = photo?.src;
    // The slot lives in `name` only — it is a position, not an identity.
    const originalName = src ? mediaKey('photo', src) : '';
    if (!src || isKnown(existing, src, originalName)) continue;
    await assets.create({
      brandId,
      name: `Photo ${photo.slot ?? ''}`.trim(),
      type: 'image',
      category: 'photo',
      source: 'upload',
      url: src,
      tags: ['setup'],
      metadata: { originalName },
      origin: 'uploaded',
    });
    existing.add(src);
    createdPhotos += 1;
  }

  for (const icon of mock.icons ?? []) {
    const originalName = icon ? mediaKey('icon', icon) : '';
    if (!icon || isKnown(existing, icon, originalName)) continue;
    await assets.create({
      brandId,
      name: 'Icon',
      type: 'icon',
      category: 'icon',
      source: 'upload',
      url: icon,
      tags: ['setup'],
      metadata: { originalName },
      origin: 'uploaded',
    });
    existing.add(icon);
    createdIcons += 1;
  }

  return { createdPhotos, createdIcons };
}
