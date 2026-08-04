export type AssetKind = 'image' | 'pdf' | 'font' | 'design' | 'zip' | 'link' | 'video' | 'audio' | 'color' | 'file';

export type FontSource = 'upload' | 'google';

export type LogoSlot =
  | 'primary'
  | 'light'
  | 'dark'
  | 'mark'
  | 'horizontal'
  | 'vertical'
  | 'wordmark';

export type SocialPlatformId =
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'youtube'
  | 'facebook'
  | 'tiktok'
  | 'threads'
  | 'github'
  | 'behance'
  | 'dribbble'
  | 'pinterest'
  | 'website';

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
  /** Slot suggested by the Brand Vision classifier. Unlike `logoSlot` this is
   *  only a hint — the review step's router turns it into a real placement.
   *  (Setting `logoSlot` directly at upload time would hide the tile from the
   *  dropzone, which filters out already-placed logos.) */
  aiLogoSlot?: LogoSlot;
  /** Whether this logo was generated from another asset (auto B&W from SVG). */
  generated?: boolean;
  /** Where the Brand Vision classifier placed this upload. `'colors'` marks a
   *  recognized palette image — its swatches went to the Colors section, so
   *  the image itself must NOT also land in Brand Assets. */
  aiPlacement?: 'logos' | 'images' | 'colors' | 'fonts' | 'files';
  /** Hex value for color-kind assets (e.g. "#3F3F88"). */
  value?: string;
  /** Where a font asset came from. */
  fontSource?: FontSource;
  /** Detected platform for link-kind assets. */
  socialPlatform?: SocialPlatformId;
  /** User-facing handle for link-kind assets (e.g. "@yourhandle"). */
  handle?: string;
  /** SHA-256 of the uploaded file's bytes — used to reject duplicate uploads
   *  even when the file was renamed. */
  contentHash?: string;
  _file?: File;
}

export interface AboutSection {
  id: string;
  name: string;
  content: string;
}

export interface DefineAnswers {
  name: string;
  description: string;
  /** Slogan the user typed inline on the review page. Overrides whatever was
   *  parsed out of the description; empty/undefined falls back to the parse. */
  slogan?: string;
}

export interface FeelPalette {
  id: string;
  name: string;
  vibe: string;
  colors: string[];
  locked: boolean;
  isCustom: boolean;
}

export interface StyleCardState {
  id: string;
  locked: boolean;
  fontIdx: number;
}

export type CreateStep = 1 | 2;

export type SetupPanel = 1 | 2;
