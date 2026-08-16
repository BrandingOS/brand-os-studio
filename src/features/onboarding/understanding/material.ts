/**
 * Supplied material → the Library, durably.
 *
 * "Durably" is the whole point of this module. Onboarding holds each upload as
 * an `OnboardingAsset` whose `previewUrl` is an object URL — `blob:…` — because
 * that is what a preview needs and nothing more. An object URL lives exactly as
 * long as the document that minted it, so storing one as a Library asset's `url`
 * produces a row that looks complete, renders while you are still on the page,
 * and resolves to nothing the moment you reload. The brand had its files and
 * could not show any of them.
 *
 * So the bytes are read and stored, not the handle to them. That is the same
 * thing `useAssetUpload` does for every other upload surface in the product, and
 * this module deliberately reuses its parts — `stageAsset` for the content-hash
 * identity, the same compression profiles, the same "use the id the Library
 * returned" rule — rather than inventing a second asset pipeline for onboarding.
 */
import type { Asset, Brand } from '@/shared/types/brand';
import type { LogoRole } from '@/shared/types/brandAssets';
import type { IAssetsService } from '@/core/types/services';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { compressAsset, compressLogo } from '@/shared/utils/imageUpload';
import { stageAsset, stageLogoRef } from '@/shared/assets/assetOperations';

/** What the Library ended up holding for one supplied item. */
export interface StoredMaterial {
  /** The onboarding id, so the caller can match it back to what it sent. */
  itemId: string;
  /** The id the LIBRARY minted. The only id anything downstream may reference. */
  assetId: string;
  /** The durable url — a data url, never the transient preview. */
  url: string;
}

/**
 * The bytes of a supplied item, as something that survives the page.
 *
 * `_file` is the real thing and is preferred. When it is absent — a variant
 * generated from another upload, an item restored from somewhere — the object
 * URL is still fetchable *while this page is alive*, so it is read through and
 * converted. A url that is already durable (`data:`) is returned untouched.
 */
export async function durableUrl(item: OnboardingAsset): Promise<string | null> {
  const file = item._file;
  if (file) {
    if (item.kind === 'image') {
      return item.isLogo || item.logoSlot ? compressLogo(file) : compressAsset(file);
    }
    return readAsDataUrl(file);
  }

  const preview = item.previewUrl;
  if (!preview) return null;
  if (preview.startsWith('data:')) return preview;
  try {
    const blob = await (await fetch(preview)).blob();
    return readAsDataUrl(blob);
  } catch {
    return null;
  }
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('unreadable'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Puts one supplied item in the Library and answers with the id it was given.
 *
 * Never throws: one file that cannot be read costs that file, not the session.
 * The caller is told which item failed so it can say so on the row rather than
 * reporting a success it did not have.
 */
export async function storeMaterial(
  assets: IAssetsService,
  brand: Brand,
  item: OnboardingAsset,
  onError?: (id: string, reason: string) => void,
): Promise<StoredMaterial | null> {
  try {
    const url = await durableUrl(item);
    if (!url) {
      onError?.(item.id, "Couldn't read this one. Everything else is fine.");
      return null;
    }

    const isLogo = Boolean(item.isLogo || item.logoSlot);
    // `stageAsset` is used for its IDENTITY derivation only — content-hash id,
    // version, name — exactly as `useAssetUpload` uses it. Its `brandAssets[]`
    // output is discarded: that array is a read-only projection of the Library.
    const { asset } = stageAsset(brand, {
      url,
      kind: isLogo ? 'logo' : item.kind === 'image' ? 'image' : 'document',
      name: item.name,
      width: 0,
      height: 0,
      originalName: item.name,
      file: { size: item._file?.size ?? 0, mime: item._file?.type },
    });

    const payload = {
      name: asset.name,
      type: (isLogo ? 'logo' : item.kind === 'image' ? 'image' : 'document') as Asset['type'],
      category: (isLogo ? 'logo' : 'photo') as Asset['category'],
      source: 'upload' as const,
      url,
      size: item._file?.size ?? 0,
      tags: [],
      metadata: {
        originalName: item.name,
        // Identity of the MATERIAL. Without it the round trip loses what
        // `stageAsset` de-duplicates on, and the same bytes make a second item.
        contentHash: asset.metadata?.contentHash ?? item.contentHash,
        version: asset.metadata?.version,
      },
      origin: 'uploaded' as const,
    };

    // The same bytes may already be here — this runs again every time the review
    // reconciles. An existing LIVE row is updated; a tombstone is left alone and
    // a fresh id minted, because re-uploading what you deleted is a new item.
    const staged = asset.id;
    const matches = (
      await assets.listLibrary(brand.id, { includeArchived: true, includeDeleted: true })
    ).filter((a) => a.id === staged || a.legacyRefId === staged);
    const existing = matches.find((a) => a.deletedAt == null) ?? matches[0];
    const isTombstone = Boolean(existing?.deletedAt);

    // CRITICAL: use the id the LIBRARY returns, never the staged one. Supabase
    // mints its own uuid, so a logoSystem ref pointing at `staged` would resolve
    // to nothing in production while working perfectly against localStorage.
    const created =
      existing && !isTombstone
        ? await assets.update(existing.id, payload)
        : await assets.create({
            brandId: brand.id,
            ...(isTombstone ? {} : { id: staged }),
            legacyRefId: staged,
            ...payload,
          } as never);

    return { itemId: item.id, assetId: created.id, url };
  } catch {
    onError?.(item.id, "Couldn't store this one. Everything else is fine.");
    return null;
  }
}

/**
 * Onboarding's slot vocabulary → the canonical logo roles.
 *
 * The two lists are not the same list and were never meant to be. Onboarding
 * names a logo the way its owner would ("the one for dark backgrounds"); the
 * brand model names the artwork ("the white monochrome"). They describe the same
 * file from opposite sides, which is why the mapping reads oddly and is right:
 *
 *   dark      the logo you place ON a dark ground, which is the LIGHT artwork
 *   mark      a symbol on its own, which the model calls the iconmark
 *   vertical  name under symbol, which the model calls stacked
 *
 * `custom:<name>` has no canonical role by definition — the user invented it.
 * Those files are still stored in the Library as logos; they simply do not claim
 * a slot, because inventing one would put a variant nobody asked for into every
 * downstream renderer.
 */
export const SLOT_TO_ROLE: Record<string, LogoRole | undefined> = {
  primary: 'primary',
  wordmark: 'wordmark',
  mark: 'iconmark',
  dark: 'mono.white',
  light: 'mono.black',
  horizontal: 'horizontal',
  vertical: 'stacked',
};

export function roleForSlot(slot: string | undefined): LogoRole | undefined {
  if (!slot) return undefined;
  return SLOT_TO_ROLE[slot];
}

/**
 * The brand patch that points the logo system at what the Library now holds.
 *
 * Built as ONE patch rather than a write per slot: `stageLogoRef` reads the
 * brand it is handed, so a write per slot against a stale copy would keep only
 * the last one. Threading the accumulating patch through is what makes six
 * placements arrive as six placements.
 *
 * Only refs are written. No url is copied onto the brand record — that is what
 * `logoSystem` exists to avoid, and the readers resolve a ref through the
 * Library projection (`resolveBrandLogo`).
 */
export function logoSystemPatch(
  brand: Brand,
  placements: ReadonlyArray<{ role: LogoRole; assetId: string }>,
): Partial<Brand> {
  let patch: Partial<Brand> = {};
  for (const { role, assetId } of placements) {
    const next = stageLogoRef({ ...brand, ...patch } as Brand, role, assetId);
    patch = { ...patch, ...next };
  }
  return patch;
}
