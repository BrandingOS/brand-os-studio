/**
 * What colour a logo actually IS.
 *
 * Every contrast decision in the app has, until now, guessed: a coloured
 * variant was assumed to be inked in the brand's primary colour, because that
 * is the only colour the record carries. The guess is right often enough to
 * hide how badly it fails when it is wrong — a lockup whose wordmark is dark
 * grey beside a yellow mark scores as YELLOW, sails past the contrast floor on
 * a near-black card, and renders as a yellow asterisk beside an invisible name.
 *
 * So this reads the artwork. It draws the logo small, averages the ink it finds
 * — weighted by alpha, so the transparent field around a mark does not count as
 * white — and reports the colour a human would say the logo is. That answer
 * feeds the ordinary contrast helpers, which then work on a fact instead of an
 * assumption.
 *
 * Cheap by construction: 32×32, one decode per URL for the life of the tab, and
 * every failure (a tainted canvas, a URL that will not load, an SVG with no
 * intrinsic size) resolves to `undefined` rather than throwing — callers fall
 * back to the guess, which is exactly where they were before.
 */
import { useEffect, useState } from 'react';

/** Edge length of the scan. Big enough to average, small enough to be free. */
const SCAN = 32;

/** Below this alpha a pixel is the field around the mark, not the mark. */
const MIN_ALPHA = 24;

/** Fewer inked pixels than this and there is nothing to average. */
const MIN_INKED = 8;

const cache = new Map<string, string | undefined>();
const inflight = new Map<string, Promise<string | undefined>>();

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

async function measure(url: string): Promise<string | undefined> {
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
    let r = 0;
    let g = 0;
    let b = 0;
    let weight = 0;
    let inked = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]!;
      if (a < MIN_ALPHA) continue;
      const w = a / 255;
      r += data[i]! * w;
      g += data[i + 1]! * w;
      b += data[i + 2]! * w;
      weight += w;
      inked += 1;
    }
    if (inked < MIN_INKED || weight === 0) return undefined;
    return toHex(r / weight, g / weight, b / weight);
  } catch {
    // A tainted canvas. The caller keeps its guess.
    return undefined;
  }
}

/** The measured ink for a URL, or `undefined` if it has not been read yet. */
export function cachedLogoInk(url: string | undefined): string | undefined {
  return url ? cache.get(url) : undefined;
}

/** Measures once per URL, for the life of the tab. */
export function readLogoInk(url: string | undefined): Promise<string | undefined> {
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
 * The measured ink, as state.
 *
 * Returns whatever is already cached on the first render — so a logo seen once
 * never flashes again — and updates when the measurement lands.
 */
export function useLogoInk(url: string | undefined): string | undefined {
  const [ink, setInk] = useState<string | undefined>(() => cachedLogoInk(url));

  useEffect(() => {
    if (!url) {
      setInk(undefined);
      return;
    }
    const known = cachedLogoInk(url);
    if (known !== undefined) {
      setInk(known);
      return;
    }
    let cancelled = false;
    void readLogoInk(url).then((next) => {
      if (!cancelled) setInk(next);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return ink;
}

/**
 * Several urls at once, as a map.
 *
 * A card walks its brand's variants until one reads on the brand's colour, so
 * it needs the ink of each candidate, not just the first. The list is short
 * (a brand has a handful of variants), every url is measured once per tab, and
 * a url already in the cache is present on the first render.
 */
export function useLogoInks(urls: string[]): Record<string, string | undefined> {
  // The array identity changes every render; its CONTENT is what matters.
  const key = urls.join('\u0000');
  const [inks, setInks] = useState<Record<string, string | undefined>>(() =>
    Object.fromEntries(urls.map((u) => [u, cachedLogoInk(u)])),
  );

  useEffect(() => {
    const list = key ? key.split('\u0000') : [];
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

/** Test seam — drops what has been measured. */
export function __resetLogoInkCache(): void {
  cache.clear();
  inflight.clear();
}
