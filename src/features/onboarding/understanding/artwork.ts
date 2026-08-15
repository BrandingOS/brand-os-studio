/**
 * Looking at a logo and saying what it is.
 *
 * Every earlier version of this asked the filename, and a filename is a label
 * somebody typed once — `Logomark.svg` turned out to be a wide logotype, and
 * `Artboard 26.png` says nothing at all. So this looks at the picture instead,
 * and answers the two questions a person answers instantly:
 *
 *   **What is it made of?**  A symbol on its own is an icon. Words on their own
 *                            are a wordmark. Both together are a lockup.
 *   **How do the two sit?**  Side by side is the primary logo. Stacked is the
 *                            vertical one.
 *
 * plus one more that decides the variant rather than the role:
 *
 *   **Is the artwork light?** Light artwork was drawn to sit on a dark
 *                            background. That is what the "On dark" slot is.
 *
 * Nothing here reads letters. Telling words from a symbol does not need to:
 * words are a WIDE run of several separate small pieces sharing a line, and a
 * symbol is a compact one. That distinction survives any typeface, any
 * language, and any artwork, and it is the whole trick.
 *
 * Pure measurement — no service, no store, no React. Every threshold below is
 * named, and each was set against real logo exports rather than guessed.
 */

/** Working resolution. Big enough that letters stay separate pieces. */
const BOX = 256;
/** Grid edge for the identity hash. 8×8 = 64 bits, the standard size. */
const N = 8;

/** Below this alpha the pixel is background. */
const INK_ALPHA = 24;
/** Above this alpha everywhere, the image is flattened and has no coverage. */
const OPAQUE_ALPHA = 250;
/** Off-white enough to be artwork, in a flattened image. */
const INK_LUMINANCE = 236;

/** Mean ink luminance above which artwork is "light" — made for dark grounds. */
const LIGHT_INK = 150;

/**
 * Daylight between two pieces — the spacing between letters, not between parts.
 * Relative to the artwork's height, so it holds at any size.
 */
const PIECE_GAP = 0.03;

/**
 * The widest gap has to be at least this, relative to the height, before it is
 * treated as a possible seam between two PARTS.
 *
 * There is no threshold separating "letter gap" from "part gap" here, and that
 * is the point — every attempt to pick one either merged a tight lockup into a
 * single wide run or tore a wordmark in half. Instead the artwork is cut at its
 * OWN widest gap, whatever that measures, and the two halves are asked what
 * they are. A wordmark cut at its widest gap is two runs of words, and stays a
 * wordmark; a lockup cut at its widest gap is a symbol and a name, which is
 * exactly the thing worth knowing. This floor only stops a perfectly even run
 * of letters from being cut for no reason.
 */
const SEAM_FLOOR = 0.06;

/**
 * And it has to be this many times the typical gap to count as a seam.
 *
 * Evenly spaced letters have no widest gap worth the name — every one is the
 * same, so the "widest" is whichever happened to win by a pixel, and cutting
 * there lops the first letter off a wordmark and calls it a symbol. A real seam
 * stands out: the space between a symbol and the name beside it runs two to
 * four times a letter gap. So the cut has to be conspicuous, not merely
 * maximal.
 */
const SEAM_DOMINANCE = 1.7;

/** Wider than this, relative to its height, a run is a line of words. */
const TEXT_ASPECT = 2.2;
/** Narrower than this, a run is a symbol. Between the two, nothing is claimed. */
const SHAPE_ASPECT = 1.8;
/** This wide, it is words even if the letters touch — a script or a mono line. */
const CERTAIN_TEXT_ASPECT = 3.5;

/** What the artwork is made of. */
export type Parts = 'text' | 'shape' | 'both' | 'unclear';

/** How the two parts of a lockup sit. */
export type Arrangement = 'beside' | 'stacked';

