/**
 * IR → jsPDF document
 *
 * Builds a real, vector PDF where text is selectable/editable in Illustrator
 * and shapes are real PDF graphics objects (not raster). Multi-page support
 * via `irsToPdf(ir[])`.
 */

import type jsPDFType from 'jspdf';
import type { VectorIR, RectNode, TextNode, ImageNode, RasterFallbackNode } from './types';
import { parseColor } from './cssParse';
import { registerBrandFontsForPdf, resolvePdfFontFamily } from './pdfFonts';

export interface IrToPdfOptions {
  /** Filename without extension. */
  filename?: string;
}

/** Single-page convenience wrapper. */
export async function irToPdf(ir: VectorIR, opts: IrToPdfOptions = {}): Promise<Blob> {
  return irsToPdf([ir], opts);
}

/** Multi-page builder. Each IR becomes one PDF page. */
export async function irsToPdf(irs: VectorIR[], _opts: IrToPdfOptions = {}): Promise<Blob> {
  if (irs.length === 0) throw new Error('irsToPdf: no slides to export');

  const { default: jsPDF } = await import('jspdf');
  const first = irs[0];

  const doc = new jsPDF({
    unit: 'px',
    format: [first.width, first.height],
    orientation: first.width > first.height ? 'landscape' : 'portrait',
    hotfixes: ['px_scaling'],
    compress: true,
  });

  // Register brand fonts ONCE for the whole document
  const { available, warnings } = await registerBrandFontsForPdf(doc);
  warnings.forEach((w) => console.warn('[vector-export]', w));

  // Pre-bake any SVG / filtered images into raster fallbacks (jsPDF can't
  // embed live SVG and can't apply CSS filters to raster sources directly).
  for (const ir of irs) {
    await prebakeImagesForPdf(ir);
  }

  for (let pageIdx = 0; pageIdx < irs.length; pageIdx++) {
    const ir = irs[pageIdx];
    if (pageIdx > 0) {
      doc.addPage([ir.width, ir.height], ir.width > ir.height ? 'landscape' : 'portrait');
    }
    paintIR(doc, ir, available);
  }

  return doc.output('blob');
}

// ── Painter ─────────────────────────────────────────────────

function paintIR(doc: jsPDFType, ir: VectorIR, available: Set<string>): void {
  // Background
  if (ir.background) {
    const bg = parseColor(ir.background);
    if (bg && bg.a > 0) {
      doc.setFillColor(bg.r, bg.g, bg.b);
      doc.rect(0, 0, ir.width, ir.height, 'F');
    }
  }

  for (const node of ir.nodes) {
    switch (node.type) {
      case 'rect':
        paintRect(doc, node);
        break;
      case 'text':
        paintText(doc, node, available);
        break;
      case 'image':
        paintImage(doc, node);
        break;
      case 'raster-fallback':
        paintRasterFallback(doc, node);
        break;
    }
  }
}

function paintRect(doc: jsPDFType, n: RectNode): void {
  const fillColor = n.fill ? parseColor(n.fill) : null;
  const strokeColor = n.stroke ? parseColor(n.stroke) : null;

  let style: 'F' | 'S' | 'FD' | null = null;
  if (fillColor && fillColor.a > 0) {
    doc.setFillColor(fillColor.r, fillColor.g, fillColor.b);
    style = 'F';
  }
  if (strokeColor && strokeColor.a > 0) {
    doc.setDrawColor(strokeColor.r, strokeColor.g, strokeColor.b);
    doc.setLineWidth(n.strokeWidth ?? 1);
    style = style === 'F' ? 'FD' : 'S';
  }
  if (!style) return;

  // jsPDF GState for opacity
  if (n.opacity !== undefined && n.opacity < 1) {
    setOpacity(doc, n.opacity);
  }

  if (n.rx && n.rx > 0) {
    doc.roundedRect(n.x, n.y, n.w, n.h, n.rx, n.rx, style);
  } else {
    doc.rect(n.x, n.y, n.w, n.h, style);
  }

  if (n.opacity !== undefined && n.opacity < 1) {
    setOpacity(doc, 1);
  }
}

function paintText(doc: jsPDFType, n: TextNode, available: Set<string>): void {
  const family = resolvePdfFontFamily(n.fontFamily, available);
  const isBold = n.fontWeight >= 600;
  const isItalic = n.fontStyle === 'italic';

  let style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal';
  if (isBold && isItalic) style = 'bolditalic';
  else if (isBold) style = 'bold';
  else if (isItalic) style = 'italic';

  try {
    doc.setFont(family, style);
  } catch {
    // Style variant not registered — fall back
    try { doc.setFont(family, 'normal'); } catch { doc.setFont('helvetica', 'normal'); }
  }
  doc.setFontSize(n.fontSize);

  const color = parseColor(n.color);
  if (color) doc.setTextColor(color.r, color.g, color.b);

  // Anchor x by alignment
  let anchorX = n.x;
  if (n.align === 'center') anchorX = n.x + n.w / 2;
  else if (n.align === 'right') anchorX = n.x + n.w;

  // Baseline of first line
  const baseline = n.y + n.fontSize * 0.85;

  n.lines.forEach((line, i) => {
    const lineY = baseline + i * n.lineHeight;
    try {
      doc.text(line, anchorX, lineY, { align: n.align });
    } catch (err) {
      console.warn('[vector-export] text() failed, skipping line', err);
    }
  });
}

