/**
 * Favicon generator — produces a sequence of PNG sizes plus an ICO file
 * from a single source logo image.
 *
 * No external library — uses <canvas> for resizing and a small Uint8Array
 * builder for the ICO container (BMP-stored PNG entries).
 */

export const FAVICON_SIZES = [16, 32, 48, 64, 128, 256, 512] as const;
export type FaviconSize = (typeof FAVICON_SIZES)[number];

export interface FaviconAsset {
  size: FaviconSize;
  blob: Blob;
  dataUrl: string;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function renderToCanvas(img: HTMLImageElement, size: number, padPct = 0.1): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');

  // Transparent background; fit logo with padding while preserving aspect ratio
  const pad = Math.round(size * padPct);
  const inner = size - pad * 2;
  const ratio = img.width / img.height;
  let w: number, h: number;
  if (ratio >= 1) {
    w = inner;
    h = inner / ratio;
  } else {
    h = inner;
    w = inner * ratio;
  }
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x, y, w, h);
  return canvas;
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas blob failed'))), 'image/png');
  });
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}

/**
 * Build a Windows ICO file containing PNG-encoded entries for the given
 * icon sizes. ICO format reference: https://en.wikipedia.org/wiki/ICO_(file_format)
 *
 * Each entry: 16-byte directory record + the raw PNG data.
 */
export async function buildIco(sizes: Array<{ size: number; pngBlob: Blob }>): Promise<Blob> {
  const entries = await Promise.all(
    sizes.map(async ({ size, pngBlob }) => ({
      size,
      data: new Uint8Array(await blobToArrayBuffer(pngBlob)),
    })),
  );

  // Header: 6 bytes (reserved=0, type=1 ICO, count)
  const header = new Uint8Array(6);
  const headerView = new DataView(header.buffer);
  headerView.setUint16(0, 0, true); // reserved
  headerView.setUint16(2, 1, true); // type ICO
  headerView.setUint16(4, entries.length, true); // count

  // Directory: 16 bytes per entry
  const dir = new Uint8Array(entries.length * 16);
  const dirView = new DataView(dir.buffer);
  let offset = 6 + entries.length * 16;

  entries.forEach((e, i) => {
    const base = i * 16;
    dirView.setUint8(base + 0, e.size === 256 ? 0 : e.size); // width (0 means 256)
    dirView.setUint8(base + 1, e.size === 256 ? 0 : e.size); // height
    dirView.setUint8(base + 2, 0); // color count
    dirView.setUint8(base + 3, 0); // reserved
    dirView.setUint16(base + 4, 1, true); // color planes
    dirView.setUint16(base + 6, 32, true); // bits per pixel
    dirView.setUint32(base + 8, e.data.length, true); // size in bytes
    dirView.setUint32(base + 12, offset, true); // offset to image data
    offset += e.data.length;
  });

  // Concatenate everything
  const total = 6 + dir.length + entries.reduce((s, e) => s + e.data.length, 0);
  const out = new Uint8Array(total);
  out.set(header, 0);
  out.set(dir, 6);
  let cursor = 6 + dir.length;
  for (const e of entries) {
    out.set(e.data, cursor);
    cursor += e.data.length;
  }
  return new Blob([out], { type: 'image/x-icon' });
}

/**
 * Generate the full favicon set from a logo URL.
 * Returns the array of PNG variants. Pair with `buildIco()` for the .ico.
 */
export async function generateFavicons(logoUrl: string): Promise<FaviconAsset[]> {
  if (!logoUrl) return [];
  const img = await loadImage(logoUrl);
  const out: FaviconAsset[] = [];
  for (const size of FAVICON_SIZES) {
    const canvas = renderToCanvas(img, size);
    const blob = await canvasToBlob(canvas);
    out.push({ size, blob, dataUrl: canvas.toDataURL('image/png') });
  }
  return out;
}

export async function generateIcoFromFavicons(favicons: FaviconAsset[]): Promise<Blob | null> {
  // ICO traditionally bundles 16/32/48 (sometimes 64). Use what we have.
  const wanted = [16, 32, 48, 64];
  const matched = favicons.filter((f) => wanted.includes(f.size));
  if (matched.length === 0) return null;
  return buildIco(matched.map((f) => ({ size: f.size, pngBlob: f.blob })));
}
