import type { Asset, BrandFolder } from '@/shared/types/brand';
import type {
  IAssetsService,
  CreateAssetInput,
  CreateFolderInput,
  DeleteOutcome,
  LibraryFlags,
  LibraryQuery,
} from '@/core/types/services';
import type { IKitAdoptionService } from '@/core/services/IKitAdoptionService';
import type { IBrandContextService } from '@/core/services/IBrandContextService';
import {
  byNewestFirst,
  matchesLibraryQuery,
  reconcileFlags,
} from './libraryQuery';

/**
 * LocalAssetsService — guest/dev implementation of the BRAND LIBRARY
 * (`IAssetsService`), backed by localStorage. The authenticated counterpart is
 * `SupabaseAssetsService` (→ `public.assets` + `public.brand_folders`).
 *
 * This service is the Library, not a second store beside it: the legacy
 * `brand.assets[]` and `brand.brandAssets[]` arrays migrate in here, and every
 * upload path in the product converges on it.
 *
 * Storage layout: one array per brand under `brandos:assets:{brandId}`, plus
 * folders under `brandos:library-folders:{brandId}`. Ids are minted here and
 * stable for the lifetime of the record.
 */
const key = (brandId: string) => `brandos:assets:${brandId}`;
const folderKey = (brandId: string) => `brandos:library-folders:${brandId}`;
const BUCKET_PREFIX = 'brandos:assets:';
const FOLDER_PREFIX = 'brandos:library-folders:';

export interface LocalAssetsServiceDeps {
  /**
   * Consulted before a delete so an item the Official Kit has adopted is not
   * removed without telling the user. Optional: when absent, nothing blocks —
   * the tombstone still guarantees saved work never dangles.
   */
  adoptions?: IKitAdoptionService;
  /**
   * Emits Brand Context signals for actions the user already performs
   * (favourite, dislike, use-as-reference). Optional and fire-and-forget:
   * capture must never interrupt, and a missing service simply means no
   * learning — never a broken flag.
   */
  context?: IBrandContextService;
}

export class LocalAssetsService implements IAssetsService {
  constructor(private readonly deps: LocalAssetsServiceDeps = {}) {}

  private read(brandId: string): Asset[] {
    try {
      const raw = localStorage.getItem(key(brandId));
      return raw ? (JSON.parse(raw) as Asset[]) : [];
    } catch {
      return [];
    }
  }

  private write(brandId: string, assets: Asset[]): void {
    localStorage.setItem(key(brandId), JSON.stringify(assets));
  }

  private readFolders(brandId: string): BrandFolder[] {
    try {
      const raw = localStorage.getItem(folderKey(brandId));
      return raw ? (JSON.parse(raw) as BrandFolder[]) : [];
    } catch {
      return [];
    }
  }

  private writeFolders(brandId: string, folders: BrandFolder[]): void {
    localStorage.setItem(folderKey(brandId), JSON.stringify(folders));
  }

