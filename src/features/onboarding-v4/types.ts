export type AssetKind = 'image' | 'pdf' | 'font' | 'design' | 'zip' | 'link' | 'video' | 'audio' | 'file';

export interface OnboardingAsset {
  id: string;
  name: string;
  sub: string;
  kind: AssetKind;
  previewUrl: string | null;
  sourceUrl?: string;
  uploadStatus: 'uploading' | 'done' | 'error';
  uploadProgress: number;
  _file?: File;
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
