import type { Asset } from '@/shared/types/brand';
import type { IAssetsService, CreateAssetInput } from '@/core/types/services';

/**
 * LocalAssetsService — guest/dev implementation of the DAM asset library
 * (`IAssetsService`), backed by localStorage. The authenticated counterpart is
 * `SupabaseAssetsService` (→ `public.assets`). This makes the DAM library durable
 * per-brand for guests and gives the container a registration in guest mode so
 * `DamPage` can `useService(ASSETS)` in both modes.
 *
 * Storage layout: one array per brand under `brandos:assets:{brandId}`. Ids are
 * minted here and stable for the lifetime of the record.
 */
const key = (brandId: string) => `brandos:assets:${brandId}`;
const BUCKET_PREFIX = 'brandos:assets:';

export class LocalAssetsService implements IAssetsService {
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

  async listForBrand(brandId: string): Promise<Asset[]> {
    return this.read(brandId).sort(
      (a, b) =>
        new Date(b.createdAt as unknown as string).getTime() -
        new Date(a.createdAt as unknown as string).getTime(),
    );
  }

  async getById(id: string): Promise<Asset | null> {
    const hit = this.locate(id);
    return hit ? hit.assets[hit.index] : null;
  }

  async create(input: CreateAssetInput): Promise<Asset> {
    const asset: Asset = {
      id: crypto.randomUUID(),
      name: input.name,
      type: input.type,
      category: input.category,
      source: input.source || 'upload',
      url: input.url,
      size: input.size || 0,
      tags: input.tags || [],
      metadata: input.metadata || {},
      createdAt: new Date(),
    };
    const assets = this.read(input.brandId);
    assets.push(asset);
    this.write(input.brandId, assets);
    return asset;
  }

  async update(id: string, patch: Partial<CreateAssetInput>): Promise<Asset> {
    const hit = this.locate(id);
    if (!hit) throw new Error(`LocalAssetsService.update: asset not found: ${id}`);
    const current = hit.assets[hit.index];
    const updated: Asset = {
      ...current,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.source !== undefined ? { source: patch.source } : {}),
      ...(patch.url !== undefined ? { url: patch.url } : {}),
      ...(patch.size !== undefined ? { size: patch.size } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
    };
    hit.assets[hit.index] = updated;
    this.write(hit.brandId, hit.assets);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const hit = this.locate(id);
    if (!hit) return;
    hit.assets.splice(hit.index, 1);
    this.write(hit.brandId, hit.assets);
  }
}