  /** Find the brand bucket that holds a given asset id (getById/update/delete
   *  take an id only). */
  private locate(id: string): { brandId: string; assets: Asset[]; index: number } | null {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(BUCKET_PREFIX)) continue;
      const brandId = k.slice(BUCKET_PREFIX.length);
      const assets = this.read(brandId);
      const index = assets.findIndex((a) => a.id === id);
      if (index >= 0) return { brandId, assets, index };
    }
    return null;
  }

  private locateFolder(id: string): { brandId: string; folders: BrandFolder[]; index: number } | null {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(FOLDER_PREFIX)) continue;
      const brandId = k.slice(FOLDER_PREFIX.length);
      const folders = this.readFolders(brandId);
      const index = folders.findIndex((f) => f.id === id);
      if (index >= 0) return { brandId, folders, index };
    }
    return null;
  }

  private save(hit: { brandId: string; assets: Asset[]; index: number }, next: Asset): Asset {
    hit.assets[hit.index] = next;
    this.write(hit.brandId, hit.assets);
    return next;
  }

  private mustLocate(id: string, op: string) {
    const hit = this.locate(id);
    if (!hit) throw new Error(`LocalAssetsService.${op}: asset not found: ${id}`);
    return hit;
  }

  // ── Existing surface ────────────────────────────────────────────────

  /**
   * Raw per-brand listing, tombstones excluded. Kept for the pre-Library
   * callers (the DAM page); `listLibrary` is the Library-aware entry point.
   */
  async listForBrand(brandId: string): Promise<Asset[]> {
    return this.read(brandId)
      .filter((a) => a.deletedAt == null)
      .sort(byNewestFirst);
  }

  /**
   * Resolves an id INCLUDING tombstones — that is the point of a tombstone.
   * Saved work holding a reference to deleted material must still resolve to
   * something with a name and an origin rather than to nothing.
   */
  async getById(id: string): Promise<Asset | null> {
    const hit = this.locate(id);
    return hit ? hit.assets[hit.index] : null;
  }

  async create(input: CreateAssetInput): Promise<Asset> {
    const asset: Asset = {
      // The ingest may supply the legacy id so logoSystem refs need no rewrite.
      id: input.id ?? crypto.randomUUID(),
      name: input.name,
      type: input.type,
      category: input.category,
      source: input.source || 'upload',
      url: input.url,
      size: input.size || 0,
      tags: input.tags || [],
      metadata: input.metadata || {},
      createdAt: new Date(),
      origin: input.origin ?? 'uploaded',
      folderId: input.folderId ?? null,
      isFavorite: false,
      isDisliked: false,
      useAsReference: input.useAsReference ?? false,
      archivedAt: null,
      deletedAt: null,
      ...(input.provenance ? { provenance: input.provenance } : {}),
      ...(input.legacyRefId ? { legacyRefId: input.legacyRefId } : {}),
    };
    const assets = this.read(input.brandId);
    assets.push(asset);
    this.write(input.brandId, assets);
    return asset;
  }

  async update(id: string, patch: Partial<CreateAssetInput>): Promise<Asset> {
    const hit = this.mustLocate(id, 'update');
    const current = hit.assets[hit.index];
    return this.save(hit, {
      ...current,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.source !== undefined ? { source: patch.source } : {}),
      ...(patch.url !== undefined ? { url: patch.url } : {}),
      ...(patch.size !== undefined ? { size: patch.size } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
      ...(patch.origin !== undefined ? { origin: patch.origin } : {}),
      ...(patch.folderId !== undefined ? { folderId: patch.folderId } : {}),
      ...(patch.useAsReference !== undefined ? { useAsReference: patch.useAsReference } : {}),
      ...(patch.provenance !== undefined ? { provenance: patch.provenance } : {}),
    });
  }

  /** @deprecated Hard-removes the row, losing lineage. Prefer `softDelete`. */
  async delete(id: string): Promise<void> {
    const hit = this.locate(id);
    if (!hit) return;
    hit.assets.splice(hit.index, 1);
    this.write(hit.brandId, hit.assets);
  }

  // ── Library surface ─────────────────────────────────────────────────

  async listLibrary(brandId: string, q: LibraryQuery = {}): Promise<Asset[]> {
    return this.read(brandId)
      .filter((a) => matchesLibraryQuery(a, q))
      .sort(byNewestFirst);
  }

  async listLibraryForBrands(brandIds: string[], q: LibraryQuery = {}): Promise<Map<string, Asset[]>> {
    const grouped = new Map<string, Asset[]>();
    for (const id of brandIds) {
      const items = await this.listLibrary(id, q);
      if (items.length) grouped.set(id, items);
    }
    return grouped;
  }

  async setFlags(id: string, flags: Partial<LibraryFlags>): Promise<Asset> {
    const hit = this.mustLocate(id, 'setFlags');
    const current = hit.assets[hit.index];
    const next = reconcileFlags(current, flags);
    const saved = this.save(hit, { ...current, ...next });
    void emitFlagSignals(this.deps.context, hit.brandId, id, current, next);
    return saved;
  }

  async moveToFolder(id: string, folderId: string | null): Promise<Asset> {
    const hit = this.mustLocate(id, 'moveToFolder');
    return this.save(hit, { ...hit.assets[hit.index], folderId });
  }

  async archive(id: string): Promise<Asset> {
    const hit = this.mustLocate(id, 'archive');
    return this.save(hit, { ...hit.assets[hit.index], archivedAt: new Date() });
  }

  async unarchive(id: string): Promise<Asset> {
    const hit = this.mustLocate(id, 'unarchive');
    return this.save(hit, { ...hit.assets[hit.index], archivedAt: null });
  }

  /**
   * Tombstones the item (FR-020). The row is retained with its identity, name
   * and origin so lineage never dangles; url/storagePath are cleared because
   * the material itself is gone.
   *
   * Blocked when the Official Kit has adopted the item — the user is told
   * first, and decides. Work references are checked from the item's own
   * recorded relations, which is O(1); scanning every saved document on every
   * delete would be a real cost for a check the tombstone already makes safe.
   */
  async softDelete(id: string): Promise<DeleteOutcome> {
    const hit = this.mustLocate(id, 'softDelete');
    const current = hit.assets[hit.index];

    if (this.deps.adoptions) {
      const adopted = await this.deps.adoptions.isAdopted(hit.brandId, 'library_item', id);
      if (adopted) return { ok: false, reason: 'adopted', adoptedRefs: [id] };
    }

    const placedIn = current.provenance?.relations?.placedInDesignIds ?? [];
    if (placedIn.length) return { ok: false, reason: 'referenced', workItemIds: placedIn };

    this.save(hit, {
      ...current,
      deletedAt: new Date(),
      url: '',
      isFavorite: false,
      isDisliked: false,
      useAsReference: false,
      folderId: null,
    });
    return { ok: true };
  }

  // ── Folders ─────────────────────────────────────────────────────────

  async listFolders(brandId: string): Promise<BrandFolder[]> {
    return this.readFolders(brandId).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createFolder(input: CreateFolderInput): Promise<BrandFolder> {
    const folders = this.readFolders(input.brandId);
    const parentId = input.parentId ?? null;
    // Mirrors the DB's unique (brand_id, parent_id, name) + the partial index
    // covering root folders, which plain UNIQUE misses because NULLs are
    // distinct in Postgres.
    if (folders.some((f) => (f.parentId ?? null) === parentId && f.name === input.name)) {
      throw new Error(`LocalAssetsService.createFolder: duplicate folder name "${input.name}"`);
    }
    const folder: BrandFolder = {
      id: crypto.randomUUID(),
      brandId: input.brandId,
      name: input.name,
      parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    folders.push(folder);
    this.writeFolders(input.brandId, folders);
    return folder;
  }

  async renameFolder(id: string, name: string): Promise<BrandFolder> {
    const hit = this.locateFolder(id);
    if (!hit) throw new Error(`LocalAssetsService.renameFolder: folder not found: ${id}`);
    const updated = { ...hit.folders[hit.index], name, updatedAt: new Date() };
    hit.folders[hit.index] = updated;
    this.writeFolders(hit.brandId, hit.folders);
    return updated;
  }

  /**
   * Items fall back to unfiled — deleting a folder never deletes material.
   *
   * Descendants go with it, matching the database, where `parent_id` is
   * `ON DELETE CASCADE`. Removing only the named folder would leave child
   * folders pointing at a parent that no longer exists — dangling locally and
   * divergent from the server for the same user action.
   */
  async deleteFolder(id: string): Promise<void> {
    const hit = this.locateFolder(id);
    if (!hit) return;

    // Collect the whole subtree before removing anything.
    const doomed = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const f of hit.folders) {
        if (f.parentId && doomed.has(f.parentId) && !doomed.has(f.id)) {
          doomed.add(f.id);
          grew = true;
        }
      }
    }

    this.writeFolders(
      hit.brandId,
      hit.folders.filter((f) => !doomed.has(f.id)),
    );

    const assets = this.read(hit.brandId);
    let touched = false;
    for (const a of assets) {
      if (a.folderId && doomed.has(a.folderId)) {
        a.folderId = null;
        touched = true;
      }
    }
    if (touched) this.write(hit.brandId, assets);
  }
}


