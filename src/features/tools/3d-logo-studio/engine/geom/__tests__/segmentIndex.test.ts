import { describe, it, expect } from 'vitest';
import type { Ring } from '../../types';
import { SegmentIndex } from '../segmentIndex';
import { distanceToRings } from '../polygon';

const circle = (cx: number, cy: number, r: number, n = 96): Ring => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return Float64Array.from(p);
};

const square = (cx: number, cy: number, r: number): Ring =>
  Float64Array.from([cx - r, cy - r, cx + r, cy - r, cx + r, cy + r, cx - r, cy + r]);

describe('SegmentIndex', () => {
  it('agrees with the exact brute-force distance everywhere it is asked', () => {
    const rings = [circle(56.5, 56.5, 30), circle(20, 20, 8), square(90, 90, 12)];
    const idx = new SegmentIndex(rings);
    let worst = 0;
    for (let y = -20; y <= 140; y += 3.7) {
      for (let x = -20; x <= 140; x += 3.7) {
        worst = Math.max(worst, Math.abs(idx.distance(x, y) - distanceToRings(rings, x, y)));
      }
    }
    expect(worst).toBeLessThan(1e-9);
  });

  it('answers Infinity when there is no boundary at all', () => {
    expect(new SegmentIndex([]).distance(0, 0)).toBe(Infinity);
  });

  it('survives a degenerate ring with fewer than two points', () => {
    const idx = new SegmentIndex([Float64Array.from([5, 5])]);
    expect(idx.distance(0, 0)).toBe(Infinity);
  });

  it('is exact for a point far outside the shape', () => {
    const rings = [square(0, 0, 10)];
    const idx = new SegmentIndex(rings);
    expect(idx.distance(1000, 0)).toBeCloseTo(990, 6);
  });

  it('handles a zero-area shape without dividing by zero', () => {
    const flat: Ring = Float64Array.from([0, 0, 10, 0, 5, 0]);
    const idx = new SegmentIndex([flat]);
    expect(idx.distance(5, 4)).toBeCloseTo(4, 6);
  });

  it('is dramatically faster than brute force on a dense contour', () => {
    // 12 rings x 400 segments = 4,800 segments; 4,000 queries.
    const rings: Ring[] = [];
    for (let i = 0; i < 12; i++) rings.push(circle((i % 4) * 40, Math.floor(i / 4) * 40, 15, 400));
    const idx = new SegmentIndex(rings);
    const pts: [number, number][] = [];
    for (let i = 0; i < 4000; i++) pts.push([(i * 37) % 160, (i * 53) % 90]);

    const t0 = performance.now();
    for (const [x, y] of pts) idx.distance(x, y);
    const indexed = performance.now() - t0;

    const t1 = performance.now();
    for (const [x, y] of pts.slice(0, 400)) distanceToRings(rings, x, y);
    const bruteFor400 = performance.now() - t1;
    const bruteEstimate = bruteFor400 * 10;

    expect(indexed).toBeLessThan(bruteEstimate);
  });
});
