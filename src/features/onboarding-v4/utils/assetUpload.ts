import type { OnboardingAsset } from '../types';
import { formatSize, iconForMime } from './assetIcons';

const LOGO_FILENAME = /(?:^|[\s_\-/.])(?:logo|wordmark|brand[-_ ]?mark|monogram|emblem|mark)(?:[\s_\-/.]|$)/i;

export function genId(): string {
  return typeof crypto?.randomUUID === 'function' ? `a-${crypto.randomUUID()}` : `a-${Math.random().toString(36).slice(2, 11)}`;
}

export function looksLikeLogo(file: File): boolean {
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) return true;
  if (LOGO_FILENAME.test(file.name)) return true;
  return false;
}

function extOf(name: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name);
  return m ? m[1].toLowerCase() : '';
}

function refineKindByExtension(file: File): OnboardingAsset['kind'] {
  const ext = extOf(file.name);
  if (['otf', 'ttf', 'woff', 'woff2', 'eot'].includes(ext)) return 'font';
  if (['ai', 'sketch', 'fig', 'psd'].includes(ext)) return 'design';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'zip') return 'zip';
  if (ext === 'svg') return 'image';
  return iconForMime(file.type);
}

export function buildAsset(file: File): OnboardingAsset {
  const kind = refineKindByExtension(file);
  const ext = extOf(file.name);
  const sub = `${(ext || file.type.split('/').pop() || 'FILE').toUpperCase()} · ${formatSize(file.size)}`;
  return {
    id: genId(),
    name: file.name,
    sub,
    kind,
    previewUrl: null,
    uploadStatus: 'uploading',
    uploadProgress: 0,
    isLogo: kind === 'image' && looksLikeLogo(file),
    _file: file,
  };
}

export function simulateUpload(onProgress: (pct: number) => void, onDone: () => void) {
  const start = performance.now();
  const duration = 700 + Math.random() * 600;
  function step(now: number) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 2.2);
    onProgress(eased);
    if (p < 1) requestAnimationFrame(step);
    else onDone();
  }
  requestAnimationFrame(step);
}

export interface QueueDeps {
  /** Maximum total assets allowed. */
  max: number;
  /** Read current asset count from store at time of call. */
  getCount: () => number;
  addAsset: (a: OnboardingAsset) => void;
  updateAssetProgress: (id: string, pct: number) => void;
  markAssetDone: (id: string, previewUrl?: string | null) => void;
}

/** Queue a single file with smart routing. ZIPs are extracted and each entry is queued.
 *  Returns the parent asset id (or null if hit the limit). */
export async function enqueueFile(file: File, deps: QueueDeps): Promise<string | null> {
  if (deps.getCount() >= deps.max) return null;

  const isZip = /zip/.test(file.type) || /\.zip$/i.test(file.name);
  if (isZip) {
    return enqueueZip(file, deps);
  }

  const asset = buildAsset(file);
  let previewUrl: string | null = null;
  if (asset.kind === 'image') {
    // Some platforms hand us a File with empty `type` for SVGs — fall back
    // to a typed Blob so the preview <img> can render it.
    const ext = (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] || '').toLowerCase();
    const needsTypeFix = !file.type && ext === 'svg';
    const source = needsTypeFix ? new Blob([file], { type: 'image/svg+xml' }) : file;
    previewUrl = URL.createObjectURL(source);
  }
  deps.addAsset(asset);
  simulateUpload(
    (p) => deps.updateAssetProgress(asset.id, p),
    () => deps.markAssetDone(asset.id, previewUrl)
  );
  return asset.id;
}

