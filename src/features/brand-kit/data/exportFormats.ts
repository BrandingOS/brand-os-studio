/**
 * What "Download" offers, and in which words.
 *
 * One vocabulary for every card, tile, drilldown header and editor — the
 * reference kit's is the one people already understand: *For web* and *For
 * print* up front, the vector and the custom size behind the fold. Before
 * this every surface had its own verb and its own payload: the Logos header
 * gave twenty PNGs, the Logos card three SVGs, both called "Download".
 *
 * The formats a family can honour grow as its exporter lands (`exporters/`);
 * what it cannot honour yet is shown disabled with a reason, never hidden —
 * a menu that changes shape per card is a menu nobody learns.
 */
import type { KitEntry } from '../catalog/catalog';

export type DownloadFormat = 'png' | 'pdf' | 'svg' | 'jpg' | 'custom';

export type DownloadOption = {
  format: DownloadFormat;
  /** What the menu says. */
  label: string;
  /** The little format chip beside the label. */
  chip: string;
  /** Present when the option is offered but not yet available for this entry. */
  disabledReason?: string;
  /** Behind the "more" fold rather than in the primary pair. */
  secondary?: boolean;
};

/** A custom-size raster request — the reference's most-used affordance. */
export type CustomSize = {
  width: number;
  /** Absent = keep the deliverable's own aspect. */
  height?: number;
  /** Transparent padding around the artwork, in output pixels. */
  padding?: number;
  /** Hex, or 'transparent'. */
  background?: string;
  /** Crop away transparent margins before padding. */
  trim?: boolean;
};

/**
 * Families whose artwork is pure vector today (the brand's own assets).
 * Everything else is a DOM renderer and its SVG/vector PDF arrives with the
 * per-kind exporters; until then those options are visible and disabled.
 */
const VECTOR_NATIVE = new Set(['Logos', 'Colors', 'Icons']);

export function downloadOptionsFor(entry: KitEntry): DownloadOption[] {
  const vector = VECTOR_NATIVE.has(entry.storageLabel);
  return [
    { format: 'png', label: 'For web', chip: 'PNG' },
    { format: 'pdf', label: 'For print', chip: 'PDF' },
    {
      format: 'svg',
      label: 'Vector',
      chip: 'SVG',
      secondary: true,
      ...(vector ? {} : { disabledReason: 'Vector export for this design is coming soon' }),
    },
    { format: 'jpg', label: 'Flattened', chip: 'JPG', secondary: true },
    { format: 'custom', label: 'Custom size…', chip: 'PNG', secondary: true },
  ];
}

/** Turn a rendered PNG into a flattened JPG on a solid ground. */
export async function pngToJpg(png: Blob, background = '#ffffff', quality = 0.92): Promise<Blob> {
  const bitmap = await createImageBitmap(png);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('JPEG encode failed'))), 'image/jpeg', quality),
  );
}

/**
 * Resize a rendered PNG to a requested size, with trim / padding / ground.
 *
 * Trim reads the alpha channel for the artwork's bounding box; a design
 * with a painted background has no transparent margin and trims to itself,
 * which is the honest answer.
 */
export async function resizePng(png: Blob, size: CustomSize): Promise<Blob> {
  const bitmap = await createImageBitmap(png);
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (size.trim) {
    const probe = document.createElement('canvas');
    probe.width = bitmap.width;
    probe.height = bitmap.height;
    const pctx = probe.getContext('2d');
    if (pctx) {
      pctx.drawImage(bitmap, 0, 0);
      const { data, width, height } = pctx.getImageData(0, 0, probe.width, probe.height);
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (data[(y * width + x) * 4 + 3] > 8) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX >= minX && maxY >= minY) {
        sx = minX;
        sy = minY;
        sw = maxX - minX + 1;
        sh = maxY - minY + 1;
      }
    }
  }
  const pad = Math.max(0, size.padding ?? 0);
  const innerW = Math.max(1, Math.round(size.width) - pad * 2);
  const innerH = size.height
    ? Math.max(1, Math.round(size.height) - pad * 2)
    : Math.max(1, Math.round((innerW * sh) / sw));
  const canvas = document.createElement('canvas');
  canvas.width = innerW + pad * 2;
  canvas.height = innerH + pad * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  if (size.background && size.background !== 'transparent') {
    ctx.fillStyle = size.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // Fit inside the inner box, centred — a custom size is a frame, not a stretch.
  const scale = Math.min(innerW / sw, innerH / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, sw, sh, pad + (innerW - dw) / 2, pad + (innerH - dh) / 2, dw, dh);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png'),
  );
}

/**
 * Wrap a raster in a PDF page at the deliverable's physical size.
 *
 * Honest about what it is: a print-ready PAGE (correct paper size and
 * orientation, 300dpi-class raster) — not vector. The per-kind exporters
 * replace the raster with real text and shapes family by family; this is
 * what "For print" means until they do.
 */
export async function pngToPdf(
  png: Blob,
  page: { widthMm: number; heightMm: number } | 'fit',
): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const bitmap = await createImageBitmap(png);
  const ratio = bitmap.width / bitmap.height;
  bitmap.close();
  const size =
    page === 'fit'
      ? { widthMm: 200, heightMm: 200 / ratio }
      : page;
  const pdf = new jsPDF({
    unit: 'mm',
    format: [size.widthMm, size.heightMm],
    orientation: size.widthMm >= size.heightMm ? 'landscape' : 'portrait',
  });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(png);
  });
  // Fit the image on the page, centred, keeping its own ratio.
  const pageRatio = size.widthMm / size.heightMm;
  const w = ratio >= pageRatio ? size.widthMm : size.heightMm * ratio;
  const h = ratio >= pageRatio ? size.widthMm / ratio : size.heightMm;
  pdf.addImage(dataUrl, 'PNG', (size.widthMm - w) / 2, (size.heightMm - h) / 2, w, h, undefined, 'FAST');
  return pdf.output('blob') as Blob;
}

/** Physical page for "For print", by storage label. Absent = fit the image. */
export const PRINT_PAGE_MM: Record<string, { widthMm: number; heightMm: number }> = {
  'Business Card': { widthMm: 85, heightMm: 55 },
  Letterhead: { widthMm: 210, heightMm: 297 },
  Invoice: { widthMm: 210, heightMm: 297 },
  Envelope: { widthMm: 220, heightMm: 110 },
};
