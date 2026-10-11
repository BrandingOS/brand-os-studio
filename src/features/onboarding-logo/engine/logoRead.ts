/**
 * Reading the logo.
 *
 * The owner gives us one file. Before asking them anything, the product LOOKS
 * at it — the way a designer does in the first ten seconds — and every
 * observation is tied to a decision it will drive later. "Your mark is heavy"
 * is only worth saying because it is why the system can stand on strong
 * colour.
 *
 * Two halves, kept separate so the judgement is testable without a canvas:
 *
 *   isolateInk / measureInk   pixels → numbers           (needs ImageData)
 *   traitsFromMetrics         numbers → designer's words (pure)
 *
 * The isolated ink also becomes the flow's working copy of the logo: a black
 * mark on transparency, which can be painted any colour with a CSS mask and
 * survives a JPG that arrived on a white rectangle.
 */
import { readArtwork, type Artwork } from '@/features/onboarding/understanding/artwork';
import type { Composition, LogoMetrics, LogoRead, LogoSource, LogoTraits } from '../model/types';

/** Resolution the measurements are taken at. Thresholds below assume it. */
const MEASURE_BOX = 256;
/** Longest side of the working ink PNG. */
const INK_BOX = 1024;

/* ── Pixels → ink ──────────────────────────────────────────────────── */

export interface Ink {
  /** 0–255 per pixel: how much of the logo is here. */
  alpha: Uint8ClampedArray;
  width: number;
  height: number;
  hadTransparency: boolean;
  inkSaturation: number;
  inkHue: number | null;
}

/**
 * Separates the mark from whatever it was delivered on.
 *
 * With a real alpha channel the alpha IS the ink. Without one, the ground is
 * whatever fills the four corners, and a pixel is ink in proportion to how far
 * it sits from that ground — which keeps the antialiased edge instead of
 * thresholding it into stairs.
 */
export function isolateInk(data: Uint8ClampedArray, width: number, height: number): Ink {
  const n = width * height;
  let translucent = 0;
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 250) translucent++;
  const hadTransparency = translucent / n > 0.02;

  const alpha = new Uint8ClampedArray(n);
  if (hadTransparency) {
    for (let i = 0; i < n; i++) alpha[i] = data[i * 4 + 3];
  } else {
    const ground = cornerColor(data, width, height);
    const dist = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const dr = data[i * 4] - ground[0];
      const dg = data[i * 4 + 1] - ground[1];
      const db = data[i * 4 + 2] - ground[2];
      dist[i] = Math.sqrt(dr * dr + dg * dg + db * db);
    }
    // The ink's own distance is the 97th percentile — the mark's solid core,
    // not a single outlier pixel.
    const sorted = Array.from(dist).sort((a, b) => a - b);
    const full = Math.max(40, sorted[Math.floor(n * 0.97)] ?? 255);
    const floor = 18;
    for (let i = 0; i < n; i++) {
      const v = (dist[i] - floor) / (full - floor);
      alpha[i] = Math.round(Math.max(0, Math.min(1, v)) * 255);
    }
  }

  // The ink's colour, read only where the mark is solid.
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < n; i++) {
    if (alpha[i] < 200) continue;
    r += data[i * 4];
    g += data[i * 4 + 1];
    b += data[i * 4 + 2];
    count++;
  }
  let inkSaturation = 0;
  let inkHue: number | null = null;
  if (count) {
    const { s, h } = hsl(r / count, g / count, b / count);
    inkSaturation = s;
    inkHue = s >= 18 ? h : null;
  }
  return { alpha, width, height, hadTransparency, inkSaturation, inkHue };
}

function cornerColor(data: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const pts = [0, w - 1, (h - 1) * w, h * w - 1];
  const sum = [0, 0, 0];
  for (const p of pts) {
    sum[0] += data[p * 4];
    sum[1] += data[p * 4 + 1];
    sum[2] += data[p * 4 + 2];
  }
  return [sum[0] / 4, sum[1] / 4, sum[2] / 4];
}

function hsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rs = r / 255, gs = g / 255, bs = b / 255;
  const max = Math.max(rs, gs, bs), min = Math.min(rs, gs, bs);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rs) h = ((gs - bs) / d + (gs < bs ? 6 : 0)) / 6;
  else if (max === gs) h = ((bs - rs) / d + 2) / 6;
  else h = ((rs - gs) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: l * 100 };
}

/* ── Ink → numbers ─────────────────────────────────────────────────── */

export interface Box { x: number; y: number; w: number; h: number }

