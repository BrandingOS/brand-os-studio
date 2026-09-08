import { describe, it, expect } from 'vitest';
import type { Component, MeshData, Ring } from '../../types';
import { extrude, flat, DEFAULT_EXTRUDE } from '../extrude';

const circle = (cx: number, cy: number, r: number, n = 64): Ring => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return Float64Array.from(p);
};
const square = (cx: number, cy: number, r: number, ccw = true): Ring => {
  const p = [cx - r, cy - r, cx + r, cy - r, cx + r, cy + r, cx - r, cy + r];
  return Float64Array.from(ccw ? p : [p[0], p[1], p[6], p[7], p[4], p[5], p[2], p[3]]);
};
const comp = (id: string, rings: Ring[], fillRule: 'nonzero' | 'evenodd' = 'nonzero'): Component =>
  ({ id, rings, fillRule });

const zOf = (m: MeshData) => {
  let min = Infinity, max = -Infinity;
  for (let i = 2; i < m.positions.length; i += 3) {
    if (m.positions[i] < min) min = m.positions[i];
    if (m.positions[i] > max) max = m.positions[i];
  }
  return { min, max };
};

describe('extrude', () => {
  it('returns an empty mesh for no components', () => {
    expect(extrude([]).indices).toHaveLength(0);
  });

  it('spans exactly the requested depth, centred by default', () => {
    const m = extrude([comp('a', [circle(0, 0, 20)])], { depth: 10 });
    expect(zOf(m).max).toBeCloseTo(5, 6);
    expect(zOf(m).min).toBeCloseTo(-5, 6);
  });

  it('honours front, center and back alignment', () => {
    const front = extrude([comp('a', [square(0, 0, 10)])], { depth: 10, alignment: 'front' });
    expect(zOf(front).max).toBeCloseTo(0, 6);
    expect(zOf(front).min).toBeCloseTo(-10, 6);

    const back = extrude([comp('a', [square(0, 0, 10)])], { depth: 10, alignment: 'back' });
    expect(zOf(back).max).toBeCloseTo(10, 6);
    expect(zOf(back).min).toBeCloseTo(0, 6);
  });

  it('keeps components addressable', () => {
    const m = extrude([comp('a', [square(0, 0, 5)]), comp('b', [square(20, 0, 5)])], { depth: 4 });
    expect(m.groups.map((g) => g.componentId)).toEqual(['a', 'b']);
    expect(m.groups.every((g) => g.count > 0)).toBe(true);
  });

  it('cuts a hole right through the solid', () => {
    const m = extrude([comp('o', [square(0, 0, 30), square(0, 0, 10, false)])], { depth: 6 });
    // no cap geometry over the hole, at either end
    for (let i = 0; i < m.positions.length; i += 3) {
      const inHole = Math.abs(m.positions[i]) < 9 && Math.abs(m.positions[i + 1]) < 9;
      const onCap = Math.abs(Math.abs(m.positions[i + 2]) - 3) < 1e-6;
      expect(inHole && onCap).toBe(false);
    }
  });

  it('drops a cap when asked and keeps the wall', () => {
    const both = extrude([comp('a', [square(0, 0, 10)])], { depth: 6 });
    const openBack = extrude([comp('a', [square(0, 0, 10)])], { depth: 6, capBack: false });
    expect(openBack.indices.length).toBeLessThan(both.indices.length);
    expect(openBack.indices.length).toBeGreaterThan(0);
    expect(zOf(openBack).min).toBeCloseTo(-3, 6); // the wall still reaches the back
  });

  it('a bevel eats into the depth without exceeding it', () => {
    const plain = extrude([comp('a', [circle(0, 0, 20, 96)])], { depth: 10 });
    const bev = extrude([comp('a', [circle(0, 0, 20, 96)])], {
      depth: 10, bevelSize: 3, bevelThickness: 2, bevelSegments: 4,
    });
    expect(zOf(bev).max).toBeCloseTo(zOf(plain).max, 6);
    expect(bev.positions.length).toBeGreaterThan(plain.positions.length);
    // the outline itself is pulled down by the full bevel thickness
    let rimZ = -Infinity;
    for (let i = 0; i < bev.positions.length; i += 3) {
      const r = Math.hypot(bev.positions[i], bev.positions[i + 1]);
      if (Math.abs(r - 20) < 1e-6) rimZ = Math.max(rimZ, bev.positions[i + 2]);
    }
    expect(rimZ).toBeCloseTo(3, 1); // 5 - 2
  });

  it('a bevel wider than a thin stroke rounds it over instead of producing garbage', () => {
    // a 4-unit-wide bar with a 6-unit bevel: an inward offset would self-intersect
    const bar = comp('bar', [Float64Array.from([0, 0, 80, 0, 80, 4, 0, 4])]);
    const m = extrude([bar], { depth: 10, bevelSize: 6, bevelThickness: 3 });
    expect(m.indices.length).toBeGreaterThan(0);
    for (const v of m.positions) expect(Number.isFinite(v)).toBe(true);
    expect(zOf(m).max).toBeLessThanOrEqual(5 + 1e-6);
    expect(zOf(m).min).toBeGreaterThanOrEqual(-5 - 1e-6);
  });

  it('never clamps the bevel past half the depth', () => {
    const m = extrude([comp('a', [square(0, 0, 20)])], { depth: 4, bevelSize: 5, bevelThickness: 50 });
    expect(zOf(m).max).toBeLessThanOrEqual(2 + 1e-6);
    expect(zOf(m).min).toBeGreaterThanOrEqual(-2 - 1e-6);
  });

  it('curve quality changes the tessellation but not the size', () => {
    const low = extrude([comp('a', [circle(0, 0, 20, 200)])], { depth: 5, curveQuality: 0 });
    const high = extrude([comp('a', [circle(0, 0, 20, 200)])], { depth: 5, curveQuality: 1 });
    expect(high.positions.length).toBeGreaterThan(low.positions.length);
    expect(zOf(low)).toEqual(zOf(high));
  });

  it('emits unit normals', () => {
    const m = extrude([comp('a', [circle(0, 0, 20)])], { depth: 6 });
    for (let i = 0; i < m.normals.length; i += 3) {
      expect(Math.hypot(m.normals[i], m.normals[i + 1], m.normals[i + 2])).toBeCloseTo(1, 4);
    }
  });

  it('defaults to no bevel, so the common case is the cheap path', () => {
    expect(DEFAULT_EXTRUDE.bevelSize).toBe(0);
    expect(DEFAULT_EXTRUDE.alignment).toBe('center');
  });
});

