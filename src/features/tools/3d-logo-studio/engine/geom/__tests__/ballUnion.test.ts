/**
 * The ball-union field, checked against shapes whose answer is known exactly.
 *
 * The reference renders are made of balls joined by necks, and the single thing
 * that distinguishes this construction from a profile-based one is that the
 * necks stay thin while the balls stay round. That is the last test here, and it
 * is the one that matters.
 */
import { describe, it, expect } from 'vitest';
import type { Component, Ring } from '../../types';
import { ballUnionField } from '../ballUnion';

const circle = (cx: number, cy: number, r: number, n = 256): Ring => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return Float64Array.from(p);
};
const comp = (id: string, rings: Ring[], fr: 'nonzero' | 'evenodd' = 'nonzero'): Component =>
  ({ id, rings, fillRule: fr });

/** A capsule outline: two circles of radius r joined by a rectangle. */
const capsule = (x0: number, x1: number, y: number, r: number, n = 128): Ring => {
  const p: number[] = [];
  for (let i = 0; i <= n / 2; i++) {
    const a = -Math.PI / 2 + (i / (n / 2)) * Math.PI;
    p.push(x1 + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  for (let i = 0; i <= n / 2; i++) {
    const a = Math.PI / 2 + (i / (n / 2)) * Math.PI;
    p.push(x0 + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  return Float64Array.from(p);
};

describe('a circle', () => {
  it('becomes a sphere: height at the centre is the radius', () => {
    const r = 40;
    const f = ballUnionField(comp('c', [circle(0, 0, r)]), 400);
    expect(f.sample(0, 0)).toBeCloseTo(r, 0);
    expect(f.peak).toBeCloseTo(r, 0);
  });

  it('follows sqrt(R² - d²) all the way out', () => {
    const r = 40;
    const f = ballUnionField(comp('c', [circle(0, 0, r)]), 500);
    for (const d of [0, 8, 16, 24, 32, 38]) {
      expect(f.sample(d, 0), `d=${d}`).toBeCloseTo(Math.sqrt(r * r - d * d), 0);
    }
  });

  it('is zero on and outside the boundary', () => {
    const r = 40;
    const f = ballUnionField(comp('c', [circle(0, 0, r)]), 400);
    expect(f.sample(r + 2, 0)).toBe(0);
    expect(f.sample(100, 100)).toBe(0);
    expect(f.sample(r, 0)).toBeLessThan(1.5);
  });
});

describe('a stroke', () => {
  it('becomes a capsule: half-thickness equals the stroke’s half-width', () => {
    // A profile generator measuring one reach for the component would raise this
    // to whatever the widest part of the mark happened to be.
    const half = 10;
    const f = ballUnionField(comp('s', [capsule(-80, 80, 0, half)]), 400);
    expect(f.sample(0, 0)).toBeCloseTo(half, 0);
    expect(f.peak).toBeCloseTo(half, 0);
  });

  it('is round in cross-section along its length', () => {
    const half = 10;
    const f = ballUnionField(comp('s', [capsule(-80, 80, 0, half)]), 500);
    for (const off of [0, 3, 6, 9]) {
      expect(f.sample(0, off), `off=${off}`).toBeCloseTo(Math.sqrt(half * half - off * off), 0);
    }
  });
});

describe('a ball joined to a neck — the reference shape', () => {
  const R = 40;
  const neck = 9;
  const shape = () => comp('m', [circle(0, 0, R, 256)], 'nonzero');

  it('keeps the neck thin while the ball stays round', () => {
    // The whole point. Two components in one path: a big disc and a thin bar
    // running off it. A single reach cannot describe both.
    const both = comp('m', [circle(0, 0, R, 256), capsule(R - 4, R + 120, 0, neck, 128)]);
    const f = ballUnionField(both, 500);
    expect(f.sample(0, 0)).toBeCloseTo(R, 0);          // the ball is a ball
    expect(f.sample(R + 80, 0)).toBeCloseTo(neck, 0);  // the neck is a neck
    // and the neck is nowhere near the ball's height
    expect(f.sample(R + 80, 0)).toBeLessThan(R * 0.35);
  });

  it('flares smoothly where they meet, rather than stepping', () => {
    const both = comp('m', [circle(0, 0, R, 256), capsule(R - 4, R + 120, 0, neck, 128)]);
    const f = ballUnionField(both, 500);
    let previous = f.sample(R - 6, 0);
    let biggestJump = 0;
    for (let x = R - 6; x < R + 60; x += 1) {
      const v = f.sample(x, 0);
      biggestJump = Math.max(biggestJump, Math.abs(v - previous));
      previous = v;
    }
    // A monotone flare over ~66 units from 40 down to 9 cannot step by 4 at once.
    expect(biggestJump).toBeLessThan(4);
  });

  it('the join is filled, not a crease between two separate solids', () => {
    const both = comp('m', [circle(0, 0, R, 256), capsule(R - 4, R + 120, 0, neck, 128)]);
    const f = ballUnionField(both, 500);
    // Walking out from the ball to the neck, the surface falls away smoothly and
    // never pinches to nothing. A crease between two solids would show as a dip
    // below the neck's own half-width where the two meet.
    let previous = Infinity;
    for (let x = 0; x <= R + 100; x += 1) {
      const v = f.sample(x, 0);
      expect(v, `x=${x}`).toBeGreaterThan(neck - 0.6);
      // and it is monotone: no bump back up on the way out
      expect(v, `x=${x}`).toBeLessThanOrEqual(previous + 0.3);
      previous = v;
    }
    // at the disc's own edge the surface is still far above the neck, because
    // the balls just inside it are much larger than the neck's
    expect(f.sample(R - 6, 0)).toBeGreaterThan(neck * 1.5);
  });

  it('a plain distance field would get this wrong, which is why this exists', () => {
    const f = ballUnionField(shape(), 400);
    // distance-to-boundary at the centre of a disc is R, and so is the ball
    // union — they agree here...
    expect(f.sample(0, 0)).toBeCloseTo(R, 0);
    // ...but halfway out the distance field says R/2 while a sphere says
    // sqrt(R² - (R/2)²) = 0.866R. The field must give the sphere.
    expect(f.sample(R / 2, 0)).toBeCloseTo(R * Math.sqrt(3) / 2, 0);
    expect(f.sample(R / 2, 0)).toBeGreaterThan(R / 2 + 5);
  });
});

describe('holes and edges', () => {
  it('a hole pushes the surface down to nothing', () => {
    const outer = circle(0, 0, 60, 256);
    const holeRing = Float64Array.from(
      Array.from({ length: 128 }, (_, i) => {
        const a = -(i / 128) * Math.PI * 2;
        return [Math.cos(a) * 25, Math.sin(a) * 25];
      }).flat(),
    );
    const f = ballUnionField(comp('o', [outer, holeRing]), 500);
    expect(f.sample(0, 0)).toBe(0);
    // the ribbon between 25 and 60 is 17.5 half-width, so it peaks near there
    expect(f.sample(42.5, 0)).toBeCloseTo(17.5, 0);
  });

  it('returns an empty field for degenerate input rather than throwing', () => {
    expect(ballUnionField(comp('x', []), 200).peak).toBe(0);
    expect(ballUnionField(comp('x', [Float64Array.from([0, 0, 1, 1])]), 200).peak).toBe(0);
    expect(ballUnionField(comp('x', [circle(0, 0, 0)]), 200).sample(0, 0)).toBe(0);
  });

  it('gets more accurate with resolution, and is close even when coarse', () => {
    const r = 40;
    const coarse = ballUnionField(comp('c', [circle(0, 0, r)]), 64);
    const fine = ballUnionField(comp('c', [circle(0, 0, r)]), 512);
    expect(Math.abs(fine.sample(0, 0) - r)).toBeLessThan(Math.abs(coarse.sample(0, 0) - r) + 0.5);
    expect(coarse.sample(0, 0)).toBeGreaterThan(r * 0.9);
  });

  it('scales with the artwork', () => {
    for (const scale of [0.1, 1, 25]) {
      const f = ballUnionField(comp('c', [circle(0, 0, 40 * scale)]), 400);
      expect(f.sample(0, 0) / scale, `scale=${scale}`).toBeCloseTo(40, 0);
    }
  });
});
