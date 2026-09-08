import { describe, it, expect } from 'vitest';
import type { Component, MeshData, Ring } from '../../types';
import { inflate, inflateProfile, DEFAULT_INFLATE } from '../inflate';

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
/** Two blobs joined by a hairline — the shape a bevel-based inflate destroys. */
const dumbbell = (bridge: number): Ring => {
  const pts: number[] = [];
  const lobe = (cx: number, from: number, to: number) => {
    for (let i = 0; i <= 32; i++) {
      const a = from + ((to - from) * i) / 32;
      pts.push(cx + Math.cos(a) * 10, Math.sin(a) * 10);
    }
  };
  lobe(-14, Math.PI * 0.5, Math.PI * 1.5);
  pts.push(-14, -bridge / 2, 14, -bridge / 2);
  lobe(14, -Math.PI * 0.5, Math.PI * 0.5);
  pts.push(14, bridge / 2, -14, bridge / 2);
  return Float64Array.from(pts);
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

/** Every edge must be shared by exactly two triangles for the solid to be closed. */
const isWatertight = (m: MeshData): { ok: boolean; open: number } => {
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
  return { ok: open === 0, open };
};

describe('inflateProfile', () => {
  it('is pinned at both ends whatever the settings', () => {
    for (const f of [0, 0.5, 1]) for (const e of [0, 0.5, 1]) {
      expect(inflateProfile(0, f, e)).toBe(0);
      expect(inflateProfile(1, f, e)).toBe(1);
    }
  });
  it('is monotonic — the surface never dips on the way to the middle', () => {
    for (const f of [0, 0.25, 0.5, 0.75, 1]) for (const e of [0, 0.5, 1]) {
      let prev = -1;
      for (let t = 0; t <= 1.0001; t += 0.01) {
        const v = inflateProfile(t, f, e);
        expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
        prev = v;
      }
    }
  });
  it('is a straight cone at fullness 0 and a circular dome at 0.5', () => {
    expect(inflateProfile(0.5, 0, 0)).toBeCloseTo(0.5, 6);           // linear
    expect(inflateProfile(0.5, 0.5, 0)).toBeCloseTo(Math.sqrt(0.75), 6); // sqrt(1-(1-t)^2)
  });
  it('rises faster near the rim as fullness goes up', () => {
    expect(inflateProfile(0.1, 1, 0)).toBeGreaterThan(inflateProfile(0.1, 0, 0));
  });
  it('rises more gently near the rim as edge softness goes up', () => {
    expect(inflateProfile(0.05, 0.5, 1)).toBeLessThan(inflateProfile(0.05, 0.5, 0));
  });
});

describe('inflate', () => {
  it('returns an empty mesh for no components rather than throwing', () => {
    const m = inflate([]);
    expect(m.positions).toHaveLength(0);
    expect(m.indices).toHaveLength(0);
  });

  it('produces a closed, watertight solid from a single disc', () => {
    const m = inflate([comp('a', [circle(0, 0, 20)])], { thickness: 6 });
    expect(m.indices.length).toBeGreaterThan(300);
    expect(isWatertight(m).open).toBe(0);
  });

  it('reaches the requested thickness and no further', () => {
    const m = inflate([comp('a', [circle(0, 0, 20)])], { thickness: 6, balance: 0.5, smoothness: 0 });
    const z = zOf(m);
    expect(z.max).toBeCloseTo(6, 1);
    expect(z.min).toBeCloseTo(-6, 1);
  });

  it('puts all the volume in front at balance 1 and leaves the back flat', () => {
    const m = inflate([comp('a', [circle(0, 0, 20)])], { thickness: 6, balance: 1, smoothness: 0 });
    const z = zOf(m);
    expect(z.max).toBeCloseTo(12, 1);
    expect(z.min).toBeCloseTo(0, 6);
  });

  it('keeps the silhouette exactly on the outline — nothing spills past it', () => {
    const r = 20;
    const m = inflate([comp('a', [circle(0, 0, r, 128)])], { thickness: 8 });
    for (let i = 0; i < m.positions.length; i += 3) {
      expect(Math.hypot(m.positions[i], m.positions[i + 1])).toBeLessThanOrEqual(r + 1e-6);
    }
  });

  it('pins the rim to z = 0 so the two surfaces weld', () => {
    const r = 20;
    const m = inflate([comp('a', [circle(0, 0, r, 128)])], { thickness: 8 });
    for (let i = 0; i < m.positions.length; i += 3) {
      const onRim = Math.abs(Math.hypot(m.positions[i], m.positions[i + 1]) - r) < 1e-6;
      if (onRim) expect(Math.abs(m.positions[i + 2])).toBeLessThan(1e-9);
    }
  });

  it('keeps nine components separate and identifiable', () => {
    const centres = [
      [78.3, 11.1], [101.9, 34.7], [56.5, 56.5], [34.7, 11.1], [78.3, 101.9],
      [34.7, 101.9], [11.1, 34.7], [101.9, 78.3], [11.1, 78.3],
    ];
    const comps = centres.map(([x, y], i) => comp(`dot-${i}`, [circle(x, y, 11.1, 48)]));
    const m = inflate(comps, { thickness: 5 });
    expect(m.groups).toHaveLength(9);
    expect(new Set(m.groups.map((g) => g.componentId)).size).toBe(9);
    for (const g of m.groups) expect(g.count).toBeGreaterThan(0);
    // the groups tile the index buffer with no gap and no overlap
    const sorted = [...m.groups].sort((a, b) => a.start - b.start);
    let cursor = 0;
    for (const g of sorted) {
      expect(g.start).toBe(cursor);
      cursor += g.count;
    }
    expect(cursor).toBe(m.indices.length);
  });

  it('pushes the surface down around a hole instead of roofing over it', () => {
    // a narrow ribbon: outer half-width 30, hole at 26, so the solid part is
    // only 4 units across and cannot reach the 8 a wide shape would
    const m = inflate([comp('o', [square(0, 0, 30), square(0, 0, 26, false)])], { thickness: 8, smoothness: 0 });
    for (let i = 0; i < m.positions.length; i += 3) {
      const inHole = Math.abs(m.positions[i]) < 25.5 && Math.abs(m.positions[i + 1]) < 25.5;
      expect(inHole).toBe(false);
    }
    expect(zOf(m).max).toBeGreaterThan(0);
    expect(zOf(m).max).toBeLessThan(8);
  });

  it('a wide shape does reach full thickness where a narrow one cannot', () => {
    const wide = inflate([comp('w', [square(0, 0, 30)])], { thickness: 8, smoothness: 0 });
    expect(zOf(wide).max).toBeCloseTo(8, 1);
  });

  it('survives a hairline bridge — the case a bevel cannot do', () => {
    for (const bridge of [6, 2, 0.8]) {
      const m = inflate([comp('d', [dumbbell(bridge)])], { thickness: 5, smoothness: 0 });
      expect(m.indices.length).toBeGreaterThan(60);
      // nothing inverted, nothing NaN
      for (const v of m.positions) expect(Number.isFinite(v)).toBe(true);
      // the bridge stays thin: no vertex over the bridge reaches full height
      let peakOnBridge = 0;
      for (let i = 0; i < m.positions.length; i += 3) {
        if (Math.abs(m.positions[i]) < 3) peakOnBridge = Math.max(peakOnBridge, m.positions[i + 2]);
      }
      expect(peakOnBridge).toBeLessThan(5);
      if (bridge <= 2) expect(peakOnBridge).toBeLessThan(3);
    }
  });

  it('never lets a thin feature rise as high as a fat one', () => {
    const thin = inflate([comp('t', [Float64Array.from([0, 0, 60, 0, 60, 3, 0, 3])])], { thickness: 10, smoothness: 0 });
    const fat = inflate([comp('f', [Float64Array.from([0, 0, 60, 0, 60, 40, 0, 40])])], { thickness: 10, smoothness: 0 });
    expect(zOf(thin).max).toBeLessThan(zOf(fat).max * 0.5);
    expect(zOf(fat).max).toBeCloseTo(10, 1);
  });

  it('gives a hairline stroke real geometry instead of a flat sheet', () => {
    // 0.6 units across in a 60-unit shape — far thinner than the default sample
    // spacing, so this only works because sampling refines until it bites
    const hair = inflate([comp('h', [Float64Array.from([0, 0, 60, 0, 60, 0.6, 0, 0.6])])], { thickness: 6, smoothness: 0 });
    expect(hair.indices.length).toBeGreaterThan(0);
    expect(zOf(hair).max).toBeGreaterThan(0);
    expect(isWatertight(hair).open).toBe(0);
  });

  it('leaves no flat facets on the rim', () => {
    // Every vertex of such a triangle sits on the rim plane, so it is a flat
    // sliver between two boundary points. A ring of them around the outline is
    // what made the first render of the inflated mark look serrated along the
    // bottom edge of every dome.
    const m = inflate([comp('a', [circle(0, 0, 20, 128)])], { thickness: 7, quality: 0.5 });
    let flatOnes = 0;
    for (let t = 0; t < m.indices.length; t += 3) {
      const z0 = m.positions[m.indices[t] * 3 + 2];
      const z1 = m.positions[m.indices[t + 1] * 3 + 2];
      const z2 = m.positions[m.indices[t + 2] * 3 + 2];
      if (Math.abs(z0) < 1e-9 && Math.abs(z1) < 1e-9 && Math.abs(z2) < 1e-9) flatOnes++;
    }
    expect(flatOnes).toBe(0);
  });

  it('gives the rim a proper strip of geometry rather than one long triangle', () => {
    // With an inset ring, the vertices nearest the outline sit a fraction of the
    // sample spacing in, not a whole grid step.
    const m = inflate([comp('a', [circle(0, 0, 20, 128)])], { thickness: 7, quality: 0.5, smoothness: 0 });
    let lowestNonZero = Infinity;
    for (let i = 0; i < m.positions.length; i += 3) {
      const z = m.positions[i + 2];
      if (z > 1e-9 && z < lowestNonZero) lowestNonZero = z;
    }
    // the first lifted row is close to the plane, i.e. it hugs the rim
    expect(lowestNonZero).toBeLessThan(7 * 0.5);
  });

  it('emits finite, unit-length normals', () => {
    const m = inflate([comp('a', [circle(0, 0, 20)])], { thickness: 6 });
    expect(m.normals.length).toBe(m.positions.length);
    let checked = 0;
    for (let i = 0; i < m.normals.length; i += 3) {
      const len = Math.hypot(m.normals[i], m.normals[i + 1], m.normals[i + 2]);
      expect(len).toBeCloseTo(1, 4);
      checked++;
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('gets denser with quality and stays watertight at every setting', () => {
    const low = inflate([comp('a', [circle(0, 0, 20, 96)])], { quality: 0 });
    const high = inflate([comp('a', [circle(0, 0, 20, 96)])], { quality: 1 });
    expect(high.positions.length).toBeGreaterThan(low.positions.length * 2);
    expect(isWatertight(low).open).toBe(0);
    expect(isWatertight(high).open).toBe(0);
  });

  it('fused mode lets neighbours lift each other; separate mode does not', () => {
    const pair = [comp('a', [circle(-11, 0, 10, 64)]), comp('b', [circle(11, 0, 10, 64)])];
    const sep = inflate(pair, { thickness: 6, mode: 'separate', smoothness: 0 });
    const fus = inflate(pair, { thickness: 6, mode: 'fused', smoothness: 0 });
    expect(sep.groups).toHaveLength(2);
    expect(fus.groups).toHaveLength(2);
    // in separate mode each disc peaks in its own middle at full thickness
    expect(zOf(sep).max).toBeCloseTo(6, 1);
    expect(zOf(fus).max).toBeCloseTo(6, 1);
    expect(fus.indices.length).toBeGreaterThan(0);
  });

  it('smoothing does not move the silhouette', () => {
    const r = 20;
    const m = inflate([comp('a', [circle(0, 0, r, 128)])], { thickness: 8, smoothness: 8, outlinePreservation: 0 });
    for (let i = 0; i < m.positions.length; i += 3) {
      expect(Math.hypot(m.positions[i], m.positions[i + 1])).toBeLessThanOrEqual(r + 1e-6);
    }
    expect(isWatertight(m).open).toBe(0);
  });

  it('ignores degenerate components without failing the batch', () => {
    const m = inflate([
      comp('bad', [Float64Array.from([0, 0, 1, 1])]),
      comp('good', [circle(50, 50, 15)]),
    ], { thickness: 4 });
    expect(m.groups.map((g) => g.componentId)).toEqual(['good']);
  });

  it('defaults are sane', () => {
    expect(DEFAULT_INFLATE.thickness).toBeGreaterThan(0);
    expect(DEFAULT_INFLATE.balance).toBe(0.5);
    expect(DEFAULT_INFLATE.mode).toBe('separate');
  });
});
