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
 * Draws the image small and records which cells are brighter than the mean.
 *
 * Two things make this work on logos specifically:
 *
 *  1. **Transparency is composited onto white.** A logo exported with an alpha
 *     channel and the same logo flattened onto its background are one mark;
 *     treating alpha as black would say otherwise.
 *  2. **The artwork is TRIMMED to its bounding box first.** Without this the
 *     hash is mostly padding — a logo is a small shape on a large empty field,
 *     so every logo hashes to "white with something in the middle" and nothing
 *     is distinguishable. Measured on real exports, untrimmed distances between
 *     unrelated marks ran 11–31 with no cluster; the signal was padding, not
 *     artwork. Trimming makes the hash describe the mark and makes the same
 *     mark at any size or format land in the same place.
 */
export async function fingerprint(url: string): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  try {
    const img = await load(url);

    // Pass 1 — render at working size and find the ink.
    const scan = document.createElement('canvas');
    scan.width = SCAN;
    scan.height = SCAN;
    const sctx = scan.getContext('2d', { willReadFrequently: true });
    if (!sctx) return null;
    sctx.fillStyle = '#ffffff';
    sctx.fillRect(0, 0, SCAN, SCAN);
    sctx.drawImage(img, 0, 0, SCAN, SCAN);

    const scanned = sctx.getImageData(0, 0, SCAN, SCAN).data;
    let minX = SCAN, minY = SCAN, maxX = -1, maxY = -1;
    for (let y = 0; y < SCAN; y++) {
      for (let x = 0; x < SCAN; x++) {
        const i = (y * SCAN + x) * 4;
        const lum = 0.2126 * scanned[i] + 0.7152 * scanned[i + 1] + 0.0722 * scanned[i + 2];
        // Anything meaningfully off-white is artwork.
        if (lum < 236) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    // A blank image has no artwork to describe.
    if (maxX < minX || maxY < minY) return null;

    const sx = (minX / SCAN) * img.width;
    const sy = (minY / SCAN) * img.height;
    const sw = ((maxX - minX + 1) / SCAN) * img.width;
    const sh = ((maxY - minY + 1) / SCAN) * img.height;

    // Pass 2 — hash only the artwork.
    const canvas = document.createElement('canvas');
    canvas.width = N;
    canvas.height = N;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, N, N);
    ctx.drawImage(img, sx, sy, Math.max(sw, 1), Math.max(sh, 1), 0, 0, N, N);

    const { data } = ctx.getImageData(0, 0, N, N);
    const cells: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      cells.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    }
    const mean = cells.reduce((a, b) => a + b, 0) / cells.length;
    return cells.map((c) => (c > mean ? '1' : '0')).join('');
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

/** Whether two fingerprints describe the same artwork. */
export function sameArtwork(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return distance(a, b) <= SAME_MARK_DISTANCE;
}

/**
 * Groups ids by artwork, keeping the FIRST of each group as its representative.
 *
 * Returns a map from every id to the id that represents it, so callers can fold
 * duplicates into one entry without deciding which to keep.
 */
export function groupByArtwork(
  items: ReadonlyArray<{ id: string; fingerprint: string | null }>,
): Map<string, string> {
  const representative = new Map<string, string>();
  const leads: Array<{ id: string; fingerprint: string | null }> = [];

  for (const item of items) {
    const lead = leads.find((l) => sameArtwork(l.fingerprint, item.fingerprint));
    if (lead) {
      representative.set(item.id, lead.id);
    } else {
      leads.push(item);
      representative.set(item.id, item.id);
    }
  }
  return representative;
}
