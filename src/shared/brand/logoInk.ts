/**
 * What colour a logo actually IS — and, because most logos are more than one
 * colour, what colourS.
 *
 * Two guesses have failed here in turn, and the second is the interesting one.
 *
 * The first was assuming a coloured variant is inked in the brand's primary
 * colour, because that is the only colour the record carries. A lockup with a
 * yellow mark and a dark grey wordmark scored as YELLOW.
 *
 * The second was measuring the artwork and averaging it. The same lockup then
 * scored as DARK — true of most of its pixels, and useless: on the brand's
 * yellow card the wordmark read perfectly and the yellow mark vanished into the
 * background. An average cannot answer "does this logo read", because a logo
 * reads only if EVERY part of it does.
 *
 * So this reports the artwork's ink as a short list of clusters with their
 * shares, and `inkReadsOn` asks the only question that matters: is there a
 * significant part of this logo that would disappear on that background? One
 * failing cluster is a failing logo.
 *
 * Cheap by construction: 32×32, one decode per URL for the life of the tab, and
 * every failure (a tainted canvas, a URL that will not load, an SVG with no
 * intrinsic size) resolves to `undefined` rather than throwing — callers fall
 * back to the brand's primary colour, which is exactly where they started.
 */
import { useEffect, useState } from 'react';
import { contrastRatio } from './logoOnBackground';

/** Edge length of the scan. Big enough to cluster, small enough to be free. */
const SCAN = 32;

/** Below this alpha a pixel is the field around the mark, not the mark. */
const MIN_ALPHA = 24;

/** Fewer inked pixels than this and there is nothing to measure. */
const MIN_INKED = 8;

/** Channel quantisation — 32 levels, so antialiasing folds into its own tone. */
const STEP = 8;

/**
 * A cluster smaller than this is a highlight, an outline or an artefact of
 * antialiasing, not a part of the logo anyone would miss. Too low and every
 * logo is rejected by its own edge pixels; too high and a real accent mark
 * stops counting.
 */
const SIGNIFICANT = 0.08;

/** Merge clusters closer together than this (squared RGB distance). */
const MERGE_DISTANCE = 60 * 60;

export interface InkCluster {
  hex: string;
  /** Share of the artwork's ink, 0..1. */
  weight: number;
}

export interface LogoInk {
  /** Largest first. Weights sum to 1. */
  clusters: InkCluster[];
  /** The alpha-weighted average, for callers that want one colour. */
  mean: string;
  /**
   * Does the artwork have a transparent field around it?
   *
   * The difference between a picture and a MARK, as far as a card is concerned.
   * Cropping a photograph loses scenery; cropping a mark cuts a symbol in half
   * and blows the remainder past the edges of the card. Anything transparent is
   * therefore shown whole, never filled to the frame.
   */
  transparent: boolean;
}

const cache = new Map<string, LogoInk | undefined>();
const inflight = new Map<string, Promise<LogoInk | undefined>>();

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function rgbOf(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const int = parseInt(m[1]!, 16);
  return [(int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff];
}

function distanceSq(a: string, b: string): number {
  const [ar, ag, ab] = rgbOf(a);
  const [br, bg, bb] = rgbOf(b);
  return (ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2;
}

/** Buckets → merged clusters, largest first, weights normalised. */
function cluster(buckets: Map<string, { r: number; g: number; b: number; w: number }>): InkCluster[] {
  const raw = [...buckets.values()]
    .map((b) => ({ hex: toHex(b.r / b.w, b.g / b.w, b.b / b.w), weight: b.w }))
    .sort((x, y) => y.weight - x.weight);

  // Greedy merge into the largest neighbour. A gradient arrives as a run of
  // adjacent buckets; without this it would look like a dozen small clusters,
  // none of them significant, and the logo would pass any test at all.
  const merged: Array<{ hex: string; weight: number; r: number; g: number; b: number }> = [];
  for (const c of raw) {
    const [r, g, b] = rgbOf(c.hex);
    const near = merged.find((m) => distanceSq(m.hex, c.hex) <= MERGE_DISTANCE);
    if (near) {
      const w = near.weight + c.weight;
      near.r = (near.r * near.weight + r * c.weight) / w;
      near.g = (near.g * near.weight + g * c.weight) / w;
      near.b = (near.b * near.weight + b * c.weight) / w;
      near.weight = w;
      near.hex = toHex(near.r, near.g, near.b);
    } else {
      merged.push({ hex: c.hex, weight: c.weight, r, g, b });
    }
  }

  const total = merged.reduce((sum, m) => sum + m.weight, 0);
  if (total === 0) return [];
  return merged
    .map((m) => ({ hex: m.hex, weight: m.weight / total }))
    .sort((a, b) => b.weight - a.weight);
}

async function measure(url: string): Promise<LogoInk | undefined> {
  if (typeof document === 'undefined') return undefined;

  const image = await new Promise<HTMLImageElement | undefined>((resolve) => {
    const img = new Image();
    // Without this a remote logo taints the canvas and `getImageData` throws.
    // With it, a server that does not send CORS headers fails to load instead —
    // both end as `undefined`, and neither costs the caller anything.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(undefined);
    img.src = url;
  });
  if (!image) return undefined;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = SCAN;
    canvas.height = SCAN;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return undefined;
    // The whole-destination form on purpose. Chrome draws NOTHING for an SVG
    // with no intrinsic size when `drawImage` is given a source rect, which is
    // the failure that made the onboarding classifier read blank logos.
    ctx.drawImage(image, 0, 0, SCAN, SCAN);

    const { data } = ctx.getImageData(0, 0, SCAN, SCAN);
    const buckets = new Map<string, { r: number; g: number; b: number; w: number }>();
    let sheer = 0;
    let mr = 0;
    let mg = 0;
    let mb = 0;
    let weight = 0;
    let inked = 0;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]!;
      // Counted BEFORE the ink filter: the transparent field is exactly the
      // part that gets skipped below, and it is what the question is about.
      if (a < 200) sheer += 1;
      if (a < MIN_ALPHA) continue;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const w = a / 255;

      mr += r * w;
      mg += g * w;
      mb += b * w;
      weight += w;
      inked += 1;

      const key = `${Math.round(r / STEP)},${Math.round(g / STEP)},${Math.round(b / STEP)}`;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.r += r * w;
        bucket.g += g * w;
        bucket.b += b * w;
        bucket.w += w;
      } else {
        buckets.set(key, { r: r * w, g: g * w, b: b * w, w });
      }
    }

    if (inked < MIN_INKED || weight === 0) return undefined;
    const clusters = cluster(buckets);
    if (clusters.length === 0) return undefined;
    return {
      clusters,
      mean: toHex(mr / weight, mg / weight, mb / weight),
      // A tenth of the frame, so a photograph's own soft edge does not qualify
      // while a mark on a clear field always does.
      transparent: sheer / (SCAN * SCAN) > 0.1,
    };
  } catch {
    // A tainted canvas. The caller keeps its fallback.
    return undefined;
  }
}

