/**
 * Bento Grid — shared types.
 *
 * A BentoDesign is a grid of tiles. Each tile occupies a rectangle in a
 * column/row system and carries a `content` describing what to render.
 * Templates define the rectangle geometry; slot-kind + content drives
 * what fills each rectangle. Size presets are aspect-aware and the grid
 * re-flows to fit the chosen aspect.
 */

export type TileKind =
  | 'logo'
  | 'color'
  | 'gradient'
  | 'typography'
  | 'voice-quote'
  | 'asset-image'
  | 'user-image'
  | 'text'
  | 'pattern'
  | 'stat'
  | 'empty';

export interface TileContent {
  /** For `text`, `stat`, `voice-quote`. */
  text?: string;
  /** For `stat`. */
  label?: string;
  /** For `color`. Hex. */
  color?: string;
  /** For `gradient`. Two hex values. */
  gradient?: { from: string; to: string; angle?: number };
  /** For `logo`. Which variant (full, icon, wordmark, dark, light). */
  logoVariant?: 'full' | 'icon' | 'wordmark' | 'dark' | 'light';
  /** For `asset-image`. Brand asset id. */
  assetId?: string;
  /** For `user-image`. Inline data URL. */
  dataUrl?: string;
  /** For `pattern`. */
  patternKind?: 'dots' | 'stripes' | 'checker' | 'circles';
  /** Optional text color / font overrides. */
  fg?: string;
  bg?: string;
  /** Typography font-family override (for `typography` kind). */
  fontFamily?: string;
  /** Text align. */
  align?: 'left' | 'center' | 'right';
  /** Scale multiplier for large text tiles. */
  textSize?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface BentoTile {
  id: string;
  /** 1-indexed grid placement. */
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  kind: TileKind;
  content: TileContent;
}

export interface BentoTemplate {
  id: string;
  name: string;
  /** Total grid columns/rows. */
  cols: number;
  rows: number;
  /** Tile rectangles — `kind` is a hint/default; actual fill randomised. */
  tiles: Array<Pick<BentoTile, 'id' | 'row' | 'col' | 'rowSpan' | 'colSpan' | 'kind'>>;
  /** Preferred aspect. Layouts still adapt to any size. */
  preferredAspect?: 'square' | 'portrait' | 'landscape' | 'any';
}

export type SizePresetId =
  | 'square'
  | 'post-4x5'
  | 'story-9x16'
  | 'wide-16x9'
  | 'poster-2x3'
  | 'a4'
  | 'custom';

export interface SizePreset {
  id: SizePresetId;
  name: string;
  /** Export pixel dimensions. */
  width: number;
  height: number;
  /** Short tagline, shown in the picker. */
  hint?: string;
}

export interface BentoDesign {
  id: string;
  templateId: string;
  sizeId: SizePresetId;
  /** Only populated when sizeId === 'custom'. */
  customSize?: { width: number; height: number };
  tiles: BentoTile[];
  backgroundColor: string;
  /** Gap between tiles, percent of smaller artboard dim. */
  gap: number;
  /** Corner radius, percent of smaller artboard dim. */
  radius: number;
  /** Optional saved title. */
  title?: string;
  /** Optional public flag (Part 4). */
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
