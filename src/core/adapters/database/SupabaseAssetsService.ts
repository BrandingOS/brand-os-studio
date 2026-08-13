import { supabase } from '@/integrations/supabase/client';
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
import { reconcileFlags } from './libraryQuery';

/**
 * SupabaseAssetsService — the authenticated BRAND LIBRARY (`public.assets` +
 * `public.brand_folders`, migration 017).
 *
 * Tenancy is enforced by RLS (`is_brand_member`), which is why id-only lookups
 * do not re-filter by brand: the house assumption, stated so it reads as a
 * decision rather than an omission.
 *
 * Generated Supabase types predate 017, so writes go through an untyped payload
 * bag and reads through an `any` mapper — the same workaround
 * `SupabaseDesignStorage` and `brands.supabase` already use. Missing-column
 * errors degrade instead of failing the operation, so the app keeps working in
 * an environment where 017 has not been deployed yet.
 */
export interface SupabaseAssetsServiceDeps {
  adoptions?: IKitAdoptionService;
  /** Emits Brand Context signals for favourite/dislike/reference. */
  context?: IBrandContextService;
}

/** 017 columns. Absent until the migration deploys — see `isMissingColumn`. */
const LIBRARY_COLUMNS = [
  'origin',
  'folder_id',
  'is_favorite',
  'is_disliked',
  'archived_at',
  'use_as_reference',
  'provenance',
  'deleted_at',
  'legacy_ref_id',
] as const;

function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42703' || /column .* does not exist/i.test(error.message ?? '');
}

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205';
}

// The generated Supabase types predate migration 017, so any statement that
// names a 017 column fails to type-check against them (and the long filter
// chains in listLibrary blow the instantiation-depth limit). Same workaround
// `SupabaseDesignStorage` uses for `designs`: an untyped accessor for the
// statements that touch new columns, while legacy paths keep the typed client.
// Remove both once `src/integrations/supabase/types.ts` is regenerated.
const foldersTable = () => (supabase as any).from('brand_folders');
const assetsTable = () => (supabase as any).from('assets');

export class SupabaseAssetsService implements IAssetsService {
  constructor(private readonly deps: SupabaseAssetsServiceDeps = {}) {}

