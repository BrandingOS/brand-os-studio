import { toast } from 'sonner';
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

/** Async logo signal for images whose filename doesn't say "logo": a raster
 *  with a meaningfully transparent background is almost always a logo, not a
 *  photo or a palette image. JPEGs can't carry alpha, so skip them. */
export async function imageFileHasAlpha(file: File): Promise<boolean> {
  if (file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)) return false;
  if (!(file.type.startsWith('image/') || /\.(png|webp|gif)$/i.test(file.name))) return false;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const w = 64;
    const h = 64;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    let transparent = 0;
    const total = data.length / 4;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 200) transparent++;
    }
    return transparent / total > 0.05;
  } catch {
    return false;
  } finally {
    URL.revokeObjectURL(url);
  }
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
  /** Read current assets from store — enables same-content duplicate rejection. */
  getAssets?: () => OnboardingAsset[];
  addAsset: (a: OnboardingAsset) => void;
  updateAssetProgress: (id: string, pct: number) => void;
  markAssetDone: (id: string, previewUrl?: string | null) => void;
}

/* ------------------------------------------------------------------ *
 * Duplicate rejection — same file content never enters twice
 * ------------------------------------------------------------------ */

/** Fingerprint a file by its bytes (SHA-256). Renamed copies of the same
 *  image produce the same hash. Falls back to a name+size+mtime key when
 *  WebCrypto is unavailable (non-secure contexts). */
export async function hashFile(file: File): Promise<string> {
  try {
    if (crypto?.subtle?.digest) {
      const buf = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    /* fall through to metadata key */
  }
  return `meta:${file.name}:${file.size}:${file.lastModified ?? 0}`;
}

// Re-dropping a whole folder can reject many files at once — collapse the
// rejections into one toast instead of a toast per file.
let dupNames: string[] = [];
let dupFlush: ReturnType<typeof setTimeout> | null = null;
function notifyDuplicate(name: string) {
  dupNames.push(name);
  if (dupFlush) clearTimeout(dupFlush);
  dupFlush = setTimeout(() => {
    const names = dupNames;
    dupNames = [];
    dupFlush = null;
    if (names.length === 1) {
      toast.info(`"${names[0]}" is already uploaded — skipped the duplicate.`);
    } else {
      toast.info(`Skipped ${names.length} duplicate files — they're already uploaded.`);
    }
  }, 600);
}

/** Queue a single file with smart routing. ZIPs are extracted and each entry is queued.
 *  Returns the parent asset id (or null if hit the limit). */
/* ------------------------------------------------------------------ *
 * Folder drops — walk dropped directories and take everything inside
 * ------------------------------------------------------------------ */

/** Extensions the dropzone accepts (mirrors its file-picker `accept`). */
const SUPPORTED_UPLOAD = /\.(png|jpe?g|gif|webp|avif|bmp|svg|pdf|ai|sketch|fig|psd|zip|otf|ttf|woff2?|eot)$/i;

const isJunkName = (name: string) => name.startsWith('.') || name === '__MACOSX';

/**
 * Resolve a drop's DataTransfer into a flat list of Files — folders are
 * walked recursively so dropping a whole brand folder "just works".
 *
 * NOTE: the DataTransferItem entries MUST be captured synchronously (the
 * list is neutered once the drop handler yields), which is why the entry
 * extraction happens before any `await`.
 */
export async function collectDroppedFiles(dt: DataTransfer): Promise<File[]> {
  const entries: FileSystemEntry[] = [];
  const plainFiles: File[] = [];
  if (dt.items) {
    for (const item of Array.from(dt.items)) {
      if (item.kind !== 'file') continue;
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        entries.push(entry);
      } else {
        const f = item.getAsFile();
        if (f) plainFiles.push(f);
      }
    }
  }
  // No entry API (old browser / synthetic drop) — fall back to the flat list.
  if (entries.length === 0 && plainFiles.length === 0) {
    return Array.from(dt.files ?? []);
  }

  const collected: Array<{ path: string; file: File }> = [];
  const walk = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (isJunkName(entry.name)) return;
    if (entry.isFile) {
      const file = await new Promise<File | null>((resolve) =>
        (entry as FileSystemFileEntry).file(resolve, () => resolve(null)),
      );
      if (file && !isJunkName(file.name) && SUPPORTED_UPLOAD.test(file.name)) {
        collected.push({ path: `${prefix}${file.name}`, file });
      }
      return;
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      // readEntries returns results in batches — keep calling until empty.
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve) =>
          reader.readEntries(resolve, () => resolve([])),
        );
        if (batch.length === 0) break;
        for (const child of batch) {
          await walk(child, `${prefix}${entry.name}/`);
        }
      }
    }
  };
  for (const entry of entries) {
    await walk(entry, '');
  }
  collected.sort((a, b) => a.path.localeCompare(b.path));
  return [...plainFiles, ...collected.map((c) => c.file)];
}

/** Filter a folder-picker FileList (webkitdirectory) the same way a folder
 *  drop is filtered — junk segments out, supported extensions only. */
export function filterFolderPick(list: FileList): File[] {
  return Array.from(list).filter((f) => {
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    if (rel.split('/').some(isJunkName)) return false;
    return SUPPORTED_UPLOAD.test(f.name);
  });
}

// Multi-file batches (drop 5 files at once) used to classify in parallel,
// so whichever image DECODED first entered the asset list first — the
// palette image could beat the logo and the slot auto-router keyed off
// that order. Chain the calls so files enter in the order they were given.
let enqueueChain: Promise<unknown> = Promise.resolve();
export function enqueueFile(file: File, deps: QueueDeps): Promise<string | null> {
  const run = enqueueChain.then(() => enqueueFileInner(file, deps));
  enqueueChain = run.catch(() => null);
  return run;
}

