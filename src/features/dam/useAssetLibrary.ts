/**
 * useAssetLibrary — the brand asset library's data + mutation layer.
 *
 * Extracted from DamPage so the two Folders surfaces (Classic
 * `/a/:slug/folders`, Studio `/b/:slug/folders`) share ONE implementation of
 * upload, delete, rename, tagging, recategorising and the legacy migration.
 * Nothing here renders — the two surfaces differ in presentation only, and
 * that difference must never become a second copy of the write path.
 *
 * Storage: uploads go to Supabase storage and fall back to a data URL; the
 * record itself is always written through the ASSETS service
 * (SupabaseAssetsService → public.assets when authed, LocalAssetsService →
 * localStorage for guests). Do NOT write to `brand.assets` — SupabaseBrandsService
 * silently drops it, which is how an authenticated user's library used to
 * disappear on reload.
 */
import * as React from 'react';
import { toast } from 'sonner';
import { useService, SERVICE_KEYS } from '@/core';
import type { IAssetsService } from '@/core/types/services';
import { storageService } from '@/shared/services/storage.supabase';
import { activityService } from '@/shared/services/activityService';
import type { Asset, Brand } from '@/shared/types/brand';
import { detectAssetType, detectCategory } from './utils';

function getImageDimensions(url: string): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    if (url.startsWith('data:') && !url.startsWith('data:image')) {
      resolve(undefined);
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(undefined);
    img.src = url;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

/**
 * Put a file where the brand can reach it: Supabase storage, falling back to
 * a data URL when storage is unavailable (guests, dev bypass, an offline
 * bucket). Exported because the Kit's upload-into-a-slot needs exactly this
 * rule and a second copy would drift from it.
 */
export async function putBrandFile(
  brandId: string,
  file: File,
): Promise<{ url: string; storagePath?: string }> {
  try {
    const path = `${crypto.randomUUID()}-${file.name}`;
    const result = await storageService.uploadAsset(brandId, file, path);
    return { url: result.url, storagePath: path };
  } catch {
    return { url: await fileToDataUrl(file) };
  }
}

export interface AssetLibrary {
  assets: Asset[];
  /** True until the first list() settles — drives the skeleton grid. */
  loading: boolean;
  uploading: boolean;
  /** Files uploaded so far in the current batch, and the batch size. */
  progress: { done: number; total: number } | null;
  upload: (files: File[]) => Promise<void>;
  remove: (assetId: string) => Promise<void>;
  removeMany: (assetIds: string[]) => Promise<void>;
  rename: (assetId: string, name: string) => Promise<void>;
  addTag: (assetId: string, tag: string) => Promise<void>;
  removeTag: (assetId: string, tag: string) => Promise<void>;
  setCategory: (assetId: string, category: Asset['category']) => Promise<void>;
  /** File the asset in the brand's shared folder tree. null = the root. */
  moveToFolder: (assetId: string, folderId: string | null) => Promise<void>;
  download: (asset: Asset) => void;
  downloadMany: (assets: Asset[]) => void;
  refresh: () => Promise<void>;
}

export function useAssetLibrary(brand: Brand | null | undefined): AssetLibrary {
  const assetsService = useService<IAssetsService>(SERVICE_KEYS.ASSETS);
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);

  const brandId = brand?.id;
  const legacyAssets = brand?.assets;

  const refresh = React.useCallback(async () => {
    if (!brandId) return;
    try {
      setAssets(await assetsService.listForBrand(brandId));
    } catch {
      setAssets([]);
    }
  }, [brandId, assetsService]);

  // Load + one-time continuity migration: pre-Batch-B guest libraries lived in
  // `brand.assets` (localStorage). If the ASSETS service is empty but the brand
  // still carries legacy assets, seed them once so nothing disappears. (Authed
  // brands carry `assets: []` — the migration is a no-op for them.)
  React.useEffect(() => {
    if (!brandId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        let list = await assetsService.listForBrand(brandId);
        if (list.length === 0 && (legacyAssets?.length ?? 0) > 0) {
          for (const a of legacyAssets!) {
            await assetsService.create({
              brandId,
              name: a.name,
              type: a.type,
              category: a.category,
              source: a.source,
              url: a.url,
              size: a.size,
              tags: a.tags,
              metadata: a.metadata,
            });
          }
          list = await assetsService.listForBrand(brandId);
        }
        if (!cancelled) setAssets(list);
      } catch {
        if (!cancelled) setAssets([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId, legacyAssets, assetsService]);

  const upload = React.useCallback(
    async (files: File[]) => {
      if (!brand || files.length === 0) return;
      setProgress({ done: 0, total: files.length });
      const created: Asset[] = [];

      try {
        for (const file of files) {
          const { url, storagePath } = await putBrandFile(brand.id, file);

          const dimensions = file.type.startsWith('image/')
            ? await getImageDimensions(url)
            : undefined;

          created.push(
            await assetsService.create({
              brandId: brand.id,
              name: file.name,
              type: detectAssetType(file),
              category: detectCategory(file.name, file.type),
              source: 'upload',
              url,
              storagePath,
              size: file.size,
              tags: [],
              metadata: { originalName: file.name, format: file.type, dimensions },
            }),
          );
          setProgress({ done: created.length, total: files.length });
        }
      } finally {
        await refresh();
        setProgress(null);
      }

      toast.success(`Uploaded ${created.length} asset${created.length === 1 ? '' : 's'}`);
      activityService.log({
        brandId: brand.id,
        brandName: brand.name,
        eventType: 'asset_uploaded',
        title: `Uploaded ${created.length} asset${created.length === 1 ? '' : 's'}`,
        description: created.map((a) => a.name).join(', '),
      });
    },
    [brand, assetsService, refresh],
  );

  const remove = React.useCallback(
    async (assetId: string) => {
      if (!brand) return;
      const asset = assets.find((a) => a.id === assetId);
      // The service cleans up its own Supabase storage (via stored storage_path).
      await assetsService.delete(assetId);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      toast.success('Asset deleted');
      activityService.log({
        brandId: brand.id,
        brandName: brand.name,
        eventType: 'asset_exported',
        title: `Deleted asset: ${asset?.name || 'Unknown'}`,
      });
    },
    [brand, assets, assetsService],
  );

  const removeMany = React.useCallback(
    async (assetIds: string[]) => {
      if (!brand || assetIds.length === 0) return;
      const ids = new Set(assetIds);
      await Promise.all(assetIds.map((id) => assetsService.delete(id)));
      setAssets((prev) => prev.filter((a) => !ids.has(a.id)));
      toast.success(`Deleted ${assetIds.length} asset${assetIds.length === 1 ? '' : 's'}`);
      activityService.log({
        brandId: brand.id,
        brandName: brand.name,
        eventType: 'asset_exported',
        title: `Bulk deleted ${assetIds.length} asset${assetIds.length === 1 ? '' : 's'}`,
      });
    },
    [brand, assetsService],
  );

  const rename = React.useCallback(
    async (assetId: string, name: string) => {
      await assetsService.update(assetId, { name });
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, name } : a)));
    },
    [assetsService],
  );

  const addTag = React.useCallback(
    async (assetId: string, tag: string) => {
      if (!tag.trim()) return;
      const asset = assets.find((a) => a.id === assetId);
      const tags = Array.from(new Set([...(asset?.tags ?? []), tag.trim()]));
      await assetsService.update(assetId, { tags });
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, tags } : a)));
    },
    [assets, assetsService],
  );

  const removeTag = React.useCallback(
    async (assetId: string, tag: string) => {
      const asset = assets.find((a) => a.id === assetId);
      const tags = (asset?.tags ?? []).filter((t) => t !== tag);
      await assetsService.update(assetId, { tags });
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, tags } : a)));
    },
    [assets, assetsService],
  );

  const setCategory = React.useCallback(
    async (assetId: string, category: Asset['category']) => {
      await assetsService.update(assetId, { category });
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, category } : a)));
    },
    [assetsService],
  );

  const moveToFolder = React.useCallback(
    async (assetId: string, folderId: string | null) => {
      // Optimistic: filing is instant and reversible, and waiting on a round
      // trip to watch a tile leave a folder makes the page feel remote.
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, folderId } : a)));
      try {
        await assetsService.moveToFolder(assetId, folderId);
      } catch {
        toast.error("Couldn't move that asset");
        await refresh();
      }
    },
    [assetsService, refresh],
  );

  const download = React.useCallback((asset: Asset) => {
    if (!asset.url) return;
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = asset.name;
    link.click();
  }, []);

  const downloadMany = React.useCallback(
    (list: Asset[]) => {
      // One request per asset — a ZIP would pull jszip into this chunk.
      for (const asset of list) download(asset);
      toast.success(`Downloading ${list.length} asset${list.length === 1 ? '' : 's'}`);
    },
    [download],
  );

  return {
    assets,
    loading,
    uploading: progress !== null,
    progress,
    upload,
    remove,
    removeMany,
    rename,
    addTag,
    removeTag,
    setCategory,
    moveToFolder,
    download,
    downloadMany,
    refresh,
  };
}