/** A single known colour, in the shape the readability test expects. */
export function solidInk(hex: string): LogoInk {
  return { clusters: [{ hex, weight: 1 }], mean: hex, transparent: true };
}

/**
 * Would every significant part of this artwork be visible on `bg`?
 *
 * The question is deliberately unforgiving. A logo is one object: if its mark
 * disappears and its wordmark survives, the logo has not "mostly" rendered —
 * the brand's symbol is missing from its own card. So every cluster carrying at
 * least `SIGNIFICANT` of the ink has to clear the floor, and one failure is
 * enough to send the caller to another variant or another ground.
 */
export function inkReadsOn(ink: LogoInk | undefined, bg: string, minContrast: number): boolean {
  if (!ink) return false;
  const parts = ink.clusters.filter((c) => c.weight >= SIGNIFICANT);
  // An artwork of many tiny clusters (a photograph, a gradient mesh) has no
  // significant part; fall back to judging its average rather than passing it
  // for free.
  if (parts.length === 0) return contrastRatio(ink.mean, bg) >= minContrast;
  return parts.every((c) => contrastRatio(c.hex, bg) >= minContrast);
}

/**
 * How much of this artwork would be visible on `bg`, 0..1.
 *
 * The tie-breaker for the case with no good answer. A two-tone logo — a light
 * accent beside a dark body — has no flat ground where both halves clear the
 * floor: the accent wants a dark ground and the body wants a light one. Falling
 * back to the brand's initial there would be worse than showing the logo, so
 * the caller picks the pairing that loses the least.
 */
export function inkCoverage(ink: LogoInk | undefined, bg: string, minContrast: number): number {
  if (!ink || ink.clusters.length === 0) return 0;
  return ink.clusters
    .filter((c) => contrastRatio(c.hex, bg) >= minContrast)
    .reduce((sum, c) => sum + c.weight, 0);
}

/** The measured ink for a URL, or `undefined` if it has not been read yet. */
export function cachedLogoInk(url: string | undefined): LogoInk | undefined {
  return url ? cache.get(url) : undefined;
}

/** Measures once per URL, for the life of the tab. */
export function readLogoInk(url: string | undefined): Promise<LogoInk | undefined> {
  if (!url) return Promise.resolve(undefined);
  if (cache.has(url)) return Promise.resolve(cache.get(url));
  const existing = inflight.get(url);
  if (existing) return existing;

  const run = measure(url).then((ink) => {
    cache.set(url, ink);
    inflight.delete(url);
    return ink;
  });
  inflight.set(url, run);
  return run;
}

/**
 * Several urls at once, as a map.
 *
 * A card walks its brand's variants until one reads on the brand's colour, so
 * it needs the ink of each candidate, not just the first. The list is short
 * (a brand has a handful of variants), every url is measured once per tab, and
 * a url already in the cache is present on the first render.
 */
export function useLogoInks(urls: string[]): Record<string, LogoInk | undefined> {
  // The array identity changes every render; its CONTENT is what matters.
  const key = urls.join(' ');
  const [inks, setInks] = useState<Record<string, LogoInk | undefined>>(() =>
    Object.fromEntries(urls.map((u) => [u, cachedLogoInk(u)])),
  );

  useEffect(() => {
    const list = key ? key.split(' ') : [];
    let cancelled = false;
    setInks(Object.fromEntries(list.map((u) => [u, cachedLogoInk(u)])));
    void Promise.all(
      list.map(async (url) => [url, await readLogoInk(url)] as const),
    ).then((pairs) => {
      if (!cancelled) setInks(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return inks;
}

/**
 * How an image should sit in a card's band.
 *
 * `contain` until proven otherwise, in both directions: while the measurement
 * is in flight, and for anything with a transparent field. Filling the frame is
 * reserved for an image that is demonstrably a photograph, because that is the
 * only case where cropping costs nothing that matters.
 */
export function useImageFit(url: string | undefined): 'cover' | 'contain' {
  const inks = useLogoInks(url ? [url] : []);
  const ink = url ? inks[url] : undefined;
  if (!ink) return 'contain';
  return ink.transparent ? 'contain' : 'cover';
}

/** Test seam — drops what has been measured. */
export function __resetLogoInkCache(): void {
  cache.clear();
  inflight.clear();
}

/** Test seam — pretends a url has already been measured. */
export function __seedLogoInk(url: string, ink: LogoInk | undefined): void {
  cache.set(url, ink);
}
