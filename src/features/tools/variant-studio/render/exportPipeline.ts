/**
 * exportPipeline — turn a rendered SVG into the user's chosen output.
 *
 * Uses ONLY browser-native APIs (Blob, Image, canvas) plus the existing
 * `jspdf` and `jszip` packages already in the repo. Deliberately does
 * NOT touch `src/shared/services/export/vectorize/*` — that pipeline is
 * tagged stable/editable-export-v1 and off-limits.
 *
 * Surface area:
 *   - exportSingle(spec, svg, opts)  → triggers a single download
 *   - exportKit(specs, render, opts) → ZIP bundle of all variants
 */
import type { ExportFormat, ExportDensity, VariantSpec } from '../engine/types';

const BASE_PX = 1024;

export interface ExportSingleOptions {
  format: ExportFormat;
  density?: ExportDensity;
  filename: string;
}

export async function exportSingle(svg: string, opts: ExportSingleOptions): Promise<Blob> {
  if (opts.format === 'svg') {
    return new Blob([svg], { type: 'image/svg+xml' });
  }
  if (opts.format === 'png' || opts.format === 'jpg' || opts.format === 'webp') {
    return await rasterize(svg, opts.format, opts.density ?? 1);
  }
  if (opts.format === 'pdf') {
    return await svgToPdf(svg);
  }
  throw new Error(`Unsupported export format: ${opts.format}`);
}

async function rasterize(svg: string, format: 'png' | 'jpg' | 'webp', density: ExportDensity): Promise<Blob> {
  const targetW = BASE_PX * density;
  const targetH = BASE_PX * density;
  const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = await loadImage(blobUrl);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    // Preserve aspect ratio inside the target box.
    const aspect = img.naturalWidth / img.naturalHeight;
    let dw = targetW;
    let dh = targetW / aspect;
    if (dh > targetH) {
      dh = targetH;
      dw = targetH * aspect;
    }
    const dx = (targetW - dw) / 2;
    const dy = (targetH - dh) / 2;
    if (format === 'jpg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    const mime = format === 'png' ? 'image/png' : format === 'jpg' ? 'image/jpeg' : 'image/webp';
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), mime, 0.95),
    );
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function svgToPdf(svg: string): Promise<Blob> {
  // Lazy import jsPDF — already in the repo, used by other exporters.
  const { jsPDF } = await import('jspdf');
  // Rasterize to PNG first; embedding raster in PDF is the most reliable
  // path that works for arbitrary SVG content (gradients, filters, etc.).
  const png = await rasterize(svg, 'png', 2);
  const dataUrl = await blobToDataUrl(png);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [BASE_PX, BASE_PX] });
  doc.addImage(dataUrl, 'PNG', 0, 0, BASE_PX, BASE_PX);
  return doc.output('blob');
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Bulk kit export ───────────────────────────────────────────

export interface KitItem {
  spec: VariantSpec;
  svg: string;
  filename: string;
}

export async function exportKit(items: KitItem[], kitName: string): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const item of items) {
    // Each variant gets SVG + PNG @1x + PNG @2x in the kit.
    zip.file(`${item.filename}.svg`, item.svg);
    const png1 = await rasterize(item.svg, 'png', 1);
    zip.file(`${item.filename}.png`, png1);
    const png2 = await rasterize(item.svg, 'png', 2);
    zip.file(`${item.filename}@2x.png`, png2);
  }
  zip.file(
    'README.txt',
    `${kitName}\n\nGenerated with BrandOS Logo Variant Studio.\nIncludes ${items.length} variants in SVG and PNG (1x and 2x).\n`,
  );
  return zip.generateAsync({ type: 'blob' });
}

// ─── Filename derivation ───────────────────────────────────────

export function deriveFilename(brandSlug: string, spec: VariantSpec): string {
  const parts = [
    brandSlug,
    spec.composition,
    spec.layout,
    spec.colorMode,
    spec.background.kind,
  ].map((s) => s.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  return parts.filter(Boolean).join('-');
}
