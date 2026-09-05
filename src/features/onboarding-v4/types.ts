export type AssetKind = 'image' | 'pdf' | 'font' | 'design' | 'zip' | 'link' | 'video' | 'audio' | 'color' | 'file';

export type FontSource = 'upload' | 'google';

/**
 * A logo's role on the board.
 *
 * `light` is no longer offered — a logo on a light background is the ordinary
 * case — but it stays in the union so a brand saved before that still loads.
 *
 * `custom:<name>` is a variant the user named themselves. The name is the key:
 * there is nothing else to keep in step, and two variants called the same thing
 * are the same variant.
 */
export type KnownSlot =
  | 'primary'
  | 'light'
  | 'dark'
  | 'mark'
  | 'horizontal'
  | 'vertical'
  | 'wordmark';

export type LogoSlot = KnownSlot | `custom:${string}`;

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
  /**
   * Whether the USER has agreed to which variant this is.
   *
   * The system places every logo it recognises, and it is sometimes wrong in a
   * way only a person can see — a wide logotype named `Logomark.svg` looks like
   * an icon to a filename and nothing like one to an eye. So a placement we
   * made is a QUESTION until the owner answers it, and the board says which
   * placements are still questions. A slot the user chose themselves is already
   * answered and never asks.
   */
  slotConfirmed?: boolean;
  /** Slot suggested by the Brand Vision classifier. Unlike `logoSlot` this is
   *  only a hint — the review step's router turns it into a real placement.
   *  (Setting `logoSlot` directly at upload time would hide the tile from the
   *  dropzone, which filters out already-placed logos.) */
  aiLogoSlot?: LogoSlot;
  /** Whether this logo was generated from another asset (auto B&W from SVG). */
  generated?: boolean;
  /**
   * Where the USER put this, when they said.
   *
   * Set only by an upload made from inside a specific section. It outranks
   * every classifier: an item dropped into Brand Assets stays in Brand Assets,
   * however much its filename or its artwork looks like a mark. Absent means
   * nobody has said, and the flow is free to work it out.
   */
  placement?: 'assets';
  /** Whether the image is cut out. Evidence, never a verdict — see intakeTypes. */
  hasTransparency?: boolean;
  /** Where the Brand Vision classifier placed this upload. `'colors'` marks a
   *  recognized palette image — its swatches went to the Colors section, so
   *  the image itself must NOT also land in Brand Assets. */
  aiPlacement?: 'logos' | 'images' | 'colors' | 'fonts' | 'files';
  /** Hex value for color-kind assets (e.g. "#3F3F88"). */
  value?: string;
  /** Color-kind only: locked colors are skipped by the palette shuffle. */
  locked?: boolean;
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
  /** Who wrote the description: the user themselves, or an AI whose reply they pasted. */
  descriptionAuthorship?: 'pasted' | 'written';
  /** A website address found in the description that the user asked us NOT to read. */
  ignoredSite?: string;
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

/** 1 = brand name · 2 = describe + bring · 3 = review your uploads. */
export type SetupPanel = 1 | 2 | 3;
