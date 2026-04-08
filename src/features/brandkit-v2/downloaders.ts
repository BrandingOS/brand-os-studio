/**
 * Brand Kit v2 — shared download helpers.
 *
 * These are the small functions called both from the per-asset
 * DownloadDialog flow AND from the bulk ZIP exporter, so they live in one
 * place rather than being duplicated.
 *
 * No off-limits paths — uses jsPDF directly the same way LogoFilesModule
 * already does.
 */
import type { Brand } from '@/shared/types/brand';
import type { LogoVariant } from '@/shared/color/brandRules';
import { hexToRgb } from './cmykApprox';

/** Trigger a browser download for any blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

/** Render a logo variant to a PNG blob at the given target pixel size. */
export async function rasterizeLogoVariant(variant: LogoVariant, sizePx: number): Promise<Blob> {
  if (!variant.logoSrc) throw new Error('Logo variant has no source image');
  const img = await loadImage(variant.logoSrc);
  const ratio = img.width / img.height;
  const padding = 0.2;

  let cw: number;
  let ch: number;
  if (ratio >= 1) {
    cw = sizePx;
    ch = Math.round((sizePx / ratio) * (1 + padding * 2));
  } else {
    ch = sizePx;
    cw = Math.round(sizePx * ratio * (1 + padding * 2));
  }

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  if (variant.bgColor && variant.bgColor !== 'transparent') {
    ctx.fillStyle = variant.bgColor;
    ctx.fillRect(0, 0, cw, ch);
  }

  if (variant.logoFilter) ctx.filter = variant.logoFilter;
  const innerW = cw * (1 - padding);
  const innerH = ch * (1 - padding);
  let lw: number;
  let lh: number;
  if (innerW / innerH > ratio) {
    lh = innerH;
    lw = innerH * ratio;
  } else {
    lw = innerW;
    lh = innerW / ratio;
  }
  ctx.drawImage(img, (cw - lw) / 2, (ch - lh) / 2, lw, lh);
  ctx.filter = 'none';

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), 'image/png'),
  );
}

/** Fetch a true SVG document if the source is a remote .svg file. */
export async function fetchSvgIfPossible(url: string): Promise<string | null> {
  if (!url || url.startsWith('data:')) return null;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const text = await resp.text();
    if (!text.includes('<svg')) return null;
    return text;
  } catch {
    return null;
  }
}

/** Build a simple single-page PDF for a logo variant (mirrors LogoFilesModule). */
export async function buildLogoPdf(variant: LogoVariant, brand: Brand): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');

  const img = await loadImage(variant.logoSrc);
  const logoRatio = img.width / img.height;
  const pdfW = 300;
  const pdfH = logoRatio > 1.5 ? (pdfW / logoRatio) * 1.5 : pdfW;
  const pdf = new jsPDF({
    orientation: logoRatio > 1.2 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pdfW, pdfH],
  });

  // Background
  if (variant.bgColor !== 'transparent') {
    const rgb = hexToRgb(variant.bgColor);
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
    pdf.rect(0, 0, pdfW, pdfH, 'F');
  }

  // High-res rasterized logo for embedding
  const canvasSize = 4000;
  const cRatio = img.width / img.height;
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = Math.round(canvasSize / cRatio);
  const ctx = canvas.getContext('2d')!;
  if (variant.logoFilter) ctx.filter = variant.logoFilter;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';

  const logoW = pdfW * 0.5;
  const logoH = logoW / cRatio;
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pdfW - logoW) / 2, (pdfH - logoH) / 2, logoW, logoH);

  // Footer
  pdf.setFontSize(6);
  pdf.setTextColor(150);
  pdf.text(`${brand.name} — ${variant.name}`, 8, pdfH - 8);
  pdf.text(variant.recommendedUse, 8, pdfH - 4);

  return pdf.output('blob');
}
