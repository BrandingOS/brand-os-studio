/**
 * useAssetUpload — the unified upload hook for the v3 brand asset
 * system. Every logo/image upload in the app should go through this.
 *
 * Flow:
 *   1. Validate (type + size) via existing `validateUploadFile`
 *   2. Compress per kind (logo/asset/image) → data URL
 *   3. Stage the brand patch via `stageAsset` / `stageLogoAssignment`
 *   4. Write via `useBrandStore.update(brandId, patch)` — atomic
 *
 * Returns the resolved `BrandAsset` so callers can show a preview
 * immediately.
 *
 * This supersedes the older `useUpload` hook for brand-attached
 * uploads. `useUpload` keeps working for transient tool uploads that
 * don't attach to a brand (e.g. Logo-to-SVG input).
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  compressAsset,
  compressImage,
  compressLogo,
  validateUploadFile,
} from '@/shared/utils/imageUpload';
import { useBrandStore } from '@/shared/store/brandStore';
import type { BrandAsset, BrandAssetKind, LogoRole } from '@/shared/types/brandAssets';
import { useService } from '@/core';
import { SERVICE_KEYS, type IAssetsService } from '@/core/types/services';
import {
  stageAsset,
  stageAssetDeletion,
  stageLogoRef,
  stageLogoRemoval,
} from './assetOperations';

export interface AssetUploadOptions {
  /** Asset type — controls compression profile. */
  kind?: BrandAssetKind;
  /** If present, attaches the asset to a LogoSystem slot atomically. */
  role?: LogoRole;
  /** Optional description written onto the LogoRef. */
  description?: string;
  /** Optional usage note written onto the LogoRef. */
  usage?: string;
  /** Replace this asset (bumps version) instead of creating a new one. */
  replaceAssetId?: string;
  /** Max file size in MB (default 10). */
  maxSizeMB?: number;
  /** Accepted type prefixes (default: image/*). */
  acceptedTypes?: string[];
  /** Free-form tags. */
  tags?: string[];
  /** Suppress the success toast. */
  silent?: boolean;
}

async function compressByKind(file: File, kind: BrandAssetKind): Promise<string> {
  if (kind === 'logo') return compressLogo(file);
  if (kind === 'document') {
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  if (kind === 'image') return compressAsset(file);
  return compressImage(file);
}

function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (!url.startsWith('data:image/') && !/\.(png|jpg|jpeg|webp|svg)(\?|$)/i.test(url)) {
      resolve({ width: 0, height: 0 });
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

export function useAssetUpload(brandId: string | undefined) {
  const [uploading, setUploading] = useState(false);
  const updateBrand = useBrandStore((s) => s.update);
  const reproject = useBrandStore((s) => s.reprojectLibrary);
  const assets = useService<IAssetsService>(SERVICE_KEYS.ASSETS);
  const getBrand = useCallback(
    () => useBrandStore.getState().list.find((b) => b.id === brandId) ?? useBrandStore.getState().current,
    [brandId],
  );

  const upload = useCallback(
    async (file: File, opts: AssetUploadOptions = {}): Promise<BrandAsset | null> => {
      if (!brandId) {
        toast.error('No active brand — cannot save upload');
        return null;
      }
      const kind = opts.kind ?? (opts.role ? 'logo' : 'image');
      const validation = validateUploadFile(file, {
        maxSizeMB: opts.maxSizeMB ?? 10,
        acceptedTypes: opts.acceptedTypes ?? ['image/'],
      });
      if (!validation.valid) {
        toast.error(validation.error ?? 'Invalid file');
        return null;
      }

      setUploading(true);
      try {
        const dataUrl = await compressByKind(file, kind);
        const { width, height } = await getImageDimensions(dataUrl);

        const brand = getBrand();
        if (!brand || brand.id !== brandId) {
          toast.error('Brand not found — reload and try again');
          return null;
        }

        // The upload lands in the BRAND LIBRARY — the one authoritative asset
        // store. `stageAsset` is still used, but only to SHAPE the record and
        // keep its id derivation (content-hash dedupe, replace semantics)
        // identical to before; its `brandAssets[]` output is discarded, because
        // that array is now a read-only projection of the Library.
        const { asset } = stageAsset(brand, {
          url: dataUrl,
          kind: opts.role ? 'logo' : kind,
          name: file.name,
          width,
          height,
          originalName: file.name,
          tags: opts.tags,
          replaceAssetId: opts.replaceAssetId,
          file: { size: file.size, mime: file.type },
        });

        // CRITICAL: use the id the LIBRARY returns, never the staged one.
        // `stageAsset` mints `asset-<contentHash>`, which is not a uuid, so
        // SupabaseAssetsService cannot honour it and the database generates its
        // own. Pointing logoSystem at the staged id would leave every
        // authenticated upload referencing an asset that does not exist —
        // logos silently stop resolving in production while working locally.
        // The staged id is preserved as `legacyRefId` so content-hash identity
        // (dedupe, replace) survives.
        const created = await assets.create({
          brandId,
          id: asset.id,
          legacyRefId: asset.id,
          name: asset.name,
          type: opts.role ? 'logo' : kind === 'logo' ? 'logo' : 'image',
          category: opts.role ? 'logo' : 'photo',
          source: 'upload',
          url: dataUrl,
          size: file.size,
          tags: asset.tags ?? [],
          metadata: {
            dimensions: { width, height },
            format: file.type,
            originalName: file.name,
          },
          origin: 'uploaded',
        });

        // Everything downstream must speak the Library's id.
        const stored: BrandAsset = { ...asset, id: created.id };

        if (opts.role) {
          // Only the logoSystem REF is written to the brand — the asset itself
          // lives in the Library, and the projection makes it resolvable to the
          // synchronous readers on the next store hydration.
          const patch = stageLogoRef(brand, opts.role, created.id, {
            description: opts.description,
            usage: opts.usage,
          });
          await updateBrand(brandId, patch);
          if (!opts.silent) toast.success('Logo saved');
          return stored;
        }

        // Non-logo assets need no brand write at all now: re-project so the
        // new item is visible through the legacy readers immediately.
        await reproject(brandId);
        if (!opts.silent) toast.success('Asset saved');
        return stored;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
        return null;
      } finally {
        setUploading(false);
      }
    },
    [brandId, getBrand, updateBrand, assets, reproject],
  );

  const uploadMany = useCallback(
    async (files: File[], opts: AssetUploadOptions = {}): Promise<BrandAsset[]> => {
      const out: BrandAsset[] = [];
      for (const f of files) {
        const a = await upload(f, { ...opts, silent: true });
        if (a) out.push(a);
      }
      if (out.length > 0 && !opts.silent) {
        toast.success(`${out.length} asset${out.length === 1 ? '' : 's'} uploaded`);
      }
      return out;
    },
    [upload],
  );

  const removeRole = useCallback(
    async (role: LogoRole) => {
      if (!brandId) return;
      const brand = getBrand();
      if (!brand || brand.id !== brandId) return;
      await updateBrand(brandId, stageLogoRemoval(brand, role));
    },
    [brandId, getBrand, updateBrand],
  );

  const removeAsset = useCallback(
    async (assetId: string) => {
      if (!brandId) return;
      const brand = getBrand();
      if (!brand || brand.id !== brandId) return;
      await updateBrand(brandId, stageAssetDeletion(brand, assetId));
    },
    [brandId, getBrand, updateBrand],
  );

  return { upload, uploadMany, removeRole, removeAsset, uploading };
}
