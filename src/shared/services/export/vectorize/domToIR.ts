/**
 * DOM → Vector IR walker
 *
 * Recursively visits a slide root and emits a Vector IR tree. Both the SVG
 * and PDF emitters consume the same IR. Elements with CSS features we can't
 * faithfully reproduce in vector (shadows, gradients, transforms, etc.) get
 * captured as raster patches at high res, and the rest of the slide stays
 * fully editable.
 */

import type {
  VectorIR,
  VectorNode,
  RectNode,
  TextNode,
  ImageNode,
  RasterFallbackNode,
} from './types';
import {
  parseColor,
  isTransparent,
  rgbaToHex,
  parseFontWeight,
  parsePx,
  averageBorderRadius,
} from './cssParse';
import { extractWrappedLines } from './textWrapping';

interface WalkContext {
  slideRect: DOMRect;
  nodes: VectorNode[];
  fallbacks: Promise<void>[];
}

export interface DomToIROptions {
  /** Skip raster fallback for unsupported features (faster but lower fidelity). */
  noRasterFallback?: boolean;
}

export async function domToIR(slideRoot: HTMLElement, opts: DomToIROptions = {}): Promise<VectorIR> {
  const slideRect = slideRoot.getBoundingClientRect();
  const ctx: WalkContext = { slideRect, nodes: [], fallbacks: [] };

  // Slide background
  const slideStyle = getComputedStyle(slideRoot);
  const slideBg = parseColor(slideStyle.backgroundColor);
  const ir: VectorIR = {
    width: slideRect.width,
    height: slideRect.height,
    background: slideBg && slideBg.a > 0 ? rgbaToHex(slideBg) : undefined,
    nodes: ctx.nodes,
  };

  walk(slideRoot, ctx, opts, /* isRoot */ true);

  // Wait for any async raster fallbacks to finish
  if (ctx.fallbacks.length > 0) {
    await Promise.all(ctx.fallbacks);
  }

  return ir;
}

// ── Walker ──────────────────────────────────────────────────

function walk(node: Element, ctx: WalkContext, opts: DomToIROptions, isRoot: boolean): void {
  if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) return;

  const style = getComputedStyle(node);
  if (style.display === 'none' || style.visibility === 'hidden') return;
  const opacity = parseFloat(style.opacity || '1');
  if (opacity === 0) return;

  const rect = node.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    // Continue traversal — children may still be visible
    for (const child of Array.from(node.children)) walk(child, ctx, opts, false);
    return;
  }

  const x = rect.left - ctx.slideRect.left;
  const y = rect.top - ctx.slideRect.top;

  // Detect unsupported features → raster fallback for THIS subtree
  const reason = detectUnsupportedFeature(node, style);
  if (reason && !isRoot) {
    if (!opts.noRasterFallback) {
      const placeholder: RasterFallbackNode = {
        type: 'raster-fallback',
        x, y, w: rect.width, h: rect.height,
        pngDataUrl: '',
        reason,
      };
      const idx = ctx.nodes.length;
      ctx.nodes.push(placeholder);
      ctx.fallbacks.push(rasterizeElement(node as HTMLElement).then((url) => {
        (ctx.nodes[idx] as RasterFallbackNode).pngDataUrl = url;
      }));
      console.debug('[vector-export] raster fallback:', reason, node);
    }
    return;
  }

  // Background fill
  if (!isRoot) {
    const bg = parseColor(style.backgroundColor);
    if (bg && bg.a > 0) {
      const r: RectNode = {
        type: 'rect',
        x, y, w: rect.width, h: rect.height,
        fill: rgbaToHex(bg),
        rx: averageBorderRadius(style),
        opacity: opacity * bg.a,
      };
      ctx.nodes.push(r);
    }
  }

  // Border (treat all 4 sides as the same — 99% of our slides do)
  const borderWidth = parsePx(style.borderTopWidth);
  if (borderWidth > 0 && !isRoot) {
    const borderColor = parseColor(style.borderTopColor);
    if (borderColor && borderColor.a > 0) {
      ctx.nodes.push({
        type: 'rect',
        x: x + borderWidth / 2,
        y: y + borderWidth / 2,
        w: rect.width - borderWidth,
        h: rect.height - borderWidth,
        stroke: rgbaToHex(borderColor),
        strokeWidth: borderWidth,
        rx: averageBorderRadius(style),
        opacity,
      });
    }
  }

  // <img>?
  if (node.tagName === 'IMG') {
    const img = node as HTMLImageElement;
    const src = img.currentSrc || img.src;
    const isVector = src.startsWith('data:image/svg') || /\.svg($|\?)/i.test(src);
    const filterValue = style.filter && style.filter !== 'none' ? style.filter : undefined;
    const objectFit = (style.objectFit || 'fill') as ImageNode['objectFit'];

    const imgNode: ImageNode = {
      type: 'image',
      x, y, w: rect.width, h: rect.height,
      src,
      isVectorSource: isVector,
      filter: filterValue,
      objectFit,
    };
    ctx.nodes.push(imgNode);
    return;
  }

  // Inline <svg> → flatten into a raster patch (the IR can't represent inline SVG natively;
  // emitter-side, the SVG output handles vector inlining separately at the source-fetch level)
  if (node.tagName.toLowerCase() === 'svg') {
    if (!opts.noRasterFallback) {
      const placeholder: RasterFallbackNode = {
        type: 'raster-fallback',
        x, y, w: rect.width, h: rect.height,
        pngDataUrl: '',
        reason: 'inline <svg>',
      };
      const idx = ctx.nodes.length;
      ctx.nodes.push(placeholder);
      ctx.fallbacks.push(rasterizeElement(node as unknown as HTMLElement).then((url) => {
        (ctx.nodes[idx] as RasterFallbackNode).pngDataUrl = url;
      }));
    }
    return;
  }

  // Text leaf?
  if (isTextLeaf(node)) {
    const textNode = buildTextNode(node, style, ctx.slideRect);
    if (textNode) ctx.nodes.push(textNode);
    return;
  }

  // Recurse into children in document order
  for (const child of Array.from(node.children)) {
    walk(child, ctx, opts, false);
  }
}

