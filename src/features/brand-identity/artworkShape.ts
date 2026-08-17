/**
 * Does this artwork already say the name?
 *
 * Nothing stored answers this. A logo filed as `primary` is a symbol for one
 * brand and a logotype for the next, and the page needs to know which before it
 * decides whether to print the name beside it — otherwise a brand whose mark is
 * its name renders "Vector Vector" in its nav, "Vector Vector" on a post, and
 * the name twice down its own hero.
 *
 * The artwork's proportions answer it. A run much wider than it is tall is
 * letters; a compact one is a symbol. That is the same reasoning the onboarding
 * classifier uses on the pixels, at a fraction of the cost, because here it only
 * has to decide whether to print a word.
 *
 * `unknown` until the image loads, and `unknown` behaves as `symbol` — showing
 * the name for a moment and then removing it is a worse flicker than showing it
 * a moment late.
 */
import { useEffect, useState } from 'react';

export type ArtworkShape = 'unknown' | 'symbol' | 'name';

/** Wider than this, relative to its height, and it is a word. */
const WORDMARK_RATIO = 2.6;

const cache = new Map<string, ArtworkShape>();

export function useArtworkShape(url: string | undefined): ArtworkShape {
  const [shape, setShape] = useState<ArtworkShape>(() =>
    url ? cache.get(url) ?? 'unknown' : 'unknown',
  );

  useEffect(() => {
    if (!url) {
      setShape('unknown');
      return;
    }
    const known = cache.get(url);
    if (known) {
      setShape(known);
      return;
    }
    if (typeof Image === 'undefined') return;

    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      const { naturalWidth: w, naturalHeight: h } = img;
      // An SVG with no intrinsic size reports 0 — no measurement, no claim.
      const answer: ArtworkShape = !w || !h ? 'unknown' : w / h > WORDMARK_RATIO ? 'name' : 'symbol';
      cache.set(url, answer);
      setShape(answer);
    };
    img.onerror = () => {
      if (alive) setShape('unknown');
    };
    img.src = url;
    return () => {
      alive = false;
    };
  }, [url]);

  return shape;
}

/** True when printing the brand's name beside this artwork would say it twice. */
export function saysName(shape: ArtworkShape): boolean {
  return shape === 'name';
}