async function enqueueZip(zipFile: File, deps: QueueDeps): Promise<string | null> {
  const parent = buildAsset(zipFile);
  deps.addAsset(parent);
  // Mark parent as done quickly — the heavy work is per-entry below.
  simulateUpload(
    (p) => deps.updateAssetProgress(parent.id, p),
    () => deps.markAssetDone(parent.id)
  );

  try {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(zipFile);
    const entries: Array<{ path: string; entry: typeof zip.files[string] }> = [];
    zip.forEach((path, entry) => {
      if (entry.dir) return;
      // Skip macOS junk + hidden
      if (/(^|\/)\._/.test(path) || /(^|\/)\.DS_Store$/.test(path) || /^__MACOSX\//.test(path)) return;
      entries.push({ path, entry });
    });

    for (const { path, entry } of entries) {
      if (deps.getCount() >= deps.max) break;
      const blob = await entry.async('blob');
      const name = path.split('/').pop() || path;
      const ext = extOf(name);
      const guessedType = guessMimeFromExt(ext) || blob.type || '';
      const asFile = new File([blob], name, { type: guessedType });
      await enqueueFile(asFile, deps);
    }
  } catch (err) {
    console.warn('ZIP extraction failed', err);
  }
  return parent.id;
}

function guessMimeFromExt(ext: string): string {
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'pdf': return 'application/pdf';
    case 'otf': return 'font/otf';
    case 'ttf': return 'font/ttf';
    case 'woff': return 'font/woff';
    case 'woff2': return 'font/woff2';
    case 'eot': return 'application/vnd.ms-fontobject';
    case 'zip': return 'application/zip';
    case 'mp4': return 'video/mp4';
    case 'mov': return 'video/quicktime';
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    default: return '';
  }
}

/* ------------------------------------------------------------------ *
 * SVG recolor — generate B&W variants from a primary SVG logo
 * ------------------------------------------------------------------ */

/** Recolor every visible fill/stroke in an SVG document to a single target color.
 *  Preserves `fill="none"`/`stroke="none"` so cutouts stay transparent. */
