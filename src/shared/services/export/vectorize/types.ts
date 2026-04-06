/**
 * Vector IR — intermediate representation produced by the DOM walker.
 *
 * Both the SVG and PDF emitters consume this shape; neither one ever touches
 * the live DOM. Adding a new output format = writing one new emitter against
 * VectorIR; adding a new DOM feature = updating the walker once and both
 * formats benefit.
 */

export interface VectorIR {
  /** Slide width in CSS px (== rendered width on screen). */
  width: number;
  /** Slide height in CSS px. */
  height: number;
  /** Optional slide background color. */
  background?: string;
  /** Depth-first DOM order. Document order == paint order in our slides. */
  nodes: VectorNode[];
}

export type VectorNode = RectNode | TextNode | ImageNode | RasterFallbackNode;

export interface RectNode {
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  /** Solid fill color (hex or rgb). Omit for stroke-only rects. */
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** Border-radius in px. Single value (we average the 4 corners). */
  rx?: number;
  /** 0..1, defaults to 1. */
  opacity?: number;
}

export interface TextNode {
  type: 'text';
  x: number;
  y: number;
  w: number;
  h: number;
  /** Pre-wrapped lines as the browser laid them out. */
  lines: string[];
  /** CSS font-family stack as-is — emitter picks the first available. */
  fontFamily: string;
  /** Px. */
  fontSize: number;
  /** Numeric weight (400, 500, 700, etc.). */
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  /** Hex. */
  color: string;
  align: 'left' | 'center' | 'right';
  /** Px. */
  lineHeight: number;
  letterSpacing?: number;
}

export interface ImageNode {
  type: 'image';
  x: number;
  y: number;
  w: number;
  h: number;
  /** Data URL or http URL of the source image. */
  src: string;
  /** True for SVG sources — they can be inlined as native vector in SVG output. */
  isVectorSource: boolean;
  /** CSS filter to bake before embedding (e.g. 'brightness(0) invert(1)'). */
  filter?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
}

export interface RasterFallbackNode {
  type: 'raster-fallback';
  x: number;
  y: number;
  w: number;
  h: number;
  /** PNG data URL captured at high res via the existing exportCapture utility. */
  pngDataUrl: string;
  /** Why this element wasn't vectorized (for debug logging). */
  reason: string;
}
