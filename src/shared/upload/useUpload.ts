/**
 * useUpload — single hook every feature uses to upload an image.
 *
 * Wraps `imageUpload.ts` (compression + validation), shows toasts, and
 * optionally persists the result to the active brand's `assets` array.
 *
 * Returns:
 *   - `upload(file, opts?)` — async, returns UploadResult or null on error
 *   - `uploadMany(files, opts?)` — async, returns UploadResult[]
 *   - `uploading` — boolean
 *
 * For raw drag-and-drop, pair with `useDropZone({ onFiles: (files) => uploadMany(files) })`.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { compressLogo, compressAsset, compressImage, validateUploadFile } from '@/shared/utils/imageUpload';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Asset } from '@/shared/types/brand';
import type { UploadOptions, UploadResult } from './types';

const DEFAULT_ACCEPT = ['image/'];

function makeAssetId(): string {
  return `asset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function compressByKind(file: File, kind: UploadOptions['kind']): Promise<string> {
  if (kind === 'logo') return compressLogo(file);
  if (kind === 'asset') return compressAsset(file);
  return compressImage(file);
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const updateBrand = useBrandStore((s) => s.update);
  const currentBrand = useBrandStore((s) => s.current);

  const upload = useCallback(async (file: File, opts: UploadOptions = {}): Promise<UploadResult | null> => {
    const kind = opts.kind ?? 'image';
    const validation = validateUploadFile(file, {
      maxSizeMB: opts.maxSizeMB ?? 5,
      acceptedTypes: opts.acceptedTypes ?? DEFAULT_ACCEPT,
    });
    if (!validation.valid) {
      toast.error(validation.error ?? 'Invalid file');
      return null;
    }

    setUploading(true);
    try {
      const dataUrl = await compressByKind(file, kind);
      const { width, height } = await getImageDimensions(dataUrl);

      const result: UploadResult = {
        url: dataUrl,
        kind,
        name: file.name,
        size: file.size,
        width,
        height,
      };

      if (opts.persistAsAsset && currentBrand) {
        const newAsset: Asset = {
          id: makeAssetId(),
          name: file.name,
          type: kind === 'logo' ? 'logo' : 'image',
          category: opts.assetCategory ?? (kind === 'logo' ? 'logo' : 'photo'),
          source: 'upload',
          url: dataUrl,
          size: file.size,
          tags: [],
          metadata: {
            dimensions: { width, height },
            format: file.type,
            originalName: file.name,
          },
          createdAt: new Date(),
        };
        const nextAssets = [...(currentBrand.assets ?? []), newAsset];
        await updateBrand(currentBrand.id, { assets: nextAssets });
        result.id = newAsset.id;
      }

      return result;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  }, [currentBrand, updateBrand]);

  const uploadMany = useCallback(async (files: File[], opts: UploadOptions = {}): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    for (const file of files) {
      const r = await upload(file, opts);
      if (r) results.push(r);
    }
    return results;
  }, [upload]);

  return { upload, uploadMany, uploading };
}
