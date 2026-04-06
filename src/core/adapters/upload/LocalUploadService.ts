/**
 * LocalUploadService — IUploadService implementation using browser-side
 * compression to a data URL. Used for dev/guest mode where files are stored
 * in localStorage as part of the brand object.
 *
 * For production with object storage, swap to SupabaseUploadService at boot
 * time. The contract guarantees the same `{ url, width, height }` shape, so
 * `useUpload` and every consumer remain unchanged.
 */

import type { IUploadService, UploadServiceResult } from '@/core/types/services';
import { compressLogo, compressAsset, compressImage } from '@/shared/utils/imageUpload';

function getDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

export class LocalUploadService implements IUploadService {
  async uploadImage(file: File, opts?: { kind?: 'logo' | 'asset' | 'image' }): Promise<UploadServiceResult> {
    const kind = opts?.kind ?? 'image';
    const url = kind === 'logo' ? await compressLogo(file)
      : kind === 'asset' ? await compressAsset(file)
      : await compressImage(file);
    const { width, height } = await getDimensions(url);
    return { url, width, height };
  }
}