/** Per-image upload cap (brand-asset images). */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

async function enqueueFileInner(file: File, deps: QueueDeps): Promise<string | null> {
  if (deps.getCount() >= deps.max) return null;

  const isImageFile =
    file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(file.name);
  if (isImageFile && file.size > MAX_IMAGE_BYTES) {
    toast.error(`"${file.name}" is larger than 10 MB — images are capped at 10 MB each.`);
    return null;
  }

  // Same content already in the list (even under a different name) → reject.
  // The enqueue chain serializes calls, so a multi-file drop that contains
  // the same image twice dedupes against itself too.
  const contentHash = await hashFile(file);
  if (deps.getAssets?.().some((a) => a.contentHash === contentHash)) {
    notifyDuplicate(file.name);
    return null;
  }

  const isZip = /zip/.test(file.type) || /\.zip$/i.test(file.name);
  if (isZip) {
    return enqueueZip(file, deps, contentHash);
  }

  const asset = buildAsset(file);
  asset.contentHash = contentHash;
  // Filename-based detection misses logos named "Frame 1.png" etc. — a
  // transparent background is a much stronger signal, so check it too.
  if (asset.kind === 'image' && !asset.isLogo) {
    try {
      if (await imageFileHasAlpha(file)) asset.isLogo = true;
    } catch {
      /* keep as plain image */
    }
  }
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
  // Brand Vision: our trained model refines kind/isLogo/logoSlot async.
  // Non-blocking — the heuristics above give the instant first guess and
  // remain the answer if the service isn't running.
  if (asset.kind === 'image') {
    import('../services/brandVision')
      .then(({ classifyAndRoute }) => classifyAndRoute(asset.id, file))
      .catch(() => {});
  }
  return asset.id;
}

async function enqueueZip(zipFile: File, deps: QueueDeps, contentHash?: string): Promise<string | null> {
  const parent = buildAsset(zipFile);
  parent.contentHash = contentHash;
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
      // Direct inner call — the zip itself already sits in the chain, so
      // routing entries through the public wrapper would deadlock.
      await enqueueFileInner(asFile, deps);
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

function rgbToHueSat(r: number, g: number, b: number): { hue: number; sat: number } {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const d = max - min;
  let hue = 0;
  if (d > 0) {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    if (max === rn) hue = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) hue = ((bn - rn) / d + 2) * 60;
    else hue = ((rn - gn) / d + 4) * 60;
  }
  const sat = max === 0 ? 0 : d / max;
  return { hue, sat };
}

/** Extract up to `count` dominant colors from an image URL.
 *
 *  Quantizes to a coarse RGB bucket and sorts by frequency. Unlike the
 *  old version, deliberate white/black/grey palette swatches ARE included:
 *  a neutral makes the cut when it covers a meaningful share of the image
 *  (8–60%) — below that it's antialiasing noise, above it it's almost
 *  certainly a background (e.g. a logo on a white canvas). Same-hue
 *  chromatic picks are merged so a red palette doesn't come back as two
 *  slightly different reds. */
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
        let opaque = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 200) continue;
          opaque++;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const key = `${Math.floor(r / bucketSize)},${Math.floor(g / bucketSize)},${Math.floor(b / bucketSize)}`;
          const cur = buckets.get(key);
          if (cur) {
            cur.r += r; cur.g += g; cur.b += b; cur.n += 1;
          } else {
            buckets.set(key, { r, g, b, n: 1 });
          }
        }
        if (opaque === 0) return resolve([]);

        const sorted = Array.from(buckets.values()).sort((a, b) => b.n - a.n);
        const picks: Array<{ r: number; g: number; b: number; hue: number; sat: number }> = [];
        for (const e of sorted) {
          const r = Math.round(e.r / e.n);
          const g = Math.round(e.g / e.n);
          const b = Math.round(e.b / e.n);
          const share = e.n / opaque;
          const spread = Math.max(r, g, b) - Math.min(r, g, b);
          const isNeutral = spread < 14;

          if (isNeutral) {
            // Deliberate neutral swatches occupy a real share of a palette
            // image; tiny shares are edge noise, huge shares are backgrounds.
            if (share < 0.08 || share > 0.6) continue;
          } else if (share < 0.02) {
            continue;
          }

          const { hue, sat } = rgbToHueSat(r, g, b);
          const dupe = picks.some((p) => {
            const dist2 = (p.r - r) ** 2 + (p.g - g) ** 2 + (p.b - b) ** 2;
            if (dist2 <= 40 * 40) return true;
            // Same-hue chromatic pair (a swatch + its antialiased blend with
            // the background) collapses into the more frequent one.
            if (sat > 0.15 && p.sat > 0.15) {
              const dh = Math.abs(p.hue - hue);
              return Math.min(dh, 360 - dh) < 18;
            }
            return false;
          });
          if (dupe) continue;

          picks.push({ r, g, b, hue, sat });
          if (picks.length >= count) break;
        }
        // Chromatic colors first (they become primary/secondary downstream),
        // neutrals after — stable within each group by frequency.
        picks.sort((a, b) => Number(b.sat > 0.15) - Number(a.sat > 0.15));
        resolve(
          picks.map(
            (p) =>
              '#' +
              [p.r, p.g, p.b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase(),
          ),
        );
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });
}
