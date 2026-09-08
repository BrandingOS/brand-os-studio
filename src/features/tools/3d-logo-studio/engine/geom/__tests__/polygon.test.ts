import { describe, it, expect } from 'vitest';
import type { Component, Ring } from '../../types';
import {
  ringArea, ringPerimeter, ringBounds, boundsOf, pointInRings, pointInComponent,
  distanceToRings, resampleRing, orientRing, classifyRings, probeJustInside,
} from '../polygon';

const square = (cx: number, cy: number, r: number, ccw = true): Ring => {
  const p = [cx - r, cy - r, cx + r, cy - r, cx + r, cy + r, cx - r, cy + r];
  return Float64Array.from(ccw ? p : [p[0], p[1], p[6], p[7], p[4], p[5], p[2], p[3]]);
};

const circle = (cx: number, cy: number, r: number, n = 64): Ring => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return Float64Array.from(p);
};

describe('ringArea', () => {
  it('is positive for counter-clockwise and negative for clockwise', () => {
    expect(ringArea(square(0, 0, 1))).toBeCloseTo(4);
    expect(ringArea(square(0, 0, 1, false))).toBeCloseTo(-4);
  });
  it('approaches pi*r^2 for a sampled circle', () => {
    expect(Math.abs(ringArea(circle(0, 0, 10, 512)))).toBeCloseTo(Math.PI * 100, 1);
  });
  it('is zero for a degenerate ring', () => {
    expect(ringArea(Float64Array.from([0, 0, 1, 1]))).toBe(0);
  });
});

describe('ringPerimeter / ringBounds', () => {
  it('closes the ring when measuring', () => {
    expect(ringPerimeter(square(0, 0, 1))).toBeCloseTo(8);
  });
  it('bounds the ring', () => {
    expect(ringBounds(square(5, 5, 2))).toEqual({ minX: 3, minY: 3, maxX: 7, maxY: 7 });
  });
  it('bounds many components together', () => {
    const cs: Component[] = [
      { id: 'a', rings: [square(0, 0, 1)], fillRule: 'nonzero' },
      { id: 'b', rings: [square(10, 10, 1)], fillRule: 'nonzero' },
    ];
    expect(boundsOf(cs)).toEqual({ minX: -1, minY: -1, maxX: 11, maxY: 11 });
  });
});

describe('pointInRings', () => {
  it('answers a simple square', () => {
    const r = [square(0, 0, 1)];
    expect(pointInRings(r, 0, 0, 'nonzero')).toBe(true);
    expect(pointInRings(r, 2, 0, 'nonzero')).toBe(false);
  });

  it('treats a reversed inner ring as a hole under nonzero', () => {
    const rings = [square(0, 0, 4), square(0, 0, 2, false)];
    expect(pointInRings(rings, 0, 0, 'nonzero')).toBe(false); // in the hole
    expect(pointInRings(rings, 3, 0, 'nonzero')).toBe(true);  // in the ribbon
  });

  it('treats a same-winding inner ring as solid under nonzero but a hole under evenodd', () => {
    const rings = [square(0, 0, 4), square(0, 0, 2)];
    expect(pointInRings(rings, 0, 0, 'nonzero')).toBe(true);
    expect(pointInRings(rings, 0, 0, 'evenodd')).toBe(false);
  });

  it('handles a hole inside a hole under evenodd', () => {
    const rings = [square(0, 0, 6), square(0, 0, 4), square(0, 0, 2)];
    expect(pointInRings(rings, 0, 0, 'evenodd')).toBe(true);   // island
    expect(pointInRings(rings, 3, 0, 'evenodd')).toBe(false);  // hole
    expect(pointInRings(rings, 5, 0, 'evenodd')).toBe(true);   // outer ribbon
  });
});

describe('distanceToRings', () => {
  it('is the distance to the nearest edge, inside or out', () => {
    const r = [square(0, 0, 10)];
    expect(distanceToRings(r, 0, 0)).toBeCloseTo(10);
    expect(distanceToRings(r, 9, 0)).toBeCloseTo(1);
    expect(distanceToRings(r, 12, 0)).toBeCloseTo(2);
  });
  it('measures to a hole as readily as to the outer boundary', () => {
    const rings = [square(0, 0, 10), square(0, 0, 4, false)];
    // sitting in the ribbon, 3 from the hole and 3 from the outside
    expect(distanceToRings(rings, 7, 0)).toBeCloseTo(3);
  });
  it('is r at the centre of a sampled circle', () => {
    expect(distanceToRings([circle(0, 0, 10, 256)], 0, 0)).toBeCloseTo(10, 2);
  });
});