function paintImage(doc: jsPDFType, n: ImageNode): void {
  // jsPDF can't render SVG natively, and CSS filters can't be applied at
  // emit time — so for any image with a filter or vector source, we need
  // to schedule a synchronous bake. Since paintIR is sync but the bake is
  // async, we instead use a placeholder approach: the IR walker has
  // already given us the original src; if it has a filter or is SVG, we
  // expect the caller to have pre-baked it. For now, embed as PNG/JPEG.
  if (!n.src) return;
  if (n.src.startsWith('data:image/svg') || (n.isVectorSource && n.src.endsWith('.svg'))) {
    // Skip — should be pre-baked into raster-fallback before entering paintIR.
    // We log so the user can see what was missed.
    console.warn('[vector-export] inline SVG image skipped in PDF (use vector-export bake step)', n.src);
    return;
  }

  try {
    const fmt = n.src.includes('image/jpeg') || n.src.includes('image/jpg') ? 'JPEG' : 'PNG';
    doc.addImage(n.src, fmt, n.x, n.y, n.w, n.h);
  } catch (err) {
    console.warn('[vector-export] addImage failed', err);
  }
}

function paintRasterFallback(doc: jsPDFType, n: RasterFallbackNode): void {
  if (!n.pngDataUrl) return;
  try {
    doc.addImage(n.pngDataUrl, 'PNG', n.x, n.y, n.w, n.h);
  } catch (err) {
    console.warn('[vector-export] raster fallback addImage failed', err);
  }
}

// ── Pre-bake step ───────────────────────────────────────────

/**
 * Walks an IR and replaces any ImageNode that PDF can't embed natively
 * (SVG sources, CSS-filtered images) with a RasterFallbackNode at the
 * same coordinates. The raster is rendered at 4x the slide size for
 * print-quality output.
 */
async function prebakeImagesForPdf(ir: VectorIR): Promise<void> {
  for (let i = 0; i < ir.nodes.length; i++) {
    const node = ir.nodes[i];
    if (node.type !== 'image') continue;
    const needsBake =
      node.isVectorSource ||
      !!node.filter ||
      node.src.startsWith('data:image/svg') ||
      /\.svg($|\?)/i.test(node.src);
    if (!needsBake) continue;

    try {
      const png = await rasterizeImageNode(node);
      ir.nodes[i] = {
        type: 'raster-fallback',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        pngDataUrl: png,
        reason: node.isVectorSource ? 'svg-source-baked' : 'css-filter-baked',
      };
    } catch (err) {
      console.warn('[vector-export] image pre-bake failed', node.src, err);
    }
  }
}

async function rasterizeImageNode(node: ImageNode): Promise<string> {
  const scale = 4;
  const width = Math.max(1, Math.round(node.w * scale));
  const height = Math.max(1, Math.round(node.h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Load the image source
  const img = await loadImage(node.src);

  // Apply object-fit to compute draw rect
  const { dx, dy, dw, dh } = computeObjectFitRect(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    width,
    height,
    node.objectFit ?? 'fill',
  );

  ctx.drawImage(img, dx, dy, dw, dh);

  // Apply CSS filter via pixel manipulation (mirrors exportCapture's logic)
  if (node.filter) {
    applyFilterPixels(ctx, width, height, node.filter);
  }

  return canvas.toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${src.slice(0, 80)}`));
    img.src = src;
  });
}

function computeObjectFitRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  fit: 'cover' | 'contain' | 'fill' | 'none',
) {
  if (fit === 'fill' || !srcW || !srcH) return { dx: 0, dy: 0, dw: dstW, dh: dstH };
  if (fit === 'none') {
    return { dx: (dstW - srcW) / 2, dy: (dstH - srcH) / 2, dw: srcW, dh: srcH };
  }
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;
  let dw: number, dh: number;
  if (fit === 'contain' ? srcRatio > dstRatio : srcRatio < dstRatio) {
    dw = dstW;
    dh = dstW / srcRatio;
  } else {
    dh = dstH;
    dw = dstH * srcRatio;
  }
  return { dx: (dstW - dw) / 2, dy: (dstH - dh) / 2, dw, dh };
}

function applyFilterPixels(ctx: CanvasRenderingContext2D, w: number, h: number, filter: string): void {
  const f = filter.replace(/\s+/g, ' ').toLowerCase();
  const isInvertWhite = f.includes('brightness(0)') && f.includes('invert(1)');
  const isInvertBlack = f.includes('brightness(0)') && !f.includes('invert');
  const isGrayscale = f.includes('grayscale(1)');

  if (!isInvertWhite && !isInvertBlack && !isGrayscale) return;

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a === 0) continue;
    if (isInvertWhite) {
      px[i] = 255; px[i + 1] = 255; px[i + 2] = 255;
    } else if (isInvertBlack) {
      px[i] = 0; px[i + 1] = 0; px[i + 2] = 0;
    } else if (isGrayscale) {
      const lum = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
      px[i] = px[i + 1] = px[i + 2] = lum;
    }
  }
  ctx.putImageData(data, 0, 0);
}

function setOpacity(doc: jsPDFType, opacity: number): void {
  // jsPDF v4 supports GState for opacity
  try {
    const GState = (doc as any).GState;
    if (GState) {
      const gs = new GState({ opacity, 'stroke-opacity': opacity });
      (doc as any).setGState(gs);
    }
  } catch {
    /* ignore — opacity won't apply but the document still renders */
  }
}