export function inkBounds(ink: Ink, threshold = 128): Box | null {
  let x0 = ink.width, y0 = ink.height, x1 = -1, y1 = -1;
  for (let y = 0; y < ink.height; y++) {
    for (let x = 0; x < ink.width; x++) {
      if (ink.alpha[y * ink.width + x] < threshold) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Measures the ink. `null` when there is no ink to measure. */
export function measureInk(ink: Ink): Omit<LogoMetrics, 'inkSaturation' | 'inkHue' | 'hadTransparency'> | null {
  const box = inkBounds(ink);
  if (!box || box.w < 2 || box.h < 2) return null;
  const { alpha, width } = ink;
  const on = (x: number, y: number) => alpha[y * width + x] >= 128;

  let inkCount = 0, both = 0, either = 0;
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      const a = on(x, y);
      if (a) inkCount++;
      const mx = box.x + box.w - 1 - (x - box.x);
      const b = on(mx, y);
      if (a && b) both++;
      if (a || b) either++;
    }
  }

  // Edge orientation from a Sobel pass over the alpha.
  let edges = 0, axial = 0;
  const v = (x: number, y: number) => alpha[y * width + x] / 255;
  for (let y = Math.max(1, box.y); y < Math.min(ink.height - 1, box.y + box.h); y++) {
    for (let x = Math.max(1, box.x); x < Math.min(width - 1, box.x + box.w); x++) {
      const gx =
        -v(x - 1, y - 1) - 2 * v(x - 1, y) - v(x - 1, y + 1) +
        v(x + 1, y - 1) + 2 * v(x + 1, y) + v(x + 1, y + 1);
      const gy =
        -v(x - 1, y - 1) - 2 * v(x, y - 1) - v(x + 1, y - 1) +
        v(x - 1, y + 1) + 2 * v(x, y + 1) + v(x + 1, y + 1);
      const mag = Math.hypot(gx, gy);
      if (mag < 1) continue;
      edges++;
      const angle = (Math.atan2(Math.abs(gy), Math.abs(gx)) * 180) / Math.PI; // 0–90
      if (angle < 12 || angle > 78) axial++;
    }
  }

  return {
    ratio: box.w / box.h,
    coverage: inkCount / (box.w * box.h),
    symmetry: either ? both / either : 0,
    straightness: edges ? axial / edges : 0,
    detail: inkCount ? edges / inkCount : 0,
  };
}

/* ── Numbers → a designer's words ──────────────────────────────────── */

export function compositionOf(artwork: Pick<Artwork, 'parts'> | null): Composition {
  switch (artwork?.parts) {
    case 'text':
      return 'wordmark';
    case 'shape':
      return 'symbol';
    case 'both':
      return 'combination';
    default:
      return 'unclear';
  }
}

/** Pure. Every threshold lives here, so the read can be tested without pixels. */
export function traitsFromMetrics(m: LogoMetrics, composition: Composition): LogoTraits {
  const geometry = m.straightness >= 0.52 ? 'geometric' : m.straightness <= 0.34 ? 'organic' : 'balanced';
  // Edge pixels per ink pixel ≈ 2 / stroke width. Thin strokes push it up.
  const weight =
    m.coverage >= 0.5 || (m.coverage >= 0.36 && m.detail < 0.12)
      ? 'heavy'
      : m.coverage <= 0.2 || m.detail >= 0.45
        ? 'light'
        : 'regular';
  const proportion = m.ratio >= 1.6 ? 'wide' : m.ratio <= 0.7 ? 'tall' : 'square';
  return {
    geometry,
    weight,
    proportion,
    symmetric: m.symmetry >= 0.86,
    detailed: m.detail >= 0.38,
    composition,
    colored: m.inkSaturation >= 18,
  };
}

/** The smallest a mark should go, digitally. Detail and width both cost size. */
export function minWidthFor(t: LogoTraits): number {
  let min = t.proportion === 'wide' ? 96 : 32;
  if (t.detailed) min = Math.round(min * 1.5);
  if (t.weight === 'light') min = Math.round(min * 1.25);
  return min;
}

/** Clear space as a share of the logo's height. Busier marks need more air. */
export function clearSpaceFor(t: LogoTraits): number {
  if (t.proportion === 'wide') return 0.5;
  return t.detailed || t.weight === 'light' ? 0.35 : 0.25;
}

export function findingsFor(t: LogoTraits, m: LogoMetrics): LogoRead['findings'] {
  const out: LogoRead['findings'] = [];
  if (!m.hadTransparency) {
    out.push({
      id: 'lifted',
      title: 'Lifted off its background',
      detail: 'Your file came on a solid ground. We separated the mark so it can sit on any colour.',
    });
  }
  out.push(
    t.geometry === 'geometric'
      ? { id: 'geometry', title: 'Built from straight lines and true curves', detail: 'The system will speak the same language: geometric type, crisp shapes, a measured grid.' }
      : t.geometry === 'organic'
        ? { id: 'geometry', title: 'Drawn with flowing, organic forms', detail: 'We will pair it with humanist type and softer shapes, so nothing around it feels mechanical.' }
        : { id: 'geometry', title: 'A balance of structure and curve', detail: 'It can go either way — the direction you choose will decide which side we lean into.' },
  );
  out.push(
    t.weight === 'heavy'
      ? { id: 'weight', title: 'Heavy, confident ink', detail: 'It holds its own on strong colour, so the system can use bold grounds without losing the mark.' }
      : t.weight === 'light'
        ? { id: 'weight', title: 'Fine, light strokes', detail: 'It needs calm grounds and room to breathe. We will protect a larger minimum size.' }
        : { id: 'weight', title: 'Even, mid-weight ink', detail: 'Comfortable on light, dark and brand-coloured grounds alike.' },
  );
  out.push(
    t.symmetric
      ? { id: 'symmetry', title: 'Symmetrical and stable', detail: 'It reads as dependable. Centred layouts will feel natural around it.' }
      : { id: 'symmetry', title: 'Asymmetric, with movement', detail: 'We will echo that energy with off-centre layouts and directional shapes.' },
  );
  const composition: Record<Composition, LogoRead['findings'][number]> = {
    symbol: { id: 'composition', title: 'A symbol, without a name', detail: 'We will set your name beside it in the heading typeface to form a lockup.' },
    wordmark: { id: 'composition', title: 'Your name is the logo', detail: 'Type around it must support, not compete — we will favour quieter companions.' },
    combination: { id: 'composition', title: 'Symbol and name together', detail: 'We will also derive a compact version for avatars and small spaces.' },
    unclear: { id: 'composition', title: 'A distinctive single form', detail: 'We will treat it as a symbol and offer a lockup with your name.' },
  };
  out.push(composition[t.composition]);
  if (t.proportion === 'wide') {
    out.push({ id: 'proportion', title: 'Wide and horizontal', detail: 'Headers and lockups will run horizontally; avatars will need the compact version.' });
  }
  if (t.detailed) {
    out.push({ id: 'detail', title: 'Fine detail', detail: `Below about ${minWidthFor(t)}px it starts to fill in, so we set that as the minimum size.` });
  }
  if (t.colored) {
    out.push({ id: 'colored', title: 'It already carries colour', detail: 'We will build the palette around that colour rather than over it.' });
  }
  return out;
}

/* ── The browser half ──────────────────────────────────────────────── */

/**
 * An SVG with no width/height draws at the CSS default size, or not at all
 * when cropped. Giving it its viewBox's size makes it draw like any image.
 */
export function sizedSvg(svgText: string): string {
  const open = svgText.match(/<svg\b[^>]*>/i)?.[0];
  if (!open) return svgText;
  const hasW = /\swidth\s*=/.test(open);
  const hasH = /\sheight\s*=/.test(open);
  if (hasW && hasH && !/(width|height)\s*=\s*["'][\d.]*%/.test(open)) return svgText;
  const vb = open.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1]?.trim().split(/[\s,]+/).map(Number);
  const w = vb && vb.length === 4 && vb[2] > 0 ? vb[2] : 512;
  const h = vb && vb.length === 4 && vb[3] > 0 ? vb[3] : 512;
  const scale = 1024 / Math.max(w, h);
  const cleaned = open.replace(/\s(width|height)\s*=\s*["'][^"']*["']/gi, '');
  const sized = cleaned.replace(/<svg\b/i, `<svg width="${Math.round(w * scale)}" height="${Math.round(h * scale)}"`);
  return svgText.replace(open, sized);
}

export function svgDataUrl(svgText: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This file could not be read as an image.'));
    img.src = url;
  });
}

