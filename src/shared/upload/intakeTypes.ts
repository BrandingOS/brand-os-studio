/**
 * The shape of material a user brings in.
 *
 * These types moved out of `features/onboarding-v4` when spec 002 replaced that
 * flow: the intake utilities beside this file (folder walking, archive
 * extraction, content hashing, image analysis, family grouping) are proven and
 * survive the feature that happened to be their first caller.
 *
 * This describes material IN FLIGHT — between the drop and the Library. Once an
 * item lands it is an `Asset` (a Library item) and this shape is done with it.
 */

export type AssetKind =
  | 'image' | 'pdf' | 'font' | 'design' | 'zip' | 'link' | 'video' | 'audio' | 'color' | 'file';

export type FontSource = 'upload' | 'google';

export type LogoSlot =
  | 'primary' | 'light' | 'dark' | 'mark' | 'horizontal' | 'vertical' | 'wordmark';

export type SocialPlatformId =
  | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'facebook' | 'tiktok'
  | 'threads' | 'github' | 'behance' | 'dribbble' | 'pinterest' | 'website';

export interface OnboardingAsset {
  id: string;
  name: string;
  sub: string;
  kind: AssetKind;
  previewUrl: string | null;
  sourceUrl?: string;
  uploadStatus: 'uploading' | 'done' | 'error';
  uploadProgress: number;
  isLogo?: boolean;
  /** Slot a logo asset is bound to (only for kind=image with isLogo). */
  logoSlot?: LogoSlot;
  /** Slot suggested by classification. A HINT — the router turns it into a real
   *  placement. Setting `logoSlot` directly at intake would hide the tile from
   *  the dropzone, which filters out already-placed logos. */
  aiLogoSlot?: LogoSlot;
  /** Whether this logo was generated from another asset (auto B&W from SVG). */
  generated?: boolean;
  /** Where classification placed this upload. `'colors'` marks a recognized
   *  palette image — its swatches went to Colours, so the image itself must NOT
   *  also land in the catch-all group. */
  aiPlacement?: 'logos' | 'images' | 'colors' | 'fonts' | 'files';
  /** Hex value for color-kind items (e.g. "#3F3F88"). */
  value?: string;
  /** Color-kind only: locked colors are skipped by a palette shuffle. */
  locked?: boolean;
  /** Where a font came from. */
  fontSource?: FontSource;
  /** Detected platform for link-kind items. */
  socialPlatform?: SocialPlatformId;
  /** User-facing handle for link-kind items (e.g. "@yourhandle"). */
  handle?: string;
  /** SHA-256 of the file's bytes — rejects a duplicate even when renamed, and
   *  becomes the Library item's `contentHash`. */
  contentHash?: string;
  /** The failure reason when `uploadStatus === 'error'`, shown on the row. */
  error?: string;
  _file?: File;
}
