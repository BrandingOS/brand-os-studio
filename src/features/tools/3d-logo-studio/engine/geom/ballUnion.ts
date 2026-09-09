/**
 * =============================================================================
 * Ball union — the medial-axis surface
 * =============================================================================
 *
 * The geometry the reference renders are made of, and the one thing the
 * profile-based generators cannot express.
 *
 * Inflate and Sphere raise a surface from the distance to the boundary, using
 * one *reach* for a whole component. That is right when a shape has a single
 * characteristic width, and wrong the moment it does not: give it a mark made of
 * fat balls joined by thin necks and the necks come out as fat as the balls,
 * because the reach was measured from the balls.
 *
 * The correct construction is the **union of maximal inscribed balls**. A 2D
 * shape is exactly the union of the discs that fit inside it; rotate each disc
 * about the plane and the union of those spheres is the solid. It gives, with no
 * special cases:
 *
 *   - a circle → a sphere,
 *   - a stroke → a capsule, round in cross-section along its whole length,
 *   - a junction → the smooth organic flare where the two meet.
 *
 * Formally, with `d(q)` the distance from an interior point to the boundary, the
 * solid's half-height is
 *
 *     h(p)² = max over interior q of ( d(q)² − |p − q|² )
 *
 * and that maximum is not something to search for point by point. Negate it and
 * it becomes `min over q of ( |p − q|² + (−d(q)²) )` — a **generalized squared
 * distance transform**, which Felzenszwalb and Huttenlocher's lower-envelope
 * algorithm evaluates for every point in O(n), one pass along the rows and one
 * along the columns. The same routine computes `d` itself.
 *
 * So the whole surface costs two linear passes over a grid, and no marching
 * cubes: the solid is symmetric about the plane and single-valued in z, so it is
 * a height field, and the existing mesher can raise it.
 */

import type { Bounds2, Component } from '../types';
import { componentBounds, pointInRings } from './polygon';

/** Stands in for infinity. A real `Infinity` turns the envelope arithmetic into
 *  NaN the moment a whole row is empty; a large finite number does not. */
const BIG = 1e20;

export interface HeightField {
  /** Half-thickness of the solid at (x, y). Zero on and outside the boundary. */
  sample(x: number, y: number): number;
  /** The largest half-thickness anywhere — the biggest inscribed ball's radius. */
  peak: number;
  /** Grid spacing in the artwork's units, for callers that need to know the
   *  resolution they are being given. */
  spacing: number;
}

const EMPTY_FIELD: HeightField = { sample: () => 0, peak: 0, spacing: 0 };

/**
 * Build the ball-union height field for one component.
 *
 * `resolution` is how many cells span the component's longest side. It trades
 * accuracy near the boundary — where the error is about half a cell — against
 * time and memory, which are both linear in the cell count.
 */
export function ballUnionField(component: Component, resolution = 320): HeightField {
  const rings = component.rings.filter((r) => r.length >= 6);
  if (rings.length === 0) return EMPTY_FIELD;

  const b = componentBounds(component);
  const extent = Math.max(b.maxX - b.minX, b.maxY - b.minY);
  if (!(extent > 0)) return EMPTY_FIELD;

  const cells = Math.max(16, Math.min(1024, Math.round(resolution)));
  const spacing = extent / cells;
  // A one-cell skirt so a shape touching its own bounding box still has an
  // outside to measure against.
  const pad = 2;
  const originX = b.minX - pad * spacing;
  const originY = b.minY - pad * spacing;
  const w = Math.ceil((b.maxX - b.minX) / spacing) + pad * 2 + 1;
  const h = Math.ceil((b.maxY - b.minY) / spacing) + pad * 2 + 1;
  if (w < 3 || h < 3 || w * h > 4_000_000) return EMPTY_FIELD;

  const inside = rasterize(component, w, h, originX, originY, spacing);

  // Distance to the boundary, in cells: the transform seeded from the OUTSIDE,
  // read at inside cells.
  const seed = new Float64Array(w * h);
  for (let i = 0; i < seed.length; i++) seed[i] = inside[i] ? BIG : 0;
  const dist2 = transform(seed, w, h);

  // Half a cell off, because the transform measures to the nearest outside cell
  // *centre* while the boundary itself lies between the two.
  const d = new Float64Array(w * h);
  for (let i = 0; i < d.length; i++) {
    d[i] = inside[i] ? Math.max(0, Math.sqrt(dist2[i]) - 0.5) : 0;
  }

  // h² = max over interior q of (d(q)² − |p − q|²), as a minimisation.
  const cost = new Float64Array(w * h);
  for (let i = 0; i < cost.length; i++) cost[i] = inside[i] ? -(d[i] * d[i]) : BIG;
  const envelope = transform(cost, w, h);

  const height = new Float64Array(w * h);
  let peak = 0;
  for (let i = 0; i < height.length; i++) {
    const v = -envelope[i];
    const hv = v > 0 ? Math.sqrt(v) * spacing : 0;
    height[i] = hv;
    if (hv > peak) peak = hv;
  }

  return {
    peak,
    spacing,
    sample(x: number, y: number): number {
      // Bilinear, because the mesh's vertices do not land on grid cells and a
      // nearest-cell read shows up as terracing across a smooth dome.
      const gx = (x - originX) / spacing;
      const gy = (y - originY) / spacing;
      if (gx < 0 || gy < 0 || gx > w - 1 || gy > h - 1) return 0;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const x1 = Math.min(x0 + 1, w - 1);
      const y1 = Math.min(y0 + 1, h - 1);
      const fx = gx - x0;
      const fy = gy - y0;
      const a = height[y0 * w + x0];
      const bb = height[y0 * w + x1];
      const c = height[y1 * w + x0];
      const dd = height[y1 * w + x1];
      return (a * (1 - fx) + bb * fx) * (1 - fy) + (c * (1 - fx) + dd * fx) * fy;
    },
  };
}