function drawFit(img: HTMLImageElement, box: number): { ctx: CanvasRenderingContext2D; w: number; h: number } {
  const nw = img.naturalWidth || img.width || box;
  const nh = img.naturalHeight || img.height || box;
  const scale = Math.min(box / nw, box / nh);
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');
  ctx.drawImage(img, 0, 0, w, h);
  return { ctx, w, h };
}

/** Renders the isolated ink, trimmed, as a black-on-transparent PNG. */
function inkPng(ink: Ink): { url: string; width: number; height: number } {
  const box = inkBounds(ink, 24) ?? { x: 0, y: 0, w: ink.width, h: ink.height };
  const pad = Math.round(Math.max(box.w, box.h) * 0.02);
  const x0 = Math.max(0, box.x - pad);
  const y0 = Math.max(0, box.y - pad);
  const w = Math.min(ink.width - x0, box.w + pad * 2);
  const h = Math.min(ink.height - y0, box.h + pad * 2);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const out = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = ink.alpha[(y + y0) * ink.width + (x + x0)];
      const i = (y * w + x) * 4;
      out.data[i] = 0;
      out.data[i + 1] = 0;
      out.data[i + 2] = 0;
      out.data[i + 3] = a;
    }
  }
  ctx.putImageData(out, 0, 0);
  return { url: canvas.toDataURL('image/png'), width: w, height: h };
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('unreadable'));
    reader.readAsDataURL(file);
  });
}

