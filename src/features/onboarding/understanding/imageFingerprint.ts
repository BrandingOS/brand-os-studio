/**
 * Telling two pictures of the same mark apart from two different marks.
 *
 * Filenames were the previous signal and they are worthless here: real exports
 * are called "Artboard 26.png", "Artboard 261.png", "Asset 23.png". Three
 * identical logos at different sizes and formats came through as three separate
 * logos because nothing in their names said otherwise, and content hashing does
 * not help either — a PNG and an SVG of the same artwork share no bytes.
 *
 * So compare what the user compares: the picture. This is an average hash —
 * draw the image small, take the mean luminance, and record which cells are
 * above it. Two renders of one mark agree on nearly every cell whatever their
 * size or format; two different marks do not.
 *
 * Deliberately crude. It is not identifying anything, only answering "is this
 * the same artwork I already have?", and the cost of a false pair (one logo
 * grouped under another, visible and correctable) is far below the cost of a
 * false split (a wall of identical tiles, which is what shipped).
 */

/** Grid edge. 8×8 = 64 bits, the standard size for this. */
const N = 8;

/** Cells that may differ before two images are called different marks. */
export const SAME_MARK_DISTANCE = 6;

/** Working resolution for finding the artwork inside the canvas. */
const SCAN = 64;

/**
 * What one image turned out to be.
 *
 * The ratio is the second thing the trim pass already knows and the single most
 * reliable signal about what KIND of logo this is: an icon is roughly square, a
 * wordmark is several times wider than it is tall, and neither fact can be
 * faked by a filename. It is the artwork's own proportions, not the file's —
 * padding is excluded, so the same mark exported into a square canvas and into
 * a tight one measures the same.
 */
export interface Print {
  /** 64 cells, above or below the artwork's mean. */
  hash: string;
  /** Width ÷ height of the trimmed artwork. */
  ratio: number;
}

/** Below this the pixel is background, not artwork. */
const INK_ALPHA = 24;
/** Above this a pixel is opaque enough that the image has no real transparency. */
const OPAQUE_ALPHA = 250;
/** Off-white enough to be artwork, in a flattened image. */
const INK_LUMINANCE = 236;

/**
 * Draws the image small and records which cells are above its mean.
 *
 * Three things make this work on logos specifically:
 *
 *  1. **Artwork is found by COVERAGE when the image has any.** A logo is
 *     usually a shape on transparency, and the shape is what identifies it —
 *     not its colour. Reading coverage rather than darkness is also the only
 *     way to see a white-on-transparent export at all: composited onto white it
 *     is invisible, and the whole @2x folder of a real brand returned no
 *     fingerprint. A flattened image has no coverage to read, so there the
 *     measure falls back to "meaningfully off-white".
 *  2. **Tonal twins land in the same place.** Because coverage ignores colour, a
 *     mark and its white-on-dark twin fingerprint identically — which is what
 *     the flow wants, since they are one mark in two dresses.
 *  3. **The artwork is TRIMMED to its bounding box first.** Without this the
 *     hash is mostly padding — a logo is a small shape on a large empty field,
 *     so every logo hashes to "empty with something in the middle" and nothing
 *     is distinguishable. Measured on real exports, untrimmed distances between
 *     unrelated marks ran 11–31 with no cluster; the signal was padding, not
 *     artwork. Trimming makes the hash describe the mark and makes the same
 *     mark at any size or format land in the same place.
 */
