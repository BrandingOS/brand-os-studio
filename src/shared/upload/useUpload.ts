/**
 * useUpload — single hook every feature uses to upload an image.
 *
 * Wraps `imageUpload.ts` (compression + validation), shows toasts, and
 * optionally persists the result to the BRAND LIBRARY.
 *
 * It used to append to the brand record's inline `assets[]` array, which is
 * why an upload made here never appeared in the Folders page — that surface
 * reads the assets service. Both now write the same Library, so an upload
 * lands in one place no matter which surface started it.
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
import { useService } from '@/core';
import { SERVICE_KEYS, type IAssetsService } from '@/core/types/services';
import type { UploadOptions, UploadResult } from './types';

const DEFAULT_ACCEPT = ['image/'];

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
  const currentBrand = useBrandStore((s) => s.current);
  const assets = useService<IAssetsService>(SERVICE_KEYS.ASSETS);

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
        const created = await assets.create({
          brandId: currentBrand.id,
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
          origin: 'uploaded',
        });
        result.id = created.id;
      }

      return result;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  }, [currentBrand, assets]);

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
