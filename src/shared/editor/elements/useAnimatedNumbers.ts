/**
 * useAnimatedNumbers — the morph engine behind interactive charts.
 *
 * Give it the TARGET values; it returns values that ease toward them
 * (DS-family easeOutQuart, ~650ms) whenever the target changes, so every
 * chart geometry computed from the result glides instead of jumping —
 * bars grow, arcs re-sweep, lines reflow, and printed values count.
 *
 * On first mount it returns the target as-is (the CSS entrance in
 * elements.css owns the arrival); under prefers-reduced-motion it jumps.
 * A new value appearing mid-list animates up from 0.
 */
import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 650;
const ease = (t: number) => 1 - Math.pow(1 - t, 4);

export function useAnimatedNumbers(target: number[], duration = DURATION_MS): number[] {
  const [current, setCurrent] = useState(target);
  const currentRef = useRef(current);
  currentRef.current = current;
  const frameRef = useRef<number>(0);
  const key = target.join('|');

  useEffect(() => {
    const from = currentRef.current;
    const to = target;
    if (from.length === to.length && from.every((v, i) => v === to[i])) return;
    const reduced =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setCurrent(to);
      return;
    }
    const start = performance.now();
    const origin = to.map((_, i) => from[i] ?? 0);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = ease(t);
      setCurrent(to.map((v, i) => origin[i] + (v - origin[i]) * e));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, duration]);

  return current;
}

/** The same engine over a matrix (stacked/multi-series charts). */
export function useAnimatedSeries(target: number[][], duration = DURATION_MS): number[][] {
  const flat = useAnimatedNumbers(target.flat(), duration);
  const out: number[][] = [];
  let offset = 0;
  for (const row of target) {
    out.push(flat.slice(offset, offset + row.length));
    offset += row.length;
  }
  return out;
}