describe('flat', () => {
  it('is a surface with no depth by default', () => {
    const m = flat([comp('a', [circle(0, 0, 20)])]);
    expect(m.indices.length).toBeGreaterThan(0);
    expect(zOf(m).max).toBeCloseTo(0, 9);
    expect(zOf(m).min).toBeCloseTo(0, 9);
  });

  it('can show one side only', () => {
    const both = flat([comp('a', [circle(0, 0, 20)])]);
    const oneSided = flat([comp('a', [circle(0, 0, 20)])], { showBack: false });
    expect(oneSided.indices.length).toBeCloseTo(both.indices.length / 2, -1);
  });

  it('becomes a thin solid when given a thickness', () => {
    const m = flat([comp('a', [square(0, 0, 10)])], { thickness: 0.4 });
    expect(zOf(m).max).toBeCloseTo(0.2, 6);
    expect(zOf(m).min).toBeCloseTo(-0.2, 6);
  });

  it('respects holes', () => {
    const m = flat([comp('o', [square(0, 0, 30), square(0, 0, 10, false)])]);
    for (let i = 0; i < m.positions.length; i += 3) {
      const inHole = Math.abs(m.positions[i]) < 9 && Math.abs(m.positions[i + 1]) < 9;
      expect(inHole).toBe(false);
    }
  });
});