export async function fingerprint(url: string): Promise<Print | null> {
  if (typeof document === 'undefined') return null;
  try {
    const img = await load(url);

    // Pass 1 — render at working size, on transparency, and find the artwork.
    const scan = document.createElement('canvas');
    scan.width = SCAN;
    scan.height = SCAN;
    const sctx = scan.getContext('2d', { willReadFrequently: true });
    if (!sctx) return null;
    sctx.clearRect(0, 0, SCAN, SCAN);
    sctx.drawImage(img, 0, 0, SCAN, SCAN);

    const scanned = sctx.getImageData(0, 0, SCAN, SCAN).data;
    // Which measure applies is a property of the image, so it is decided once,
    // for the whole image, before anything is measured with it.
    let transparent = false;
    for (let i = 3; i < scanned.length; i += 4) {
      if (scanned[i] < OPAQUE_ALPHA) {
        transparent = true;
        break;
      }
    }

    let minX = SCAN, minY = SCAN, maxX = -1, maxY = -1;
    for (let y = 0; y < SCAN; y++) {
      for (let x = 0; x < SCAN; x++) {
        const i = (y * SCAN + x) * 4;
        const alpha = scanned[i + 3];
        const lum = 0.2126 * scanned[i] + 0.7152 * scanned[i + 1] + 0.0722 * scanned[i + 2];
        const ink = transparent ? alpha >= INK_ALPHA : lum < INK_LUMINANCE;
        if (ink) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    // A blank image has no artwork to describe.
    if (maxX < minX || maxY < minY) return null;

    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    // The bounding box is measured in the SQUARE scan, which stretched the
    // image to get there — so it has to be un-stretched by the image's own
    // proportions to describe the artwork. Measuring the box alone reported
    // every logo as square, and the shape evidence went quiet.
    const ratio = bh > 0 && img.width > 0 && img.height > 0
      ? (bw * img.width) / (bh * img.height)
      : 1;

    // Pass 2 — hash only the artwork, cropped from the render above rather
    // than from the image.
    //
    // Not an optimisation. An SVG with a viewBox and no width/height has no
    // intrinsic size, and Chrome draws NOTHING when such an image is used with
    // drawImage's source-rectangle form — every logo in a designer's SVG folder
    // hashed to a blank square, so all of them read as the same artwork and a
    // three-logo upload folded into one. The scan canvas is an ordinary bitmap
    // and crops correctly. 64px down to 8 is a generous margin for a 64-bit
    // hash, so nothing is lost by going through it.
    const canvas = document.createElement('canvas');
    canvas.width = N;
    canvas.height = N;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.clearRect(0, 0, N, N);
    ctx.drawImage(scan, minX, minY, bw, bh, 0, 0, N, N);

    const { data } = ctx.getImageData(0, 0, N, N);
    const cells: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      // Coverage where there is any, brightness where there is none — the same
      // choice pass 1 made, so the two describe the same thing.
      cells.push(
        transparent
          ? data[i + 3]
          : 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2],
      );
    }
    const mean = cells.reduce((a, b) => a + b, 0) / cells.length;
    return { hash: cells.map((c) => (c > mean ? '1' : '0')).join(''), ratio };
  } catch {
    // An unreadable image simply has no fingerprint; it is never dropped for it.
    return null;
  }
}

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** How many cells two fingerprints disagree on. */
export function distance(a: string, b: string): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

/** Whether two prints describe the same artwork. */
export function sameArtwork(a: Print | null | undefined, b: Print | null | undefined): boolean {
  if (!a || !b) return false;
  return distance(a.hash, b.hash) <= SAME_MARK_DISTANCE;
}

/**
 * What the artwork's proportions say it is — `null` when they say nothing.
 *
 * Two thresholds with a deliberate gap between them, because most logos live in
 * that gap: a lockup of symbol + name is wide but not a wordmark, and this
 * returns nothing for it rather than a confident wrong answer. The user
 * confirms every role anyway, so silence here costs one glance; a wrong answer
 * costs a correction.
 */
export function shapeSuggests(print: Print | null | undefined): 'wordmark' | 'mark' | null {
  if (!print) return null;
  // Text set on one line. Nothing else is this wide.
  if (print.ratio >= 4) return 'wordmark';
  // A symbol drawn in a square-ish field.
  if (print.ratio <= 1.35) return 'mark';
  return null;
}