/**
 * Records what the user just expressed. Only TRANSITIONS are recorded — setting
 * a flag that was already set is not a new opinion, and logging it would make
 * the signal stream a record of clicks rather than of preferences.
 *
 * BOTH DIRECTIONS count. Recording only false→true made removal unexpressible:
 * the summary takes the latest signal per target, so an un-favourited item
 * stayed in `likedRefs` forever, and an item dropped from references kept
 * feeding AI creation context — the user's correction had no way to reach the
 * thing it was correcting. The new state travels in `value.on`, which
 * `summarizeSignals` reads.
 */
async function emitFlagSignals(
  context: IBrandContextService | undefined,
  brandId: string,
  assetId: string,
  before: Pick<Asset, 'isFavorite' | 'isDisliked' | 'useAsReference'>,
  after: { isFavorite: boolean; isDisliked: boolean; useAsReference: boolean },
): Promise<void> {
  if (!context) return;
  const emit = (kind: 'favorite' | 'dislike' | 'reference', on: boolean) =>
    context.record({
      brandId,
      kind,
      targetKind: 'library_item',
      targetRef: assetId,
      source: 'user-action',
      value: { on },
    });

  try {
    if (after.isFavorite !== Boolean(before.isFavorite)) await emit('favorite', after.isFavorite);
    if (after.isDisliked !== Boolean(before.isDisliked)) await emit('dislike', after.isDisliked);
    if (after.useAsReference !== Boolean(before.useAsReference)) {
      await emit('reference', after.useAsReference);
    }
  } catch {
    // Silent by contract.
  }
}