export function recolorSvgString(svgText: string, color: string): string {
  let out = svgText;
  out = out.replace(/fill="([^"]*)"/gi, (m, val) =>
    val.trim().toLowerCase() === 'none' ? m : `fill="${color}"`
  );
  out = out.replace(/stroke="([^"]*)"/gi, (m, val) =>
    val.trim().toLowerCase() === 'none' ? m : `stroke="${color}"`
  );
  out = out.replace(/(fill\s*:\s*)([^;"\}]+)/gi, (m, p, val) =>
    val.trim().toLowerCase() === 'none' ? m : `${p}${color}`
  );
  out = out.replace(/(stroke\s*:\s*)([^;"\}]+)/gi, (m, p, val) =>
    val.trim().toLowerCase() === 'none' ? m : `${p}${color}`
  );
  // Many SVGs rely on the default fill (currentColor or black). Inject a wrapper
  // attribute on the root <svg> to make orphan paths follow the new color too.
  out = out.replace(
    /<svg\b([^>]*)>/i,
    (m, attrs) => {
      const cleaned = String(attrs).replace(/\s(?:fill|color)="[^"]*"/gi, '');
      return `<svg${cleaned} fill="${color}" color="${color}">`;
    }
  );
  return out;
}

export async function svgFileToVariants(file: File): Promise<{ light: File; dark: File } | null> {
  try {
    const text = await file.text();
    const black = recolorSvgString(text, '#000000');
    const white = recolorSvgString(text, '#FFFFFF');
    const baseName = file.name.replace(/\.svg$/i, '');
    const lightFile = new File([black], `${baseName}-on-light.svg`, { type: 'image/svg+xml' });
    const darkFile = new File([white], `${baseName}-on-dark.svg`, { type: 'image/svg+xml' });
    return { light: lightFile, dark: darkFile };
  } catch {
    return null;
  }
}

/** Build B&W variants from a raster (PNG/JPG) logo using a canvas. Works best
 *  with PNGs that have a transparent background — alpha is used as the logo
 *  mask. For opaque rasters, falls back to luminance-thresholding so we still
 *  produce something usable. */
export async function rasterFileToVariants(file: File): Promise<{ light: File; dark: File } | null> {
  if (!file.type.startsWith('image/')) return null;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Decide: alpha-based or luminance-based mask?
    let alphaSamples = 0;
    let alphaTransparent = 0;
    const total = imageData.data.length / 4;
    const stride = Math.max(1, Math.floor(total / 4096));
    for (let i = 0; i < imageData.data.length; i += 4 * stride) {
      alphaSamples++;
      if (imageData.data[i + 3] < 200) alphaTransparent++;
    }
    const useAlpha = alphaSamples > 0 && alphaTransparent / alphaSamples > 0.05;

    const black = makeMaskedVariant(imageData, '#000', useAlpha);
    const white = makeMaskedVariant(imageData, '#fff', useAlpha);

    const baseName = file.name.replace(/\.(png|jpg|jpeg|webp|gif|bmp)$/i, '');
    const lightFile = await dataUrlToFile(black, `${baseName}-on-light.png`);
    const darkFile = await dataUrlToFile(white, `${baseName}-on-dark.png`);
    return { light: lightFile, dark: darkFile };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

function makeMaskedVariant(source: ImageData, fill: '#000' | '#fff', useAlpha: boolean): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const out = ctx.createImageData(source.width, source.height);
  const fillR = fill === '#000' ? 0 : 255;
  const fillG = fillR;
  const fillB = fillR;
  for (let i = 0; i < source.data.length; i += 4) {
    const r = source.data[i];
    const g = source.data[i + 1];
    const b = source.data[i + 2];
    const a = source.data[i + 3];
    let isLogoPixel: boolean;
    if (useAlpha) {
      isLogoPixel = a >= 32;
    } else {
      // Approx luminance — treat darker pixels as the logo mark on a light page
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      isLogoPixel = lum < 200 && a >= 200;
    }
    if (isLogoPixel) {
      out.data[i] = fillR;
      out.data[i + 1] = fillG;
      out.data[i + 2] = fillB;
      out.data[i + 3] = useAlpha ? a : 255;
    } else {
      // Transparent — let the slot's background show through
      out.data[i] = 0;
      out.data[i + 1] = 0;
      out.data[i + 2] = 0;
      out.data[i + 3] = 0;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL('image/png');
}

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name, { type: 'image/png' });
}

/** Probe an image file's intrinsic aspect ratio. Used by the slot router
 *  to bias square-ish uploads to the symbol slot and wide ones to primary. */
export async function imageAspectRatio(file: File): Promise<number | null> {
  if (!file.type.startsWith('image/')) return null;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    return w / h;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ------------------------------------------------------------------ *
 * Color extraction
 * ------------------------------------------------------------------ */

export function normalizeHex(input: string): string | null {
  const v = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(v)) {
    return `#${v.split('').map((c) => c + c).join('').toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toUpperCase()}`;
  return null;
}

/** Extract up to `count` dominant colors from an image URL. Quantizes to a coarse RGB
 *  bucket, sorts by frequency, filters near-grayscale dups. */
export async function extractDominantColors(src: string, count = 4): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = 64;
        const h = 64;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve([]);
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
        const bucketSize = 24;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 200) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Skip near-white and near-black
          if (r > 240 && g > 240 && b > 240) continue;
          if (r < 18 && g < 18 && b < 18) continue;
          const key = `${Math.floor(r / bucketSize)},${Math.floor(g / bucketSize)},${Math.floor(b / bucketSize)}`;
          const cur = buckets.get(key);
          if (cur) {
            cur.r += r; cur.g += g; cur.b += b; cur.n += 1;
          } else {
            buckets.set(key, { r, g, b, n: 1 });
          }
        }
        const sorted = Array.from(buckets.values()).sort((a, b) => b.n - a.n);
        const picks: string[] = [];
        for (const e of sorted) {
          const r = Math.round(e.r / e.n);
          const g = Math.round(e.g / e.n);
          const b = Math.round(e.b / e.n);
          // Filter near-greys
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (max - min < 14) continue;
          const hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
          if (!picks.includes(hex)) picks.push(hex);
          if (picks.length >= count) break;
        }
        resolve(picks);
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });
}
