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
  /** Whether this logo was generated from another asset (auto B&W from SVG). */
  generated?: boolean;
  /** Hex value for color-kind assets (e.g. "#3F3F88"). */
  value?: string;
  /** Where a font asset came from. */
  fontSource?: FontSource;
  /** Detected platform for link-kind assets. */
  socialPlatform?: SocialPlatformId;
  /** User-facing handle for link-kind assets (e.g. "@yourhandle"). */
  handle?: string;
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
