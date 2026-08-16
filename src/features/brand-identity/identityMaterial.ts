/**
 * The brand's material, read from the Library.
 *
 * Kept out of `identityModel` because it is ASYNCHRONOUS and the model is not:
 * the model must be buildable synchronously from a brand alone, so it can be
 * computed in a test, in a snapshot, or on a first paint before any query has
 * returned. Photography and assets simply arrive later and the two sections
 * appear when they do.
 *
 * It also has to go through `IAssetsService` rather than `brand.brandAssets`.
 * That array is a projection built for resolving logo refs, and it deliberately
 * drops exactly what this needs — the folder, the category and the origin. A
 * grid of "brand assets" that cannot say which folder anything is in is a
 * shapeless pile.
 */
import type { Asset } from '@/shared/types/brand';
import type { IAssetsService } from '@/core/types/services';
import type { IdentityImage } from './identityModel';

export interface IdentityMaterial {
  images: IdentityImage[];
  assetGroups: Array<{ name: string; items: IdentityImage[] }>;
}

/** Photographs — brand imagery, never the logo system. */
const isPhoto = (a: Asset) => a.category === 'photo' && a.type !== 'logo';

/**
 * Everything else worth showing, named by where the user filed it.
 *
 * The folder is the better label when there is one: a person who made a folder
 * called "Patterns" has already said what the group is, and a category name we
 * chose ("reference") never says it as well.
 */
const GROUP_LABEL: Partial<Record<Asset['category'], string>> = {
  icon: 'Icons',
  mockup: 'Mockups',
  stationery: 'Stationery',
  social: 'Social',
  application: 'Applications',
  reference: 'Documents',
  typography: 'Typography',
};

function toImage(a: Asset): IdentityImage {
  return { id: a.id, url: a.url, name: a.metadata?.originalName ?? a.name };
}

export async function loadIdentityMaterial(
  assets: IAssetsService,
  brandId: string,
): Promise<IdentityMaterial> {
  let items: Asset[] = [];
  let folders: Array<{ id: string; name: string }> = [];
  try {
    [items, folders] = await Promise.all([
      assets.listLibrary(brandId, {}),
      assets.listFolders(brandId).catch(() => []),
    ]);
  } catch {
    // The Library is an enhancement here, never a gate. A brand whose assets
    // cannot be read still has a logo, a palette and a voice to show.
    return { images: [], assetGroups: [] };
  }

  const live = items.filter((a) => a.deletedAt == null && a.archivedAt == null && Boolean(a.url));
  const folderName = new Map(folders.map((f) => [f.id, f.name]));

  const images = live.filter(isPhoto).map(toImage);

  const groups = new Map<string, IdentityImage[]>();
  for (const a of live) {
    // Logos have their own section, and photographs have theirs.
    if (a.type === 'logo' || a.category === 'logo' || isPhoto(a)) continue;
    const name =
      (a.folderId ? folderName.get(a.folderId) : undefined) ??
      GROUP_LABEL[a.category] ??
      'Brand assets';
    const bucket = groups.get(name) ?? [];
    bucket.push(toImage(a));
    groups.set(name, bucket);
  }

  return {
    images,
    assetGroups: [...groups.entries()].map(([name, list]) => ({ name, items: list })),
  };
}