export interface Artwork {
  /** 64 cells of coverage, above or below the mean. Identity, not appearance. */
  hash: string;
  /** Width ÷ height of the artwork itself, padding excluded. */
  ratio: number;
  parts: Parts;
  /** Only meaningful when `parts` is `both`. */
  arrangement: Arrangement | null;
  /** Light artwork was drawn for dark backgrounds. */
  tone: 'light' | 'dark';
}

/**
 * Reads one image.
 *
 * Returns `null` for anything unreadable or blank — a logo is never dropped for
 * failing to be measurable, the caller simply learns nothing about it.
 */
export async function readArtwork(url: string): Promise<Artwork | null> {
  if (typeof document === 'undefined') return null;
  try {
    const img = await load(url);
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (!naturalW || !naturalH) return null;

    // Drawn to FIT, never to fill: stretching the image into a square would
    // make every wordmark measure square and the shape evidence would go
    // silent. Fitting means the trimmed box is already the artwork's own
    // proportions, with nothing to correct afterwards.
    const scale = Math.min(BOX / naturalW, BOX / naturalH);
    const dw = Math.max(1, Math.round(naturalW * scale));
    const dh = Math.max(1, Math.round(naturalH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.clearRect(0, 0, dw, dh);
    ctx.drawImage(img, 0, 0, dw, dh);
    const { data } = ctx.getImageData(0, 0, dw, dh);

    // Which measure applies is a property of the whole image, so it is settled
    // once. Coverage where there is any — that is the only way to see a
    // white-on-transparent export at all, since composited onto white it is
    // invisible. Brightness where there is none.
    let transparent = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < OPAQUE_ALPHA) {
        transparent = true;
        break;
      }
    }

    const ink: boolean[] = new Array(dw * dh);
    let inkCount = 0;
    let lumTotal = 0;
    for (let p = 0; p < dw * dh; p++) {
      const i = p * 4;
      const alpha = data[i + 3];
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      const isInk = transparent ? alpha >= INK_ALPHA : lum < INK_LUMINANCE;
      ink[p] = isInk;
      if (isInk) {
        inkCount++;
        lumTotal += lum;
      }
    }
    if (!inkCount) return null;

    // ── Trim to the artwork ────────────────────────────────────────────────
    let minX = dw, minY = dh, maxX = -1, maxY = -1;
    for (let y = 0; y < dh; y++) {
      for (let x = 0; x < dw; x++) {
        if (!ink[y * dw + x]) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < minX || maxY < minY) return null;

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const at = (x: number, y: number) => ink[(y + minY) * dw + (x + minX)];

    return {
      hash: hashOf(at, w, h),
      ratio: w / h,
      tone: lumTotal / inkCount > LIGHT_INK ? 'light' : 'dark',
      ...compose(at, w, h),
    };
  } catch {
    return null;
  }
}

/**
 * The identity hash — coverage, downsampled to 8×8, each cell above or below
 * the mean.
 *
 * Coverage rather than colour, on purpose: a mark and its white-on-dark twin
 * are the same drawing, and this makes them hash identically. What separates
 * them is `tone`, which is a different question and answered separately.
 */
function hashOf(at: (x: number, y: number) => boolean, w: number, h: number): string {
  const cells: number[] = [];
  for (let cy = 0; cy < N; cy++) {
    for (let cx = 0; cx < N; cx++) {
      const x0 = Math.floor((cx * w) / N);
      const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * w) / N));
      const y0 = Math.floor((cy * h) / N);
      const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * h) / N));
      let on = 0;
      let total = 0;
      for (let y = y0; y < y1 && y < h; y++) {
        for (let x = x0; x < x1 && x < w; x++) {
          total++;
          if (at(x, y)) on++;
        }
      }
      cells.push(total ? on / total : 0);
    }
  }
  const mean = cells.reduce((a, b) => a + b, 0) / cells.length;
  return cells.map((c) => (c > mean ? '1' : '0')).join('');
}

