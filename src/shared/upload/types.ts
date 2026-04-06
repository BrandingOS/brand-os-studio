/**
 * Upload subsystem types
 */
import type { Asset } from '@/shared/types/brand';

export type UploadKind = 'logo' | 'asset' | 'image';

export interface UploadResult {
  /** Data URL or remote URL */
  url: string;
  /** Optional asset id if persisted to brand.assets */
  id?: string;
  kind: UploadKind;
  /** Original filename */
  name: string;
  size: number;
  width?: number;
  height?: number;
}

export interface UploadOptions {
  kind?: UploadKind;
  /** If true, the upload is persisted to the active brand's `assets` array. */
  persistAsAsset?: boolean;
  /** Asset category if persisted (defaults to 'photo' for asset, 'logo' for logo). */
  assetCategory?: Asset['category'];
  /** Max file size in MB (default 5). */
  maxSizeMB?: number;
  /** Accepted MIME prefixes/extensions (default image/*). */
  acceptedTypes?: string[];
}