/**
 * Scanline fill of the component under its own fill rule.
 *
 * Per row rather than per cell: a point-in-polygon test for every cell of a
 * 320² grid is a hundred thousand ring walks, where sorting one row's crossings
 * answers the whole row at once.
 */
function rasterize(
  component: Component,
  w: number,
  h: number,
  originX: number,
  originY: number,
  spacing: number,
): Uint8Array {
  const inside = new Uint8Array(w * h);
  const rings = component.rings.filter((r) => r.length >= 6);
  const crossings: { x: number; dir: number }[] = [];

  for (let row = 0; row < h; row++) {
    const y = originY + row * spacing;
    crossings.length = 0;
    for (const ring of rings) {
      const n = ring.length / 2;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const yi = ring[i * 2 + 1];
        const yj = ring[j * 2 + 1];
        // Half-open in y so a vertex exactly on the scanline counts once.
        if ((yi <= y && yj > y) || (yj <= y && yi > y)) {
          const t = (y - yj) / (yi - yj);
          crossings.push({ x: ring[j * 2] + t * (ring[i * 2] - ring[j * 2]), dir: yi > yj ? 1 : -1 });
        }
      }
    }
    if (crossings.length === 0) continue;
    crossings.sort((p, q) => p.x - q.x);

    let winding = 0;
    for (let k = 0; k < crossings.length - 1; k++) {
      winding += crossings[k].dir;
      const filled = component.fillRule === 'evenodd' ? ((k + 1) & 1) === 1 : winding !== 0;
      if (!filled) continue;
      const from = Math.max(0, Math.ceil((crossings[k].x - originX) / spacing));
      const to = Math.min(w - 1, Math.floor((crossings[k + 1].x - originX) / spacing));
      for (let col = from; col <= to; col++) inside[row * w + col] = 1;
    }
  }
  return inside;
}

/**
 * Felzenszwalb–Huttenlocher generalized squared distance transform.
 *
 * `D(p) = min over q of ( |p − q|² + f(q) )`, in cell units, computed by taking
 * the lower envelope of one parabola per sample — O(n) per row and per column,
 * which is what makes the whole surface affordable at interactive resolutions.
 */
function transform(f: Float64Array, w: number, h: number): Float64Array {
  const out = Float64Array.from(f);
  const n = Math.max(w, h);
  const line = new Float64Array(n);
  const result = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) line[x] = out[y * w + x];
    envelope(line, w, result, v, z);
    for (let x = 0; x < w; x++) out[y * w + x] = result[x];
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) line[y] = out[y * w + x];
    envelope(line, h, result, v, z);
    for (let y = 0; y < h; y++) out[y * w + x] = result[y];
  }
  return out;
}

function envelope(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -BIG;
  z[1] = BIG;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (k > 0 && s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    if (s <= z[k] && k === 0) {
      v[0] = q;
      z[0] = -BIG;
      z[1] = BIG;
      continue;
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = BIG;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

/** Bounds of a component, re-exported so callers do not need two imports. */
export function fieldBounds(component: Component): Bounds2 {
  return componentBounds(component);
}

/** Is (x, y) inside? Exposed for tests that check the field against the shape. */
export function isInside(component: Component, x: number, y: number): boolean {
  return pointInRings(component.rings, x, y, component.fillRule);
}
