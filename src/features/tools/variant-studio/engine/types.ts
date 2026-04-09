/**
 * Variant Studio — engine types.
 *
 * Pure data shapes. No React, no DOM. Everything in this folder must
 * stay framework-free so it can be unit-tested, run in workers, or used
 * server-side later.
 */

export type Composition = 'lockup' | 'icon-only' | 'wordmark-only';
export type Layout = 'horizontal' | 'stacked' | 'icon-left' | 'icon-top' | 'custom';
export type ColorMode = 'brand' | 'mono-black' | 'mono-white' | 'inverse' | 'custom';
export type BackgroundKind = 'transparent' | 'solid' | 'brand' | 'image';
export type SafeArea = 'tight' | 'standard' | 'generous';
export type ExportFormat = 'svg' | 'png' | 'pdf' | 'jpg' | 'webp';
export type ExportDensity = 1 | 2 | 3;

/** A color, with provenance — so the UI can show "from your brand" vs "added". */
export interface ColorRef {
  hex: string;
  source: 'brand-primary' | 'brand-secondary' | 'brand-accent' | 'custom' | 'neutral';
  /** Optional human label, e.g. "Raqm Blue". */
  label?: string;
}

export interface PaletteContext {
  /** Brand-derived colors, in priority order. */
  brandColors: ColorRef[];
  /** User-added colors during the session. */
  customColors: ColorRef[];
  /** Always present — black and white. */
  neutrals: { black: ColorRef; white: ColorRef };
}

/** Bounding box in source units. */
export interface Bbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The user's source logo. Either a parsed SVG, a raster image data URL,
 * or a structured composition (icon SVG + wordmark text).
 */
export interface SourceLogo {
  id: string;
  kind: 'uploaded' | 'brand-asset' | 'logo-maker';
  /** Original asset — used as the canonical "color brand" version. */
  original: {
    svg?: string;
    raster?: string;
    width: number;
    height: number;
  };
  /** Detected or supplied icon, if separable. */
  icon?: {
    svg?: string;
    raster?: string;
    bbox: Bbox;
  };
  /** Detected or supplied wordmark — text only is enough; renderer styles it. */
  wordmark?: {
    text: string;
    fontFamily: string;
    fontWeight?: number;
  };
  /** Original brand id, if this came from a brand. */
  sourceBrandId?: string;
  sourceBrandSlug?: string;
}

/**
 * Custom layout overrides — only used when `layout === 'custom'`.
 */
export interface CustomLayout {
  /** Icon scale relative to wordmark cap-height (1.0 = match cap height). */
  iconScale: number;
  /** Gap between icon and wordmark, in cap-heights. */
  gap: number;
  /** Stacking direction. */
  direction: 'horizontal' | 'vertical';
  align: 'start' | 'center' | 'end';
}

/** Per-layer color picks. */
export interface ColorMap {
  icon: ColorRef;
  wordmark: ColorRef;
  accent?: ColorRef;
}

export interface Background {
  kind: BackgroundKind;
  /** Hex when kind === 'solid'. Reference to brand color when 'brand'. */
  value?: string;
}

/**
 * Brand-level slogan: a short tagline rendered below the logo. The
 * text and alignment are defined ONCE at the brand level (in the
 * BrandContextRail's Brand section). Each variant decides
 * independently — via `VariantSpec.includeSlogan` — whether to
 * actually render it. That way the user writes the slogan once and
 * gets to choose which exports include it.
 */
export interface BrandSlogan {
  text: string;
  /** Horizontal alignment of the slogan below the logo. */
  alignment: 'left' | 'center' | 'right';
}

/**
 * The full description of a single generated variant.
 *
 * Variants are content-addressable — `id` is derived from a stable hash
 * of the spec so identical specs collapse to the same id, which is what
 * makes the missing-variants comparison fast and deterministic.
 */
export interface VariantSpec {
  id: string;
  /** Which source logo this variant is generated from. Required so
   *  variants can coexist that use different uploaded logos. */
  sourceId: string;
  composition: Composition;
  layout: Layout;
  customLayout?: CustomLayout;
  colorMode: ColorMode;
  colorMap: ColorMap;
  background: Background;
  safeArea: SafeArea;
  /** Whether to render the brand-level slogan with this variant.
   *  The actual slogan text + alignment live on the session payload
   *  (`VariantSessionPayload.slogan`), not on each variant. */
  includeSlogan?: boolean;
  /** Default export settings — overridable at export time. */
  format: ExportFormat;
  density: ExportDensity;
  /** Human label shown in the gallery. */
  label: string;
}

/**
 * A working session — what the user is currently building.
 *
 * Multi-source: a session holds an array of source logos. The user
 * can upload several (e.g. icon + full lockup + alternate) and pick
 * which one each variant is generated from. `activeSourceId` is the
 * one currently shown in the rail and used as the basis for the
 * draft variant.
 *
 * Draft model: the user is always editing a `draft` variant in the
 * rail. The draft is committed to `variants` (the gallery) when they
 * click the "Add this variant" CTA. Clicking a tile in the gallery
 * loads its spec back into the draft for re-editing.
 */
export interface VariantSessionPayload {
  sources: SourceLogo[];
  activeSourceId: string | null;
  palette: PaletteContext;
  /** Brand-level slogan. Defined once for the brand; each variant
   *  decides via `includeSlogan` whether to render it. */
  slogan: BrandSlogan;
  /** Committed variants — what shows in the gallery. */
  variants: VariantSpec[];
  /** The currently-edited spec in the rail. */
  draft: VariantSpec | null;
  pinned: string[];
}