  async listForBrand(brandId: string): Promise<Asset[]> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    // Tombstones are lineage records, not content — never listed.
    return (data ?? []).map(mapAsset).filter((a) => a.deletedAt == null);
  }

  async getById(id: string): Promise<Asset | null> {
    // Resolves tombstones too: saved work holding a reference to deleted
    // material must still resolve to something with a name and an origin.
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapAsset(data) : null;
  }

  async create(input: CreateAssetInput): Promise<Asset> {
    const { data: { user } } = await supabase.auth.getUser();

    const base: Record<string, unknown> = {
      brand_id: input.brandId,
      name: input.name,
      type: input.type,
      category: input.category,
      source: input.source || 'upload',
      url: input.url,
      storage_path: input.storagePath,
      size: input.size || 0,
      tags: input.tags || [],
      metadata: input.metadata || {},
      uploaded_by: user?.id,
    };
    // `assets.id` is a uuid column; a legacy app-generated id like
    // "asset_1786308941230" cannot be stored there. Honour the requested id
    // only when it is already a uuid, otherwise let the DB mint one and let
    // `legacy_ref_id` carry the old identity.
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (input.id && UUID.test(input.id)) base.id = input.id;

    const withLibrary: Record<string, unknown> = {
      ...base,
      origin: input.origin ?? 'uploaded',
      folder_id: input.folderId ?? null,
      use_as_reference: input.useAsReference ?? false,
      ...(input.provenance ? { provenance: input.provenance } : {}),
      ...(input.legacyRefId ? { legacy_ref_id: input.legacyRefId } : {}),
    };

    const { data, error } = await assetsTable().insert(withLibrary).select().single();
    if (error) {
      // Pre-017 environment: save the asset without its Library fields rather
      // than losing the upload entirely.
      if (isMissingColumn(error)) {
        const retry = await assetsTable().insert(base).select().single();
        if (retry.error) throw retry.error;
        return mapAsset(retry.data);
      }
      throw error;
    }
    return mapAsset(data);
  }

  async update(id: string, patch: Partial<CreateAssetInput>): Promise<Asset> {
    const updateData: Record<string, unknown> = {};
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.type !== undefined) updateData.type = patch.type;
    if (patch.category !== undefined) updateData.category = patch.category;
    if (patch.source !== undefined) updateData.source = patch.source;
    if (patch.url !== undefined) updateData.url = patch.url;
    if (patch.storagePath !== undefined) updateData.storage_path = patch.storagePath;
    if (patch.size !== undefined) updateData.size = patch.size;
    if (patch.tags !== undefined) updateData.tags = patch.tags;
    if (patch.metadata !== undefined) updateData.metadata = patch.metadata;
    if (patch.origin !== undefined) updateData.origin = patch.origin;
    if (patch.folderId !== undefined) updateData.folder_id = patch.folderId;
    if (patch.useAsReference !== undefined) updateData.use_as_reference = patch.useAsReference;
    if (patch.provenance !== undefined) updateData.provenance = patch.provenance;

    return this.patchRow(id, updateData);
  }

  /**
   * Shared write path so every Library mutation gets the same tolerance.
   *
   * `requireLibraryColumns` is for mutations whose WHOLE MEANING lives in a 017
   * column — tombstoning and archiving. For those, degrading is not graceful:
   * it returns an unchanged row that looks like a success. They opt out of the
   * tolerance and get a real error instead.
   */
  private async patchRow(
    id: string,
    updateData: Record<string, unknown>,
    opts: { requireLibraryColumns?: boolean } = {},
  ): Promise<Asset> {
    const { data, error } = await assetsTable()
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (isMissingColumn(error)) {
        if (opts.requireLibraryColumns) {
          throw new Error(
            `[SupabaseAssetsService] Cannot record this change: migration 017 is not ` +
              `deployed, so the required column is missing (${error.message}). Refusing ` +
              'to report success for a write that did not happen.',
          );
        }
        const safe = { ...updateData };
        for (const c of LIBRARY_COLUMNS) delete safe[c];
        if (!Object.keys(safe).length) {
          // Nothing left to write in a pre-017 environment — return current state.
          const current = await this.getById(id);
          if (current) return current;
        }
        const retry = await supabase.from('assets').update(safe).eq('id', id).select().single();
        if (retry.error) throw retry.error;
        return mapAsset(retry.data);
      }
      throw error;
    }
    return mapAsset(data);
  }

  /** @deprecated Hard-deletes the row, losing lineage. Prefer `softDelete`. */
  async delete(id: string): Promise<void> {
    const { data: asset } = await supabase
      .from('assets')
      .select('storage_path')
      .eq('id', id)
      .maybeSingle();

    if (asset?.storage_path) {
      await supabase.storage.from('brand-assets').remove([asset.storage_path]);
    }

    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Library surface ─────────────────────────────────────────────────

  async listLibrary(brandId: string, q: LibraryQuery = {}): Promise<Asset[]> {
    // Mirrors `matchesLibraryQuery` — see libraryQuery.ts for the mapping.
    let query = assetsTable()
      .select('*')
      .eq('brand_id', brandId);

    if (!q.includeDeleted) query = query.is('deleted_at', null);
    if (!q.includeArchived) query = query.is('archived_at', null);
    if (q.folderId === null) query = query.is('folder_id', null);
    else if (q.folderId !== undefined) query = query.eq('folder_id', q.folderId);
    if (q.origin?.length) query = query.in('origin', q.origin);
    if (q.favorite) query = query.eq('is_favorite', true);
    if (q.references) query = query.eq('use_as_reference', true);
    if (q.search) query = query.ilike('name', `%${q.search}%`);
    if (q.tags?.length) query = query.overlaps('tags', q.tags);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      // Pre-017: fall back to the plain listing so the DAM keeps working.
      if (isMissingColumn(error)) return this.listForBrand(brandId);
      throw error;
    }
    return (data ?? []).map(mapAsset);
  }

  async setFlags(id: string, flags: Partial<LibraryFlags>): Promise<Asset> {
    const current = await this.getById(id);
    if (!current) throw new Error(`SupabaseAssetsService.setFlags: asset not found: ${id}`);
    const next = reconcileFlags(current, flags);
    // The ENTIRE meaning of this write lives in 017 columns. Without
    // `requireLibraryColumns` the pre-017 tolerance would strip all three,
    // leave an empty patch, return the unchanged row — and the code below
    // would still record a Context signal, so the brand would hold an opinion
    // the Library never stored, while the caller saw a successful write.
    const saved = await this.patchRow(
      id,
      {
        is_favorite: next.isFavorite,
        is_disliked: next.isDisliked,
        use_as_reference: next.useAsReference,
      },
      { requireLibraryColumns: true },
    );
    // Only transitions — setting a flag that was already set is not a new
    // opinion. Fire-and-forget: capture must never interrupt.
    if (this.deps.context) {
      const brandId = (await this.brandIdOf(id)) ?? '';
      // Both directions, matching LocalAssetsService: a removal has to be
      // expressible or the summary can never drop the target.
      const emit = (kind: 'favorite' | 'dislike' | 'reference', on: boolean) =>
        this.deps.context!.record({
          brandId, kind, targetKind: 'library_item', targetRef: id, source: 'user-action',
          value: { on },
        });
      try {
        if (next.isFavorite !== Boolean(current.isFavorite)) {
          await emit('favorite', next.isFavorite);
        }
        if (next.isDisliked !== Boolean(current.isDisliked)) {
          await emit('dislike', next.isDisliked);
        }
        if (next.useAsReference !== Boolean(current.useAsReference)) {
          await emit('reference', next.useAsReference);
        }
      } catch { /* silent by contract */ }
    }
    return saved;
  }

  private async brandIdOf(id: string): Promise<string | null> {
    const { data } = await supabase.from('assets').select('brand_id').eq('id', id).maybeSingle();
    return (data as { brand_id?: string } | null)?.brand_id ?? null;
  }

  async moveToFolder(id: string, folderId: string | null): Promise<Asset> {
    return this.patchRow(id, { folder_id: folderId });
  }

  async archive(id: string): Promise<Asset> {
    return this.patchRow(id, { archived_at: new Date().toISOString() }, {
      requireLibraryColumns: true,
    });
  }

  async unarchive(id: string): Promise<Asset> {
    return this.patchRow(id, { archived_at: null }, { requireLibraryColumns: true });
  }

  /**
   * Tombstones the item. The row survives with its identity so lineage never
   * dangles; the stored object and url go, because the material itself is gone.
   */
  async softDelete(id: string): Promise<DeleteOutcome> {
    const current = await this.getById(id);
    if (!current) throw new Error(`SupabaseAssetsService.softDelete: asset not found: ${id}`);

    if (this.deps.adoptions) {
      const { data: row } = await supabase
        .from('assets')
        .select('brand_id')
        .eq('id', id)
        .maybeSingle();
      const brandId = (row as { brand_id?: string } | null)?.brand_id;
      if (brandId && (await this.deps.adoptions.isAdopted(brandId, 'library_item', id))) {
        return { ok: false, reason: 'adopted', adoptedRefs: [id] };
      }
    }

    const placedIn = current.provenance?.relations?.placedInDesignIds ?? [];
    if (placedIn.length) return { ok: false, reason: 'referenced', workItemIds: placedIn };

    // Read the path BEFORE the tombstone clears it, but do not act on it yet.
    const { data: pathRow } = await supabase
      .from('assets')
      .select('storage_path')
      .eq('id', id)
      .maybeSingle();
    const storagePath = (pathRow as { storage_path?: string } | null)?.storage_path;

    // ORDER IS THE POINT. The tombstone is written first and is allowed to
    // throw: removing the stored object before knowing the row was marked
    // deleted is unrecoverable data loss reported as success — exactly what
    // happens pre-017, where the tolerance would strip `deleted_at` and leave
    // the item visible with its file already gone.
    await this.patchRow(
      id,
      {
        deleted_at: new Date().toISOString(),
        url: '',
        storage_path: null,
        is_favorite: false,
        is_disliked: false,
        use_as_reference: false,
        folder_id: null,
      },
      { requireLibraryColumns: true },
    );

    // Only now is the file safe to remove. A failure here leaves an orphaned
    // object, which is recoverable; the reverse is not.
    if (storagePath) {
      await supabase.storage.from('brand-assets').remove([storagePath]);
    }
    return { ok: true };
  }

  // ── Folders ─────────────────────────────────────────────────────────

  async listFolders(brandId: string): Promise<BrandFolder[]> {
    const { data, error } = await foldersTable()
      .select('*')
      .eq('brand_id', brandId)
      .order('name', { ascending: true });
    if (error) {
      if (isMissingTable(error)) return [];
      throw error;
    }
    return (data ?? []).map(mapFolder);
  }

  async createFolder(input: CreateFolderInput): Promise<BrandFolder> {
    const { data, error } = await foldersTable()
      .insert({ brand_id: input.brandId, name: input.name, parent_id: input.parentId ?? null })
      .select()
      .single();
    if (error) throw error;
    return mapFolder(data);
  }

  async renameFolder(id: string, name: string): Promise<BrandFolder> {
    const { data, error } = await foldersTable()
      .update({ name })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapFolder(data);
  }

  /**
   * Items fall back to unfiled via the FK's ON DELETE SET NULL — deleting a
   * folder never deletes material.
   */
  async deleteFolder(id: string): Promise<void> {
    const { error } = await foldersTable().delete().eq('id', id);
    if (error && !isMissingTable(error)) throw error;
  }
}

function mapAsset(data: any): Asset {
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    category: data.category,
    source: data.source || 'upload',
    url: data.url,
    size: data.size || 0,
    tags: data.tags || [],
    metadata: data.metadata || {},
    createdAt: new Date(data.created_at),
    origin: data.origin ?? 'uploaded',
    folderId: data.folder_id ?? null,
    isFavorite: data.is_favorite ?? false,
    isDisliked: data.is_disliked ?? false,
    useAsReference: data.use_as_reference ?? false,
    archivedAt: data.archived_at ? new Date(data.archived_at) : null,
    deletedAt: data.deleted_at ? new Date(data.deleted_at) : null,
    ...(data.provenance ? { provenance: data.provenance } : {}),
    ...(data.legacy_ref_id ? { legacyRefId: data.legacy_ref_id } : {}),
  };
}

function mapFolder(data: any): BrandFolder {
  return {
    id: data.id,
    brandId: data.brand_id,
    name: data.name,
    parentId: data.parent_id ?? null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}
