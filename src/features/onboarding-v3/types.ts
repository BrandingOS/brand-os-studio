export type HexColor = `#${string}`;

export interface FeelStyle {
  id: string;
  label: string;
  imageUrl: string;
  moodKeywords: string[];
  locked: boolean;
}

export interface FeelPalette {
  id: string;
  name: string;
  colors: [string, string, string, string, string];
  mood: string;
  locked: boolean;
  isCustom: boolean;
}

export type AssetKind = 'image' | 'pdf' | 'font' | 'design' | 'zip' | 'link';

export interface OnboardingAsset {
  id: string;
  filename: string;
  mimeType: string;
  kind: AssetKind;
  previewUrl: string | null;
  scratchPath: string | null;
  remotePath: string | null;
  uploadProgress: number;
  uploadStatus: 'pending' | 'uploading' | 'done' | 'error';
  errorMessage?: string;
  sourceUrl?: string;
}

export interface DefineAnswers {
  name: string;
  description: string;
  audience: string;
  market: string;
  goals: string;
  values: string;
}

export interface OgMeta {
  title: string;
  description: string;
  imageUrl: string | null;
  faviconUrl: string | null;
}

export type AiState = 'idle' | 'generating' | 'error';
export type OnboardingFlow = 'setup' | 'create';
export type CreateStep = 1 | 2 | 3;
