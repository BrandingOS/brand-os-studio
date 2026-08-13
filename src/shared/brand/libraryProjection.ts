/**
 * The Brand Library, projected into the shape ~34 existing readers expect.
 *
 * `useBrandLogo`, `brandToBrandKit`, the mockup resolvers, GuidelineBoard,
 * BrandPanel and Setup all resolve `logoSystem` refs by doing
 * `brand.brandAssets.find(a => a.id === ref.assetId)` — a SYNCHRONOUS lookup
 * on the brand object, inside render paths. The Library is an async service.
 * Migrating all of them at once would be a restructure of every render path
 * that touches a logo, so instead the Library is projected onto the brand when
 * the brand is hydrated, and the readers keep working untouched.
 *
 * THE PROJECTION IS READ-ONLY. It is derived from the Library and must never
 * become a second write path:
 *
 *  - It is computed at hydration, in the store, AFTER the service returns.
 *  - `brandStore.update` strips `brandAssets` from any patch, so a projected
 *    array can never be persisted back over the stored one.
 *  - Nothing here writes. This module is pure.
 *
 * The constitution permits exactly this: "Derived views… MAY exist anywhere,
 * but they are read-only projections and MUST be reconstructible from the
 * canonical record." The Library is the canonical record; this is the view.
 *
 * RETIREMENT CRITERION for the STORED `brand.brandAssets[]` array:
 * it survives only to feed assets that have not been ingested yet. Once every
 * brand reports zero un-ingested entries (the ingest report's `created` is 0
 * on a fresh run for all brands), the stored array can be dropped — the
 * projection alone serves the readers. The PROJECTION itself retires later,
 * when those readers are migrated to read the Library directly.
 */
import type { Asset, Brand } from '@/shared/types/brand';
import type { AssetFormat, BrandAsset, BrandAssetKind } from '@/shared/types/brandAssets';

function kindOf(a: Asset): BrandAssetKind {
  if (a.type === 'logo') return 'logo';
  if (a.type === 'font') return 'font';
  if (a.type === 'icon') return 'icon';
  if (a.type === 'document') return 'document';
  return 'image';
}

function formatOf(a: Asset): AssetFormat {
  const explicit = a.metadata?.format;
  if (explicit) {
    const f = explicit.toLowerCase();
    if (f.includes('svg')) return 'svg';
    if (f.includes('png')) return 'png';
    if (f.includes('webp')) return 'webp';
    if (f.includes('jpeg') || f.includes('jpg')) return 'jpg';
    if (f.includes('pdf')) return 'pdf';
  }
  const url = (a.url ?? '').toLowerCase();
  if (url.includes('.svg') || url.startsWith('data:image/svg')) return 'svg';
  if (url.includes('.webp')) return 'webp';
  if (url.includes('.jpg') || url.includes('.jpeg')) return 'jpg';
  if (url.includes('.pdf')) return 'pdf';
  return 'png';
}

/** One Library item → the BrandAsset shape the legacy readers index by id. */
export function assetToBrandAsset(a: Asset): BrandAsset {
  const createdAt =
    a.createdAt instanceof Date
      ? a.createdAt.toISOString()
      : String(a.createdAt ?? new Date().toISOString());

  return {
    // The Library id IS the id readers resolve refs against. Ingest preserves
    // legacy ids where it can, so existing refs keep hitting.
    id: a.id,
    kind: kindOf(a),
    name: a.name,
    formats: { [formatOf(a)]: { url: a.url, size: a.size ?? 0 } },
    tags: a.tags ?? [],
    metadata: {
      createdAt,
      // Carried through, not re-invented: `stageAsset` de-duplicates on the
      // content hash and bumps the version on each replacement, and after a
      // reload this projection is the only view it has of an existing asset.
      version: a.metadata?.version ?? 1,
      contentHash: a.metadata?.contentHash,
      width: a.metadata?.dimensions?.width,
      height: a.metadata?.dimensions?.height,
      originalName: a.metadata?.originalName,
    },
  };
}

/**
 * Returns a brand whose `brandAssets` is the Library projection, unioned with
 * any STORED entries the Library does not have yet.
 *
 * The union matters during convergence: a brand whose legacy array has not been
 * ingested must still render its logos. Library items win on id collision —
 * they are the authoritative copy.
 *
 * Tombstoned items are excluded; a deleted item should stop resolving in
 * renders even though `getById` still resolves it for lineage.
 */
export function projectLibraryOntoBrand(brand: Brand, library: Asset[]): Brand {
  const live = library.filter((a) => a.deletedAt == null && Boolean(a.url));
  const projected = live.map(assetToBrandAsset);

  // Identities the Library has DELETED. A stored entry carrying one of them is
  // a stale alias of deleted material: keeping it would leave a tombstoned
  // asset rendering forever through the legacy readers. Both identifiers count
  // — the item's own id and the legacy id it was ingested from.
  const deleted = new Set<string>();
  for (const a of library) {
    if (a.deletedAt == null) continue;
    deleted.add(a.id);
    if (a.legacyRefId) deleted.add(a.legacyRefId);
  }

  // Identities the Library has ABSORBED under a different id. Ingest preserves
  // the legacy id where it can, but when the store mints its own the item comes
  // back with a new `id` and the old one in `legacyRefId`. Keyed by id alone,
  // the stored entry would not collide with its own ingested copy, so readers
  // would see the same logo twice — and the two could carry different urls,
  // because only the Library copy stays current. `unIngestedCount` already
  // counts such an entry as ingested, so the retirement gauge would read zero
  // while the projection still held the alias.
  const ingestedFrom = new Set<string>();
  for (const a of live) {
    if (a.legacyRefId) ingestedFrom.add(a.legacyRefId);
  }

  const byId = new Map<string, BrandAsset>();
  // Stored entries first, so a Library item with the same id overwrites it.
  for (const a of brand.brandAssets ?? []) {
    if (deleted.has(a.id)) continue;
    if (ingestedFrom.has(a.id)) continue; // superseded by its Library copy
    byId.set(a.id, a);
  }
  for (const a of projected) byId.set(a.id, a);

  return { ...brand, brandAssets: [...byId.values()] };
}

/** How many stored entries the Library has not absorbed — the retirement gauge. */
export function unIngestedCount(brand: Brand, library: Asset[]): number {
  const known = new Set<string>();
  for (const a of library) {
    known.add(a.id);
    if (a.legacyRefId) known.add(a.legacyRefId);
  }
  return (brand.brandAssets ?? []).filter((a) => !known.has(a.id)).length;
}
