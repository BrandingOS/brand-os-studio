/**
 * Unified Brand Asset System — v3 schema.
 *
 * All brand assets (logos, images, fonts, documents) live once in
 * `brand.assets[]` with a stable `id`. Every logo slot in
 * `brand.logoSystem` becomes a REFERENCE to that asset ID — never an
 * inline URL. This eliminates duplication across `brand.logo`,
 * `brand.logoAssets.*`, and `brand.guidelines.logoSystem.*.url` that
 * existed in v2.
 *
 * Legacy fields (`brand.logo`, `brand.logoAssets`, `brand.guidelines.logoSystem`)
 * are kept on the type as optional and populated by derived back-compat
 * getters at read time. Writers should target the v3 fields only.
 */

/** Canonical schema version — bumps trigger migration on load. */
export const BRAND_SCHEMA_VERSION = 3;

/** The role a logo plays in the brand system. */
export type LogoRole =
  | 'primary'
  | 'secondary'
  | 'wordmark'
  | 'iconmark'
  | 'mono.black'
  | 'mono.white'
  | 'horizontal'
  | 'stacked';

/** Preview/rendered formats stored for a single asset. */
export type AssetFormat = 'svg' | 'png' | 'pdf' | 'webp' | 'jpg';

/** Kinds of assets the unified pipeline handles. */
export type BrandAssetKind = 'logo' | 'image' | 'font' | 'document' | 'icon';

/**
 * A single stored file for an asset — one asset can have multiple
 * formats (e.g. an SVG logo with a PNG raster and WEBP thumbnail).
 */
export interface AssetFile {
  /** data URL (local storage) or public URL (Supabase storage) */
  url: string;
  /** Supabase Storage path, when the file is backed by remote storage. */
  storagePath?: string;
  /** Byte size of the stored file. */
  size: number;
  /** MIME type when known. */
  mime?: string;
}

/**
 * A brand asset — canonical entry in `brand.assets[]`. Every logo,
 * image, or document lives here exactly once and is referenced by id.
 */
export interface BrandAsset {
  /** Stable asset id — survives renames, replacements bump `version`. */
  id: string;
  kind: BrandAssetKind;
  /** Optional semantic role (e.g. "logo.primary"). */
  role?: LogoRole | string;
  /** Human-readable display name. */
  name: string;
  /** File(s) for this asset keyed by format. */
  formats: Partial<Record<AssetFormat, AssetFile>>;
  /** Free-form tags for search / filtering. */
  tags?: string[];
  metadata: {
    width?: number;
    height?: number;
    originalName?: string;
    /** ISO timestamp. */
    createdAt: string;
    /** ISO timestamp of most recent replacement. */
    updatedAt?: string;
    /** Bumps on replace to bust caches. */
    version: number;
    /** If this asset was derived/generated from another asset. */
    derivedFrom?: string;
    /** Hash used for dedupe. */
    contentHash?: string;
  };
}

/** A reference into `brand.assets[]` — the primary building block. */
export interface AssetRef {
  assetId: string;
  /** Optional — which format to prefer when rendering (svg preferred by default). */
  preferredFormat?: AssetFormat;
}

/** A reference to a logo asset, with usage metadata specific to that slot. */
export interface LogoRef extends AssetRef {
  description?: string;
  usage?: string;
}

/**
 * The canonical logo system — every slot is a reference into
 * `brand.assets[]`, never an inline URL.
 */
export interface LogoSystemRefs {
  primary?: LogoRef;
  secondary?: LogoRef;
  wordmark?: LogoRef;
  iconmark?: LogoRef;
  mono?: {
    black?: LogoRef;
    white?: LogoRef;
  };
  orientations?: {
    horizontal?: LogoRef;
    stacked?: LogoRef;
  };
  /** Clear-space rule, e.g. "1× cap height on all sides". */
  clearSpace?: string;
  /** Minimum legible size, e.g. "80px digital / 25mm print". */
  minSize?: string;
  /** Do / don't usage rules. */
  usage?: LogoUsageRule[];
}

export interface LogoUsageRule {
  do: string;
  dont: string;
  example?: string;
}

/**
 * Color system — canonical palette. Collapses legacy
 * `brand.primaryColor` + `brand.guidelines.colorPalette`.
 */
export interface ColorSystem {
  primary: ColorToken;
  secondary?: ColorToken;
  accent?: ColorToken;
  neutrals?: ColorToken[];
  semantic?: {
    success?: ColorToken;
    warning?: ColorToken;
    error?: ColorToken;
    info?: ColorToken;
  };
}

export interface ColorToken {
  /** Hex is canonical. All other representations derived. */
  hex: string;
  name?: string;
  /** When present, overrides derived RGB. */
  rgb?: string;
  cmyk?: string;
  pantone?: string;
  usage?: string;
}

/**
 * Typography system — canonical. Collapses legacy `brand.fonts` +
 * `brand.guidelines.typography`.
 */
export interface TypographySystem {
  primary: FontToken;
  secondary?: FontToken;
  accent?: FontToken;
  scale?: FontScaleTokens;
}

export interface FontToken {
  family: string;
  weights?: number[];
  fallbacks?: string[];
  /** Optional font file asset reference (for custom fonts). */
  fontAssetId?: string;
  /** Google Fonts / Adobe Fonts URL if loaded over the network. */
  url?: string;
  usage?: string;
}

export interface FontScaleTokens {
  h1?: string;
  h2?: string;
  h3?: string;
  h4?: string;
  h5?: string;
  h6?: string;
  body?: string;
  bodyLarge?: string;
  bodySmall?: string;
  caption?: string;
  overline?: string;
}
