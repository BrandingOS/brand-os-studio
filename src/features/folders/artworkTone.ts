/**
 * What tone is this artwork, and does it carry its own background?
 *
 * A brand library is full of logos drawn in ONE colour on transparency. Half
 * of them are white — invisible on a light card — and the other half are
 * near-black — invisible on a dark one. A fixed ground cannot serve both, and
 * `logoOnBackground.ts` (the canonical picker) answers a different question:
 * it chooses which VARIANT to place on a known background. Here the artwork
 * is fixed and the background is ours to choose.
 *
 * So we look at the pixels, once, and cache the verdict:
 *
 *   opaque  the artwork fills its frame — a photo, a screenshot, a flattened
 *           export. It brings its own ground; never touch it.
 *   light   drawn light on transparency. Needs a dark well in a light theme.
 *   dark    drawn dark on transparency. Needs a light well in a dark theme.
 *   mixed   full-colour artwork on transparency. Reads either way.
 *
 * Cost is one 24×24 canvas per distinct URL, taken from the <img> the card
 * already loaded — no second fetch. A cross-origin image taints the canvas
 * and `getImageData` throws; that is caught and reported as unknown, which
 * simply leaves the default well in place.
 */

export type ArtworkTone = 'opaque' | 'light' | 'dark' | 'mixed';

const cache = new Map<string, ArtworkTone | null>();

const SAMPLE = 24;
/** Below this alpha a pixel is background, not artwork. */
const ALPHA_FLOOR = 64;
/** Under this much transparency the artwork is carrying its own ground. */
const TRANSPARENT_RATIO_FLOOR = 0.06;
const LIGHT_ABOVE = 0.72;
const DARK_BELOW = 0.3;

function relativeLuminance(r: number, g: number, b: number): number {
  // Perceptual weights; good enough to answer "light or dark", and far
  // cheaper than the full sRGB → linear conversion for a 576-pixel sample.
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Measure a loaded <img>. Returns null when the answer cannot be had — the
 * image is not decoded, the canvas is tainted, or there is nothing to read.
 */
export function measureArtworkTone(img: HTMLImageElement): ArtworkTone | null {
  const key = img.currentSrc || img.src;
  if (!key) return null;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  if (!img.complete || img.naturalWidth === 0) return null;

  let result: ArtworkTone | null = null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE;
    canvas.height = SAMPLE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    // The four-argument form only. Chrome draws NOTHING when an SVG with no
    // intrinsic size is cropped by drawImage's source-rect form (CLAUDE.md).
    ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
    const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);

    let opaquePixels = 0;
    let transparentPixels = 0;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < ALPHA_FLOOR) {
        transparentPixels += 1;
        continue;
      }
      opaquePixels += 1;
      sum += relativeLuminance(data[i], data[i + 1], data[i + 2]);
    }

    const total = data.length / 4;
    if (opaquePixels < 8) {
      result = null;
    } else if (transparentPixels / total < TRANSPARENT_RATIO_FLOOR) {
      result = 'opaque';
    } else {
      const mean = sum / opaquePixels;
      result = mean > LIGHT_ABOVE ? 'light' : mean < DARK_BELOW ? 'dark' : 'mixed';
    }
  } catch {
    result = null; // tainted canvas — cross-origin without CORS headers
  }

  cache.set(key, result);
  return result;
}

/** Test seam. */
export function clearArtworkToneCache(): void {
  cache.clear();
}
