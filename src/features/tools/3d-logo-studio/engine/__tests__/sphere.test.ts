/**
 * Sphere mode — "make it round".
 *
 * The invariant is exact and worth stating plainly: **a circle inflated at full
 * roundness must enclose the volume of a sphere.** Not "look round", not "be
 * rounder than before" — (4/3)πR³, measured with the divergence theorem.
 *
 * That is checkable because the profile family already contains the answer. For
 * a disc of radius R, a point at distance `d` from the boundary sits at radius
 * `r = R - d` from the centre, and a sphere's height there is `√(R² - r²)`.
 * Substituting `t = d/R` gives `R·√(1 - (1-t)²)`, which is the superellipse at
 * n = 2 — i.e. exactly `fullness: 0.5`. So a true hemisphere is not an
 * approximation of this generator, it is a member of it.
 */
import { describe, it, expect } from 'vitest';
import type { Component, MeshData, Ring } from '../types';
import { inflate, DEFAULT_SPHERE, DEFAULT_INFLATE } from '../modes/inflate';
import { signedVolume } from './solidity.test';

const FAR = 400;
const circle = (cx: number, cy: number, r: number, n = 256): Ring => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return Float64Array.from(p);
};
const comp = (id: string, rings: Ring[]): Component => ({ id, rings, fillRule: 'nonzero' });
const zRange = (m: MeshData) => {
  let lo = Infinity, hi = -Infinity;
  for (let i = 2; i < m.positions.length; i += 3) {
    if (m.positions[i] < lo) lo = m.positions[i];
    if (m.positions[i] > hi) hi = m.positions[i];
  }
  return { lo, hi };
};

describe('a circle becomes a sphere', () => {
  it('reaches its own radius in height', () => {
    const r = 11.1;
    const m = inflate([comp('d', [circle(FAR, FAR, r)])], { ...DEFAULT_SPHERE, quality: 0.8 });
    const { lo, hi } = zRange(m);
    expect(hi).toBeCloseTo(r, 0);
    expect(lo).toBeCloseTo(-r, 0);
  });

  it('encloses a sphere’s volume', () => {
    const r = 11.1;
    const m = inflate([comp('d', [circle(FAR, FAR, r, 512)])], { ...DEFAULT_SPHERE, quality: 1 });
    const expected = (4 / 3) * Math.PI * r * r * r;
    // A tessellated sphere sits slightly inside the true one.
    expect(Math.abs(signedVolume(m))).toBeGreaterThan(expected * 0.95);
    expect(Math.abs(signedVolume(m))).toBeLessThan(expected * 1.02);
  });

  it('works at any radius, without being told the radius', () => {
    // The whole point: an absolute thickness would need the user to know and
    // type each component's own size.
    for (const r of [3, 11.1, 40, 250]) {
      const m = inflate([comp('d', [circle(FAR * 2, FAR * 2, r, 384)])], { ...DEFAULT_SPHERE, quality: 0.9 });
      const expected = (4 / 3) * Math.PI * r ** 3;
      expect(Math.abs(signedVolume(m)) / expected, `r=${r}`).toBeGreaterThan(0.9);
      expect(Math.abs(signedVolume(m)) / expected, `r=${r}`).toBeLessThan(1.05);
    }
  });

  it('makes differently sized parts each fully round, in one pass', () => {
    // An absolute thickness cannot do this at all: one number is either right
    // for the big one or right for the small one.
    const big = comp('big', [circle(FAR, FAR, 30, 256)]);
    const small = comp('small', [circle(FAR + 120, FAR, 8, 256)]);
    const m = inflate([big, small], { ...DEFAULT_SPHERE, quality: 0.8 });
    const heightOf = (id: string) => {
      const g = m.groups.find((x) => x.componentId === id)!;
      let hi = -Infinity;
      for (let t = g.start; t < g.start + g.count; t++) hi = Math.max(hi, m.positions[m.indices[t] * 3 + 2]);
      return hi;
    };
    expect(heightOf('big')).toBeCloseTo(30, 0);
    expect(heightOf('small')).toBeCloseTo(8, 0);
  });

  it('roundness scales the swell without moving the silhouette', () => {
    const r = 20;
    const full = inflate([comp('d', [circle(FAR, FAR, r, 256)])], { ...DEFAULT_SPHERE });
    const half = inflate([comp('d', [circle(FAR, FAR, r, 256)])], { ...DEFAULT_SPHERE, roundness: 0.5 });
    expect(zRange(half).hi).toBeCloseTo(zRange(full).hi / 2, 0);
    for (const m of [full, half]) {
      for (let i = 0; i < m.positions.length; i += 3) {
        const d = Math.hypot(m.positions[i] - FAR, m.positions[i + 1] - FAR);
        expect(d).toBeLessThanOrEqual(r + 1e-3);
      }
    }
  });

  it('roundness 0 is flat, and still a valid surface', () => {
    const m = inflate([comp('d', [circle(FAR, FAR, 20, 128)])], { ...DEFAULT_SPHERE, roundness: 0 });
    expect(zRange(m).hi).toBeCloseTo(0, 6);
    expect(m.indices.length).toBeGreaterThan(0);
    for (const v of m.positions) expect(Number.isFinite(v)).toBe(true);
  });

  it('balance puts the whole ball in front', () => {
    const r = 11.1;
    const m = inflate([comp('d', [circle(FAR, FAR, r, 256)])], { ...DEFAULT_SPHERE, balance: 1 });
    expect(zRange(m).lo).toBeCloseTo(0, 6);
    expect(zRange(m).hi).toBeCloseTo(2 * r, 0);
  });

  it('a square becomes a pill, not a ball — roundness follows the shape', () => {
    const half = 20;
    const sq: Ring = Float64Array.from([
      FAR - half, FAR - half, FAR + half, FAR - half, FAR + half, FAR + half, FAR - half, FAR + half,
    ]);
    const m = inflate([comp('s', [sq])], { ...DEFAULT_SPHERE, quality: 0.8 });
    // its inradius is `half`, so that is how high it climbs
    expect(zRange(m).hi).toBeCloseTo(half, 0);
    // and it holds far more than a ball of that radius would
    expect(Math.abs(signedVolume(m))).toBeGreaterThan((4 / 3) * Math.PI * half ** 3);
  });

  it('is the same generator as Inflate, differing only in what it measures', () => {
    expect(DEFAULT_SPHERE.scale).toBe('ball-union');
    expect(DEFAULT_INFLATE.scale).toBe('absolute');
    // Inflate is unchanged by the addition.
    const r = 20;
    const absolute = inflate([comp('d', [circle(FAR, FAR, r, 192)])], { thickness: 6 });
    expect(zRange(absolute).hi).toBeCloseTo(6, 1);
  });

  it('a thin bar cannot be a ball, and is not pretended into one', () => {
    const bar: Ring = Float64Array.from([FAR, FAR, FAR + 120, FAR, FAR + 120, FAR + 6, FAR, FAR + 6]);
    const m = inflate([comp('b', [bar])], { ...DEFAULT_SPHERE, quality: 0.8 });
    // its inradius is 3, so that is the most it can swell
    expect(zRange(m).hi).toBeLessThan(4);
    expect(zRange(m).hi).toBeGreaterThan(1.5);
  });
});


