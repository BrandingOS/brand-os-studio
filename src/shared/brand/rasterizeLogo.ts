// rasterizeLogo — turn any logo url (SVG / PNG / data: / remote) into a
// PNG data URL, contained inside a square canvas with padding, on a
// transparent (or given) ground. Used to hand a brand's logo to image
// models as a reference image, and anywhere else a bitmap twin of the
// vector is needed.
//
// Notes that bit us elsewhere and are handled here:
//   • SVGs with no intrinsic size draw as 0×0 — we set an explicit
//     width/height on the <img> before drawing (300×150 default is what
//     browsers assume) and fall back to a square.
//   • Remote images need `crossOrigin='anonymous'` or the canvas taints
//     and toDataURL throws; failure resolves to null, never throws.

export interface RasterizeOptions {
  /** Output square edge in px. Default 1024. */
  size?: number;
  /** Fraction of the edge kept as padding on each side. Default 0.1. */
  padding?: number;
  /** CSS color for the ground; omit for transparent. */
  background?: string;
  /** Test hook — defaults to `document.createElement('canvas')`. */
  createCanvas?: () => HTMLCanvasElement;
  /** Test hook — defaults to a real `Image` load. */
  loadImage?: (url: string) => Promise<HTMLImageElement>;
}

function defaultLoadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith('data:') && !url.startsWith('blob:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image failed to load'));
    img.src = url;
  });
}

export async function rasterizeLogo(url: string, opts: RasterizeOptions = {}): Promise<string | null> {
  const size = opts.size ?? 1024;
  const pad = Math.max(0, Math.min(0.4, opts.padding ?? 0.1));
  try {
    const img = await (opts.loadImage ?? defaultLoadImage)(url);
    let iw = img.naturalWidth || img.width || 0;
    let ih = img.naturalHeight || img.height || 0;
    if (iw <= 0 || ih <= 0) { iw = 300; ih = 150; img.width = iw; img.height = ih; }
    const canvas = (opts.createCanvas ?? (() => document.createElement('canvas')))();
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (opts.background) {
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, size, size);
    }
    const inner = size * (1 - pad * 2);
    const scale = Math.min(inner / iw, inner / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
