/**
 * Content Block system — Frontify-inspired flexible building blocks for
 * brand guidelines and brand portals. v5 PRD Phase 8.
 *
 * Each block is a discriminated union by `type`. Blocks live in a
 * `BlockDocument` which is a flat ordered list (no nesting in v1).
 */

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'quote'
  | 'divider'
  | 'image'
  | 'image-grid'
  | 'color-swatch'
  | 'color-palette'
  | 'type-specimen'
  | 'logo-card'
  | 'do-dont'
  | 'video'
  | 'code'
  | 'download'
  | 'callout';

export interface BaseBlock {
  id: string;
  type: BlockType;
  /** Optional anchor for in-page links + comments. */
  anchor?: string;
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph';
  text: string;
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote';
  text: string;
  author?: string;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  variant?: 'line' | 'space-sm' | 'space-lg';
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  url: string;
  caption?: string;
  /** layout: full bleed, contained, or framed */
  layout?: 'contained' | 'full' | 'framed';
}

export interface ImageGridBlock extends BaseBlock {
  type: 'image-grid';
  images: Array<{ url: string; caption?: string }>;
  columns?: 2 | 3 | 4;
}

export interface ColorSwatchBlock extends BaseBlock {
  type: 'color-swatch';
  hex: string;
  name?: string;
  usage?: string;
}

export interface ColorPaletteBlock extends BaseBlock {
  type: 'color-palette';
  swatches: Array<{ hex: string; name?: string; usage?: string }>;
}

export interface TypeSpecimenBlock extends BaseBlock {
  type: 'type-specimen';
  fontFamily: string;
  /** Sample text shown at the largest scale. */
  sampleText?: string;
  weights?: number[];
}

export interface LogoCardBlock extends BaseBlock {
  type: 'logo-card';
  logoUrl: string;
  variant?: 'primary' | 'inverse' | 'mono' | 'icon';
  background?: string;
  caption?: string;
}

export interface DoDontBlock extends BaseBlock {
  type: 'do-dont';
  do: { imageUrl?: string; text: string };
  dont: { imageUrl?: string; text: string };
}

export interface VideoBlock extends BaseBlock {
  type: 'video';
  /** YouTube/Vimeo embed URL or direct mp4 url */
  src: string;
  caption?: string;
}

export interface CodeBlock extends BaseBlock {
  type: 'code';
  language?: string;
  code: string;
}

export interface DownloadBlock extends BaseBlock {
  type: 'download';
  label: string;
  url: string;
  fileSize?: string;
  format?: string;
}

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  variant: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  text: string;
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | QuoteBlock
  | DividerBlock
  | ImageBlock
  | ImageGridBlock
  | ColorSwatchBlock
  | ColorPaletteBlock
  | TypeSpecimenBlock
  | LogoCardBlock
  | DoDontBlock
  | VideoBlock
  | CodeBlock
  | DownloadBlock
  | CalloutBlock;

export interface BlockDocument {
  id: string;
  brandId: string;
  title: string;
  blocks: Block[];
  updatedAt: number;
  createdAt: number;
}

export interface BlockTypeMeta {
  type: BlockType;
  label: string;
  description: string;
  group: 'text' | 'media' | 'identity' | 'utility';
  /** Returns a default new block of this type. */
  defaultProps: () => Omit<Block, 'id'>;
}
