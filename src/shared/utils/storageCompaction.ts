/**
 * One-shot repair for browsers whose localStorage filled up with oversized
 * brand logos.
 *
 * Brands created before the onboarding switched to lean logo tiles carry
 * ~150-200 KB data URLs per slot, so a handful of brands could consume the
 * whole ~5 MB budget and block every later write. This re-encodes those
 * stored images at tile resolution in place: the brands, their slots and
 * their artwork all survive — they just stop hogging the quota.
 */
import { freeDisposableStorage, measureLocalStorage } from './storageCleanup';

const BRANDS_KEY = 'brandos:brands';
const DONE_FLAG = 'brandos:storage-compacted-v1';
/** Anything smaller than this is already tile-sized — leave it alone. */
const RECOMPRESS_ABOVE_BYTES = 30_000;
const TILE_MAX_DIMENSION = 380;
const TILE_QUALITY = 0.72;

export interface CompactionResult {
  ranCompaction: boolean;
  freedKB: number;
  imagesShrunk: number;
  beforeKB: number;
  afterKB: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });
}

/** Re-encode one stored data URL at tile size. Returns null if not worth it. */
async function shrinkDataUrl(dataUrl: string): Promise<string | null> {
  if (!dataUrl.startsWith('data:image/')) return null;
  // Vectors are already tiny and lossless — never rasterize them.
  if (dataUrl.startsWith('data:image/svg')) return null;
  if (dataUrl.length < RECOMPRESS_ABOVE_BYTES) return null;

  try {
    const img = await loadImage(dataUrl);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const scale = Math.min(1, TILE_MAX_DIMENSION / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Transparency must survive (a logo flattened onto black is ruined), so
    // only genuinely opaque artwork is re-encoded as JPEG — which is where
    // the real savings are, since PNG barely shrinks on detailed images.
    let hasAlpha = false;
    try {
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 250) { hasAlpha = true; break; }
      }
    } catch {
      hasAlpha = true; // can't tell → assume transparency and keep PNG
    }

    const next = hasAlpha
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', TILE_QUALITY);
    return next.length < dataUrl.length ? next : null;
  } catch {
    return null;
  }
}

/**
 * Shrink oversized logos already sitting in localStorage.
 * Safe to call repeatedly — it only touches images above the threshold.
 */
export async function compactStoredBrandLogos(): Promise<CompactionResult> {
  const before = measureLocalStorage().totalKB;
  let imagesShrunk = 0;

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(BRANDS_KEY);
  } catch {
    return { ranCompaction: false, freedKB: 0, imagesShrunk: 0, beforeKB: before, afterKB: before };
  }
  if (!raw) {
    return { ranCompaction: false, freedKB: 0, imagesShrunk: 0, beforeKB: before, afterKB: before };
  }

  let brands: Array<Record<string, unknown>>;
  try {
    brands = JSON.parse(raw);
    if (!Array.isArray(brands)) throw new Error('not a list');
  } catch {
    return { ranCompaction: false, freedKB: 0, imagesShrunk: 0, beforeKB: before, afterKB: before };
  }

  for (const brand of brands) {
    if (typeof brand?.logo === 'string') {
      const next = await shrinkDataUrl(brand.logo);
      if (next) {
        brand.logo = next;
        imagesShrunk++;
      }
    }
    const slots = brand?.logoAssets as Record<string, unknown> | undefined;
    if (slots && typeof slots === 'object') {
      for (const [slot, value] of Object.entries(slots)) {
        if (typeof value !== 'string') continue;
        const next = await shrinkDataUrl(value);
        if (next) {
          slots[slot] = next;
          imagesShrunk++;
        }
      }
    }
  }

  if (imagesShrunk === 0) {
    return { ranCompaction: false, freedKB: 0, imagesShrunk: 0, beforeKB: before, afterKB: before };
  }

  try {
    localStorage.setItem(BRANDS_KEY, JSON.stringify(brands));
  } catch {
    // Writing the smaller payload shouldn't fail, but if it does the
    // original value is still in place — nothing is lost.
    return { ranCompaction: false, freedKB: 0, imagesShrunk: 0, beforeKB: before, afterKB: before };
  }

  const after = measureLocalStorage().totalKB;
  return {
    ranCompaction: true,
    freedKB: Math.max(0, before - after),
    imagesShrunk,
    beforeKB: before,
    afterKB: after,
  };
}

/**
 * Boot-time repair. Runs when storage is heavily used (or once per browser),
 * so a user who is already stuck gets unstuck by loading the app.
 */
export async function repairStorageOnBoot(): Promise<CompactionResult | null> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  let alreadyRan = false;
  try {
    alreadyRan = localStorage.getItem(DONE_FLAG) === '1';
  } catch {
    return null;
  }

  const usage = measureLocalStorage();
  const heavilyUsed = usage.totalKB > 2500; // ~half of the typical 5 MB cap
  if (alreadyRan && !heavilyUsed) return null;

  const freedCaches = freeDisposableStorage();
  const result = await compactStoredBrandLogos();
  try {
    localStorage.setItem(DONE_FLAG, '1');
  } catch {
    /* not important enough to fail on */
  }

  if (result.ranCompaction || freedCaches > 0) {
    console.info(
      `[storage] reclaimed ${result.freedKB + freedCaches} KB ` +
        `(${result.imagesShrunk} logos re-encoded, ${freedCaches} KB caches) — ` +
        `now ${result.afterKB} KB`,
    );
  }
  return result;
}
