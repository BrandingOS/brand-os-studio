/**
 * Canonical types for the UI Color System engine.
 *
 * These types are the contract between the pure engine (`lib/color-engine/`)
 * and every consumer — the generator UI, the tool session payload, the
 * export pipeline, the brand-sync bridge, and the public share URL
 * encoder. Keep them JSON-serializable: no classes, no Dates, no
 * non-primitive values.
 */

export type ShadeStop = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

export const SHADE_STOPS: readonly ShadeStop[] = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

export interface HslTuple {
  h: number;
  s: number;
  l: number;
}

export interface RgbTuple {
  r: number;
  g: number;
  b: number;
}

export interface OklchTuple {
  /** Lightness 0..1 */
  l: number;
  /** Chroma 0..~0.4 */
  c: number;
  /** Hue 0..360 (degrees) */
  h: number;
}

export interface ShadeValue {
  hex: string;
  hsl: HslTuple;
  rgb: RgbTuple;
  oklch: OklchTuple;
  edited: boolean;
  locked: boolean;
}

export type ShadeMap = Record<ShadeStop, ShadeValue>;

export interface ColorScale {
  inputHex: string;
  shades: ShadeMap;
}

export type RoleKey =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export interface RolePaletteMap {
  primary: ColorScale;
  secondary: ColorScale | null;
  tertiary: ColorScale | null;
  neutral: ColorScale;
  success: ColorScale | null;
  warning: ColorScale | null;
  error: ColorScale | null;
  info: ColorScale | null;
}

export interface SemanticTokens {
  canvas: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  onPrimary: string;
  onSecondary: string;
  onTertiary: string;
  onSuccess: string;
  onWarning: string;
  onError: string;
  focusRing: string;
  selection: string;
  buttonPrimaryBg: string;
  buttonPrimaryFg: string;
  buttonPrimaryHover: string;
  buttonSecondaryBg: string;
  buttonSecondaryFg: string;
  inputBorder: string;
  inputFocus: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  chart6: string;
}

export type ContrastStandard = 'WCAG' | 'APCA';
export type ColorSpace = 'HEX' | 'HSL' | 'RGB' | 'OKLCH';
export type GenerationMode =
  | 'auto'
  | 'brand-safe'
  | 'high-contrast'
  | 'soft-ui'
  | 'vibrant-saas'
  | 'neutral-enterprise'
  | 'dark-mode-optimized';

export interface PaletteSettings {
  contrastStandard: ContrastStandard;
  colorSpace: ColorSpace;
  lockedShade: ShadeStop | null;
  generationMode: GenerationMode;
}

export type HarmonyName =
  | 'monochromatic'
  | 'analogous'
  | 'complementary'
  | 'split-complementary'
  | 'triadic'
  | 'tetradic';

export type Visibility = 'private' | 'public' | 'unlisted';
export type SourceType = 'manual' | 'brand' | 'image' | 'imported';

export interface PaletteSystem {
  id: string;
  name: string;
  ownerId: string | null;
  brandId: string | null;
  visibility: Visibility;
  sourceType: SourceType;
  seedColor: string;
  roles: RolePaletteMap;
  semanticTokens: SemanticTokens;
  settings: PaletteSettings;
  chartColors: string[];
  gradients: string[];
  tags: string[];
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HarmonyResult {
  name: HarmonyName;
  seeds: string[];
  descriptor: string;
}