/** Maximal ranges of ink along one axis, separated by gaps of at least `gap`. */
function runsOf(occupied: boolean[], gap: number): Array<{ start: number; end: number }> {
  const runs: Array<{ start: number; end: number }> = [];
  let start = -1;
  let blank = 0;
  for (let i = 0; i < occupied.length; i++) {
    if (occupied[i]) {
      // A gap only ends a run once it is wide enough to be a real separation.
      if (start >= 0 && blank >= gap) {
        runs.push({ start, end: i - blank - 1 });
        start = i;
      } else if (start < 0) {
        start = i;
      }
      blank = 0;
    } else if (start >= 0) {
      blank++;
    }
  }
  if (start >= 0) runs.push({ start, end: occupied.length - 1 - blank });
  return runs;
}

/** Whether a run of this shape, holding this many separate pieces, is words. */
function isText(width: number, height: number, pieces: number): boolean {
  const aspect = width / Math.max(height, 1);
  if (aspect >= CERTAIN_TEXT_ASPECT) return true;
  return aspect >= TEXT_ASPECT && pieces >= 2;
}

function isShape(width: number, height: number): boolean {
  return width / Math.max(height, 1) < SHAPE_ASPECT;
}

/**
 * What the artwork is made of, and how the pieces sit.
 *
 * Vertical first, because a stacked lockup has to be recognised BEFORE its
 * halves are read across — a symbol above a name looks, from the side, like one
 * tall thing.
 */
function compose(
  at: (x: number, y: number) => boolean,
  w: number,
  h: number,
): { parts: Parts; arrangement: Arrangement | null } {
  // Vertically first: a symbol sitting above a name looks, read across, like
  // one tall thing, so the stacked case has to be recognised before that.
  const stacked = seam(at, w, h, 'y');
  if (stacked) {
    const above = kindOf(at, w, h, stacked[0], 'y');
    const below = kindOf(at, w, h, stacked[1], 'y');
    if ((above === 'shape' && below === 'text') || (above === 'text' && below === 'shape')) {
      return { parts: 'both', arrangement: 'stacked' };
    }
  }

  const beside = seam(at, w, h, 'x');
  if (beside) {
    const left = kindOf(at, w, h, beside[0], 'x');
    const right = kindOf(at, w, h, beside[1], 'x');
    if ((left === 'shape' && right === 'text') || (left === 'text' && right === 'shape')) {
      return { parts: 'both', arrangement: 'beside' };
    }
  }

  // One thing, then. Whatever the whole artwork reads as.
  const whole = kindOf(at, w, h, { start: 0, end: (axisLength('x', w, h)) - 1 }, 'x');
  if (whole === 'text') return { parts: 'text', arrangement: null };
  if (whole === 'shape') return { parts: 'shape', arrangement: null };
  return { parts: 'unclear', arrangement: null };
}

function axisLength(axis: 'x' | 'y', w: number, h: number): number {
  return axis === 'x' ? w : h;
}

/** Where the ink sits along one axis, at letter spacing. */
function occupancy(
  at: (x: number, y: number) => boolean,
  w: number,
  h: number,
  axis: 'x' | 'y',
): boolean[] {
  const length = axisLength(axis, w, h);
  const across = axisLength(axis === 'x' ? 'y' : 'x', w, h);
  const out: boolean[] = [];
  for (let i = 0; i < length; i++) {
    let any = false;
    for (let j = 0; j < across && !any; j++) {
      any = axis === 'x' ? at(i, j) : at(j, i);
    }
    out.push(any);
  }
  return out;
}

/**
 * Cuts the artwork at its widest gap along one axis.
 *
 * Returns the two halves, or `null` when there is no gap worth cutting at.
 */