describe('resampleRing', () => {
  it('subdivides long edges without moving the shape', () => {
    const out = resampleRing(square(0, 0, 10), 5);
    expect(out.length / 2).toBeGreaterThan(4);
    expect(Math.abs(ringArea(out))).toBeCloseTo(400);
  });
  it('leaves a ring alone when its edges are already short enough', () => {
    const r = square(0, 0, 1);
    expect(resampleRing(r, 100)).toBe(r);
  });
  it('never repeats the first point at the end — the closing edge is implicit', () => {
    const out = resampleRing(square(0, 0, 10), 5);
    const first = [out[0], out[1]];
    const last = [out[out.length - 2], out[out.length - 1]];
    expect(last).not.toEqual(first);
  });
});

describe('orientRing', () => {
  it('reverses only when the winding disagrees', () => {
    const ccw = square(0, 0, 1);
    expect(orientRing(ccw, true)).toBe(ccw);
    const flipped = orientRing(ccw, false);
    expect(ringArea(flipped)).toBeCloseTo(-4);
    // same shape, opposite direction
    expect(Math.abs(ringArea(flipped))).toBeCloseTo(Math.abs(ringArea(ccw)));
  });
});

describe('classifyRings', () => {
  it('finds the hole in a compound path', () => {
    const c: Component = { id: 'o', rings: [square(0, 0, 10), square(0, 0, 4, false)], fillRule: 'nonzero' };
    const { outer, holes } = classifyRings(c);
    expect(outer).toHaveLength(1);
    expect(holes).toHaveLength(1);
    expect(Math.abs(ringArea(holes[0]))).toBeCloseTo(64);
  });
  it('calls both rings outer when they are disjoint', () => {
    const c: Component = { id: 'o', rings: [square(0, 0, 2), square(20, 0, 2)], fillRule: 'nonzero' };
    expect(classifyRings(c).outer).toHaveLength(2);
    expect(classifyRings(c).holes).toHaveLength(0);
  });
  it('uses evenodd when the windings agree', () => {
    const c: Component = { id: 'o', rings: [square(0, 0, 10), square(0, 0, 4)], fillRule: 'evenodd' };
    expect(classifyRings(c).holes).toHaveLength(1);
  });
});

describe('probeJustInside', () => {
  it('lands inside a convex ring', () => {
    const p = probeJustInside(square(0, 0, 5))!;
    expect(pointInRings([square(0, 0, 5)], p[0], p[1], 'nonzero')).toBe(true);
  });
  it('lands inside a concave ring whose centroid is outside it', () => {
    // a thin C — the centroid falls in the mouth
    const c: Ring = Float64Array.from([
      0, 0, 10, 0, 10, 1, 1, 1, 1, 9, 10, 9, 10, 10, 0, 10,
    ]);
    const p = probeJustInside(c)!;
    expect(pointInRings([c], p[0], p[1], 'nonzero')).toBe(true);
  });
  it('lands inside a clockwise ring too', () => {
    const cw = square(0, 0, 5, false);
    const p = probeJustInside(cw)!;
    expect(pointInRings([cw], p[0], p[1], 'nonzero')).toBe(true);
  });
  it('hugs the boundary rather than sitting in the middle', () => {
    const p = probeJustInside(square(0, 0, 10))!;
    expect(distanceToRings([square(0, 0, 10)], p[0], p[1])).toBeLessThan(0.01);
  });
});

describe('the supplied fixture, as rings', () => {
  it('nine circles of r=11.1 are disjoint and each contains only its own centre', () => {
    const centres = [
      [78.3, 11.1], [101.9, 34.7], [56.5, 56.5], [34.7, 11.1], [78.3, 101.9],
      [34.7, 101.9], [11.1, 34.7], [101.9, 78.3], [11.1, 78.3],
    ];
    const comps: Component[] = centres.map(([x, y], i) => ({
      id: `dot-${i}`, rings: [circle(x, y, 11.1, 48)], fillRule: 'nonzero' as const,
    }));
    for (let i = 0; i < comps.length; i++) {
      for (let j = 0; j < comps.length; j++) {
        expect(pointInComponent(comps[j], centres[i][0], centres[i][1])).toBe(i === j);
      }
    }
    const b = boundsOf(comps);
    expect(b.minX).toBeGreaterThanOrEqual(-0.5);
    expect(b.maxX).toBeLessThanOrEqual(113.5);
  });
});
