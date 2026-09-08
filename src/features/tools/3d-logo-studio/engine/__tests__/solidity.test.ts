/**
 * Is the result a solid, and does it face outwards?
 *
 * This is the test that was missing, and its absence let a broken Extrude ship:
 * the earlier suite checked positions, depths, group counts and hole placement —
 * every one of which a mesh with inside-out walls passes. On screen it looked
 * like the caps had vanished and you were seeing through into the shell.
 *
 * The invariant is the divergence theorem. For a closed surface,
 * `Σ a·(b×c)/6` over its triangles equals the enclosed volume, signed by the
 * winding. So one number answers three questions at once: is the mesh closed, is
 * it consistently wound, and is it the size it should be.
 *
 * **Engine space is the artwork's own frame — Y points down.** The renderer
 * flips Y and reverses the winding with it (`normalizeToUnitSize`), so a solid
 * that is correct here has a *negative* signed volume. Every generator must
 * agree on that, and before this file two of them did not.
 */
import { describe, it, expect } from 'vitest';
import type { Component, MeshData, Ring } from '../types';
import { extrude, flat } from '../modes/extrude';
import { inflate } from '../modes/inflate';
import { revolve } from '../modes/revolve';

const circle = (cx: number, cy: number, r: number, n = 128, ccw = true): Ring => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (ccw ? 1 : -1) * (i / n) * Math.PI * 2;
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

export function signedVolume(m: MeshData): number {
  let v = 0;
  for (let t = 0; t < m.indices.length; t += 3) {
    const a = m.indices[t] * 3, b = m.indices[t + 1] * 3, c = m.indices[t + 2] * 3;
    v += (
      m.positions[a] * (m.positions[b + 1] * m.positions[c + 2] - m.positions[b + 2] * m.positions[c + 1]) -
      m.positions[a + 1] * (m.positions[b] * m.positions[c + 2] - m.positions[b + 2] * m.positions[c]) +
      m.positions[a + 2] * (m.positions[b] * m.positions[c + 1] - m.positions[b + 1] * m.positions[c])
    ) / 6;
  }
  return v;
}

/** The volume test is only meaningful about a point that is not on the surface;
 *  a face through the origin contributes nothing at all. Shapes here are placed
 *  well away from it. */
const FAR = 400;

describe('Extrude produces a closed solid facing outwards', () => {
  it.each([['counter-clockwise', true], ['clockwise', false]] as const)(
    'a disc drawn %s',
    (_name, ccw) => {
      const r = 11.1;
      const depth = 12;
      const m = extrude([comp('d', [circle(FAR, FAR, r, 256, ccw)])], { depth, alignment: 'center' });
      const expected = Math.PI * r * r * depth;
      expect(signedVolume(m)).toBeCloseTo(-expected, -1);
    },
  );

  it.each([['counter-clockwise', true], ['clockwise', false]] as const)(
    'a square drawn %s',
    (_name, ccw) => {
      const m = extrude([comp('s', [square(FAR, FAR, 10, ccw)])], { depth: 6, alignment: 'center' });
      expect(signedVolume(m)).toBeCloseTo(-(20 * 20 * 6), -1);
    },
  );

  it('every alignment encloses the same volume', () => {
    const r = 11.1;
    for (const alignment of ['front', 'center', 'back'] as const) {
      const m = extrude([comp('d', [circle(FAR, FAR, r, 256)])], { depth: 12, alignment });
      expect(signedVolume(m), alignment).toBeCloseTo(-(Math.PI * r * r * 12), -1);
    }
  });

  it('a hole is subtracted, not roofed over', () => {
    const m = extrude([comp('o', [square(FAR, FAR, 30), square(FAR, FAR, 10, false)])], { depth: 5 });
    // (60x60 - 20x20) x 5
    expect(signedVolume(m)).toBeCloseTo(-((3600 - 400) * 5), -2);
  });

  it('a hole drawn the same way round as its outline still subtracts, under evenodd', () => {
    const m = extrude([comp('o', [square(FAR, FAR, 30), square(FAR, FAR, 10)], 'evenodd')], { depth: 5 });
    expect(signedVolume(m)).toBeCloseTo(-((3600 - 400) * 5), -2);
  });

  it('a bevel removes volume without breaking the solid', () => {
    const r = 11.1;
    const plain = extrude([comp('d', [circle(FAR, FAR, r, 256)])], { depth: 12 });
    const bevelled = extrude([comp('d', [circle(FAR, FAR, r, 256)])], {
      depth: 12, bevelSize: 3, bevelThickness: 2, bevelSegments: 6,
    });
    const v = signedVolume(bevelled);
    expect(v).toBeLessThan(0);
    expect(Math.abs(v)).toBeLessThan(Math.abs(signedVolume(plain)));
    // and not by more than the bevel could possibly remove
    expect(Math.abs(v)).toBeGreaterThan(Math.abs(signedVolume(plain)) * 0.6);
  });

  it('nine separate components enclose nine volumes', () => {
    const r = 11.1;
    const comps = Array.from({ length: 9 }, (_, i) =>
      comp(`d${i}`, [circle(FAR + (i % 3) * 40, FAR + Math.floor(i / 3) * 40, r, 128)]));
    const m = extrude(comps, { depth: 12 });
    expect(signedVolume(m)).toBeCloseTo(-9 * Math.PI * r * r * 12, -2);
  });
});

describe('Flat, given a thickness, is also a closed solid', () => {
  it('encloses the thin volume', () => {
    const m = flat([comp('s', [square(FAR, FAR, 10)])], { thickness: 0.4 });
    expect(signedVolume(m)).toBeCloseTo(-(20 * 20 * 0.4), -1);
  });
});

describe('Inflate agrees with Extrude about which way is out', () => {
  it.each([['counter-clockwise', true], ['clockwise', false]] as const)(
    'a disc drawn %s encloses a positive amount of material',
    (_name, ccw) => {
      const m = inflate([comp('d', [circle(FAR, FAR, 20, 192, ccw)])], { thickness: 6 });
      const v = signedVolume(m);
      expect(v).toBeLessThan(0);
      // a dome pair inside its bounding cylinder
      expect(Math.abs(v)).toBeLessThan(Math.PI * 400 * 12);
      expect(Math.abs(v)).toBeGreaterThan(Math.PI * 400 * 1);
    },
  );

  it('a hole removes material rather than adding it', () => {
    const solid = inflate([comp('s', [square(FAR, FAR, 30)])], { thickness: 6 });
    const holed = inflate([comp('o', [square(FAR, FAR, 30), square(FAR, FAR, 20, false)])], { thickness: 6 });
    expect(Math.abs(signedVolume(holed))).toBeLessThan(Math.abs(signedVolume(solid)));
    expect(signedVolume(holed)).toBeLessThan(0);
  });
});

describe('Revolve produces a solid facing outwards', () => {
  it.each([['counter-clockwise', true], ['clockwise', false]] as const)(
    'a ring swept from a square profile drawn %s',
    (_name, ccw) => {
      // profile 10..20 from the axis, 8 tall -> a tube: pi*(20^2-10^2)*8
      const rect: Ring = ccw
        ? Float64Array.from([10, 0, 20, 0, 20, 8, 10, 8])
        : Float64Array.from([10, 0, 10, 8, 20, 8, 20, 0]);
      const { mesh, warnings } = revolve([comp('p', [rect])], {
        axis: 'y', pivot: 0, offset: -10, segments: 256,
      });
      expect(warnings).toEqual([]);
      const expected = Math.PI * (400 - 100) * 8;
      expect(signedVolume(mesh)).toBeCloseTo(-expected, -2);
    },
  );
});