function seam(
  at: (x: number, y: number) => boolean,
  w: number,
  h: number,
  axis: 'x' | 'y',
): [{ start: number; end: number }, { start: number; end: number }] | null {
  const pieces = runsOf(occupancy(at, w, h, axis), Math.max(1, Math.round(h * PIECE_GAP)));
  if (pieces.length < 2) return null;

  const gaps: number[] = [];
  let widest = 0;
  let cut = -1;
  for (let i = 0; i < pieces.length - 1; i++) {
    const gap = pieces[i + 1].start - pieces[i].end - 1;
    gaps.push(gap);
    if (gap > widest) {
      widest = gap;
      cut = i;
    }
  }
  if (cut < 0 || widest < Math.max(2, h * SEAM_FLOOR)) return null;
  // With one gap there is nothing to stand out from, so the floor above is the
  // whole test. With several, the seam has to be conspicuous among them.
  if (gaps.length > 1) {
    const others = gaps.filter((_, i) => i !== cut).sort((a, b) => a - b);
    const typical = others[Math.floor(others.length / 2)];
    if (widest < Math.max(typical, 1) * SEAM_DOMINANCE) return null;
  }
  return [
    { start: pieces[0].start, end: pieces[cut].end },
    { start: pieces[cut + 1].start, end: pieces[pieces.length - 1].end },
  ];
}

/** Whether one run is words, a symbol, or neither. */
function kindOf(
  at: (x: number, y: number) => boolean,
  w: number,
  h: number,
  run: { start: number; end: number },
  axis: 'x' | 'y',
): 'text' | 'shape' | 'unclear' {
  // The run's own box, trimmed on the other axis too — a wide band holding one
  // short word is a wide band, and measuring it full-height would call it a
  // symbol.
  let lo = Infinity;
  let hi = -Infinity;
  const outer = run.end - run.start + 1;
  for (let i = run.start; i <= run.end; i++) {
    const across = axis === 'x' ? h : w;
    for (let j = 0; j < across; j++) {
      const on = axis === 'x' ? at(i, j) : at(j, i);
      if (!on) continue;
      if (j < lo) lo = j;
      if (j > hi) hi = j;
    }
  }
  if (hi < lo) return 'unclear';
  const inner = hi - lo + 1;
  const width = axis === 'x' ? outer : inner;
  const height = axis === 'x' ? inner : outer;

  // How many separate pieces sit inside it. Letters are pieces; a solid bar of
  // the same proportions is one, and is not words.
  const pieces = countPieces(at, w, h, run, axis, height);
  if (isText(width, height, pieces)) return 'text';
  if (isShape(width, height)) return 'shape';
  return 'unclear';
}

/** Separate pieces inside a run, at letter spacing. */
function countPieces(
  at: (x: number, y: number) => boolean,
  w: number,
  h: number,
  run: { start: number; end: number },
  axis: 'x' | 'y',
  height: number,
): number {
  const occupied: boolean[] = [];
  if (axis === 'x') {
    for (let x = run.start; x <= run.end; x++) {
      let any = false;
      for (let y = 0; y < h && !any; y++) any = at(x, y);
      occupied.push(any);
    }
  } else {
    for (let x = 0; x < w; x++) {
      let any = false;
      for (let y = run.start; y <= run.end && !any; y++) any = at(x, y);
      occupied.push(any);
    }
  }
  return runsOf(occupied, Math.max(1, Math.round(height * PIECE_GAP))).length;
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

/** Cells two hashes disagree on. */
export function distance(a: string, b: string): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

/** Cells that may differ before two images are called different marks. */
export const SAME_MARK_DISTANCE = 6;

/**
 * Whether two images are the same logo.
 *
 * Same drawing AND same tone. The tone half matters: a mark and its white twin
 * ARE the same drawing, and folding them together would hide the white one
 * instead of putting it in the slot it was made for.
 */
export function sameArtwork(a: Artwork | null | undefined, b: Artwork | null | undefined): boolean {
  if (!a || !b) return false;
  return a.tone === b.tone && distance(a.hash, b.hash) <= SAME_MARK_DISTANCE;
}