describe('the reference shape: balls joined by necks', () => {
  /** A capsule outline — two circles joined by a rectangle. */
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

  const R = 40;
  const neck = 9;
  /** One path: a big disc with a thin bar running off it. */
  const mark = comp('mark', [circle(FAR, FAR, R, 256), capsule(FAR + R - 4, FAR + R + 120, FAR, neck, 128)]);

  const heightAt = (m: MeshData, x: number, y: number, tolerance = 3) => {
    let best = 0;
    for (let i = 0; i < m.positions.length; i += 3) {
      if (Math.abs(m.positions[i] - x) < tolerance && Math.abs(m.positions[i + 1] - y) < tolerance) {
        best = Math.max(best, m.positions[i + 2]);
      }
    }
    return best;
  };

  it('the ball is a ball and the neck is a neck, in one mesh', () => {
    // This is what a single per-component reach cannot do: measured from the
    // ball, the neck comes out as fat as the ball.
    const m = inflate([mark], { ...DEFAULT_SPHERE, quality: 0.9 });
    expect(heightAt(m, FAR, FAR)).toBeCloseTo(R, -0.6);
    expect(heightAt(m, FAR + R + 80, FAR)).toBeCloseTo(neck, -0.6);
  });

  it('the single-reach approximation gets it wrong, which is why ball-union exists', () => {
    const rounded = inflate([mark], { ...DEFAULT_SPHERE, scale: 'round', quality: 0.9 });
    // A reach taken from the disc lifts the neck far above its own width.
    expect(heightAt(rounded, FAR + R + 80, FAR)).toBeGreaterThan(neck * 1.8);
  });

  // KNOWN LIMITATION, deliberately recorded rather than deleted.
  //
  // When two subpaths of ONE component overlap — a disc with a bar drawn
  // straight through it — their outlines cross, and at the crossing the mesher
  // leaves a ring of unmatched edges. The surface is right and it renders
  // correctly; it is not a closed manifold, so a GLB of it would not be
  // watertight. Non-overlapping subpaths, holes, and separate components are all
  // closed (every other test in this file and in solidity.test.ts).
  //
  // The fix is not more filtering in the sampler — several were tried and each
  // traded this hole for a worse one. It is to resolve overlapping subpaths into
  // a single outline with a polygon boolean union before sampling, which is a
  // standard operation and a small dependency. Scheduled with the Phase 4 import
  // work, where stroke outlining needs the same machinery.
  it.fails('is still one closed solid when subpaths overlap', () => {
    const m = inflate([mark], { ...DEFAULT_SPHERE, quality: 0.8 });
    const seen = new Map<string, number>();
    for (let t = 0; t < m.indices.length; t += 3) {
      const v = [m.indices[t], m.indices[t + 1], m.indices[t + 2]];
      for (let e = 0; e < 3; e++) {
        const a = v[e], b = v[(e + 1) % 3];
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
    }
    let open = 0;
    for (const n of seen.values()) if (n !== 2) open++;
    expect(open).toBe(0);
  });

  it('the silhouette is still exactly the artwork', () => {
    const m = inflate([mark], { ...DEFAULT_SPHERE, quality: 0.8 });
    for (let i = 0; i < m.positions.length; i += 3) {
      const x = m.positions[i] - FAR;
      const y = m.positions[i + 1] - FAR;
      const inDisc = Math.hypot(x, y) <= R + 0.01;
      const inBar = x >= R - 4 - neck - 0.01 && x <= R + 120 + neck + 0.01 && Math.abs(y) <= neck + 0.01;
      expect(inDisc || inBar, `(${x.toFixed(1)}, ${y.toFixed(1)})`).toBe(true);
    }
  });
});