export const ACCEPTED_LOGO_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'];
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;

/** Validates before reading — a refusal names what was wrong. */
export function refuseLogo(file: File): string | null {
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
  if (!isSvg && !ACCEPTED_LOGO_TYPES.includes(file.type)) return 'Upload an SVG, PNG, JPG or WebP file.';
  if (file.size > MAX_LOGO_BYTES) return 'That file is over 5 MB. Export a smaller version and try again.';
  return null;
}

/** Turns an uploaded file into the flow's `LogoSource`. */
export async function sourceFromFile(file: File): Promise<LogoSource> {
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
  let svgText: string | undefined;
  let drawUrl: string;
  let originalUrl: string;
  if (isSvg) {
    svgText = await file.text();
    if (!/<svg\b/i.test(svgText)) throw new Error('That SVG has no drawing in it.');
    drawUrl = svgDataUrl(sizedSvg(svgText));
    originalUrl = svgDataUrl(svgText);
  } else {
    originalUrl = await readAsDataUrl(file);
    drawUrl = originalUrl;
  }
  const img = await loadImage(drawUrl);
  const { ctx, w, h } = drawFit(img, INK_BOX);
  const ink = isolateInk(ctx.getImageData(0, 0, w, h).data, w, h);
  if (!inkBounds(ink)) throw new Error('We could not find a mark in that file — is it blank?');
  const png = inkPng(ink);
  return {
    name: file.name.replace(/\.[^.]+$/, ''),
    originalUrl,
    inkUrl: png.url,
    svgText,
    width: png.width,
    height: png.height,
  };
}

const DEFAULT_METRICS: LogoMetrics = {
  ratio: 1,
  coverage: 0.35,
  symmetry: 0.5,
  straightness: 0.4,
  detail: 0.2,
  inkSaturation: 0,
  inkHue: null,
  hadTransparency: true,
};

/** A neutral read, for a file that could be drawn but not measured. */
export function fallbackRead(): LogoRead {
  const traits = traitsFromMetrics(DEFAULT_METRICS, 'unclear');
  return { metrics: DEFAULT_METRICS, traits, findings: findingsFor(traits, DEFAULT_METRICS) };
}

/** The full read. Measures at a fixed resolution so thresholds mean one thing. */
export async function readLogo(source: LogoSource): Promise<LogoRead> {
  const drawUrl = source.svgText ? svgDataUrl(sizedSvg(source.svgText)) : source.originalUrl;
  const img = await loadImage(drawUrl);
  const { ctx, w, h } = drawFit(img, MEASURE_BOX);
  const ink = isolateInk(ctx.getImageData(0, 0, w, h).data, w, h);
  const measured = measureInk(ink);
  const metrics: LogoMetrics = {
    ...DEFAULT_METRICS,
    ...(measured ?? {}),
    inkSaturation: ink.inkSaturation,
    inkHue: ink.inkHue,
    hadTransparency: ink.hadTransparency,
  };
  // The parts reading is the onboarding detector's — one opinion in the
  // product about what is a symbol and what is a name. It reads the ink copy,
  // so a JPG on white is judged on its mark rather than its rectangle.
  const artwork = await readArtwork(source.inkUrl).catch(() => null);
  const traits = traitsFromMetrics(metrics, compositionOf(artwork));
  return { metrics, traits, findings: findingsFor(traits, metrics) };
}