// ── Helpers ─────────────────────────────────────────────────

function isTextLeaf(node: Element): boolean {
  // A text leaf has no element children but has non-empty text content
  if (node.children.length > 0) return false;
  const text = node.textContent ?? '';
  return text.trim().length > 0;
}

function buildTextNode(el: Element, style: CSSStyleDeclaration, slideRect: DOMRect): TextNode | null {
  const lines = extractWrappedLines(el as HTMLElement);
  if (lines.length === 0) return null;

  const elRect = el.getBoundingClientRect();
  const x = elRect.left - slideRect.left;
  const y = elRect.top - slideRect.top;
  const color = parseColor(style.color);
  const colorHex = color ? rgbaToHex(color) : '#000000';

  return {
    type: 'text',
    x,
    y,
    w: elRect.width,
    h: elRect.height,
    lines: lines.map((l) => l.text),
    fontFamily: style.fontFamily || 'sans-serif',
    fontSize: parsePx(style.fontSize) || 16,
    fontWeight: parseFontWeight(style.fontWeight),
    fontStyle: (style.fontStyle === 'italic' ? 'italic' : 'normal') as 'normal' | 'italic',
    color: colorHex,
    align: ((['left', 'center', 'right'] as const).includes(style.textAlign as any)
      ? style.textAlign
      : 'left') as 'left' | 'center' | 'right',
    lineHeight: parsePx(style.lineHeight) || parsePx(style.fontSize) * 1.2 || 19,
    letterSpacing: parsePx(style.letterSpacing) || undefined,
  };
}

function detectUnsupportedFeature(node: Element, style: CSSStyleDeclaration): string | null {
  // Box shadow
  if (style.boxShadow && style.boxShadow !== 'none') return 'box-shadow';

  // Background image (gradient or url)
  if (style.backgroundImage && style.backgroundImage !== 'none') {
    if (style.backgroundImage.includes('gradient')) return 'css-gradient';
    return 'background-image';
  }

  // Filter on a non-image element
  if (node.tagName !== 'IMG' && style.filter && style.filter !== 'none') return 'css-filter';

  // Backdrop filter
  if (style.backdropFilter && style.backdropFilter !== 'none') return 'backdrop-filter';

  // Transform other than identity
  if (style.transform && style.transform !== 'none' && style.transform !== 'matrix(1, 0, 0, 1, 0, 0)') {
    return 'transform';
  }

  // Clip path / mask
  if (style.clipPath && style.clipPath !== 'none') return 'clip-path';
  if (style.maskImage && style.maskImage !== 'none') return 'mask';

  // Mix blend mode
  if (style.mixBlendMode && style.mixBlendMode !== 'normal') return 'mix-blend-mode';

  return null;
}

async function rasterizeElement(el: HTMLElement): Promise<string> {
  // Reuse the existing high-res capture utility — handles SVG sizing,
  // CSS filters on imgs, container queries, off-DOM staging, etc.
  const { captureElementForExport } = await import('@/shared/editor/exportCapture');
  const canvas = await captureElementForExport(el, { scale: 4, backgroundColor: null });
  return canvas.toDataURL('image/png');
}
