/**
 * =============================================================================
 * Polygon primitives
 * =============================================================================
 *
 * Contour maths shared by every geometry mode: area and winding, inside-tests
 * under both SVG fill rules, resampling, and distance to the boundary.
 *
 * The distance query is the load-bearing one — Inflate is *defined* as a
 * function of "how far is this point from the edge of the shape", so its
 * quality and its speed are both this file's problem.
 */

import type { Bounds2, Component, FillRule, Ring } from '../types';

/** Signed area. Positive is counter-clockwise in a Y-up frame. */
export function ringArea(ring: Ring): number {
  const n = ring.length / 2;
  if (n < 3) return 0;
  let a = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    a += ring[j * 2] * ring[i * 2 + 1] - ring[i * 2] * ring[j * 2 + 1];
  }
  return a / 2;
}

/** Perimeter, including the implicit closing edge. */
export function ringPerimeter(ring: Ring): number {
  const n = ring.length / 2;
  if (n < 2) return 0;
  let p = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    p += Math.hypot(ring[i * 2] - ring[j * 2], ring[i * 2 + 1] - ring[j * 2 + 1]);
  }
  return p;
}

export function ringBounds(ring: Ring, into?: Bounds2): Bounds2 {
  const b = into ?? { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (let i = 0; i < ring.length; i += 2) {
    if (ring[i] < b.minX) b.minX = ring[i];
    if (ring[i] > b.maxX) b.maxX = ring[i];
    if (ring[i + 1] < b.minY) b.minY = ring[i + 1];
    if (ring[i + 1] > b.maxY) b.maxY = ring[i + 1];
  }
  return b;
}

export function componentBounds(component: Component): Bounds2 {
  const b: Bounds2 = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const r of component.rings) ringBounds(r, b);
  return b;
}

export function boundsOf(components: readonly Component[]): Bounds2 {
  const b: Bounds2 = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const c of components) for (const r of c.rings) ringBounds(r, b);
  return b;
}

/**
 * Winding number of `rings` about (x, y).
 *
 * Zero means outside under `nonzero`. Odd/even of the crossing count decides
 * `evenodd`, and both fall out of the same walk, so one traversal answers both.
 */
function windingAndCrossings(rings: readonly Ring[], x: number, y: number): [number, number] {
  let winding = 0;
  let crossings = 0;
  for (const ring of rings) {
    const n = ring.length / 2;
    if (n < 3) continue;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = ring[i * 2];
      const yi = ring[i * 2 + 1];
      const xj = ring[j * 2];
      const yj = ring[j * 2 + 1];
      // Both counts come from the same test: does the ray from (x, y) towards
      // +x cross this edge? Winding signs that crossing by direction; the
      // crossing number does not. Counting an edge on the *other* side of the
      // point — which an earlier draft did — breaks every nested-hole case.
      if (yi <= y) {
        if (yj > y) {
          // upward edge; point is left of it => the ray crosses
          if ((xj - xi) * (y - yi) - (x - xi) * (yj - yi) > 0) { winding++; crossings++; }
        }
      } else if (yj <= y) {
        // downward edge; point is right of it => the ray crosses
        if ((xj - xi) * (y - yi) - (x - xi) * (yj - yi) < 0) { winding--; crossings++; }
      }
    }
  }
  return [winding, crossings];
}

/** Is (x, y) inside `rings` under `fillRule`? */
export function pointInRings(rings: readonly Ring[], x: number, y: number, fillRule: FillRule): boolean {
  const [winding, crossings] = windingAndCrossings(rings, x, y);
  return fillRule === 'evenodd' ? (crossings & 1) === 1 : winding !== 0;
}

export function pointInComponent(component: Component, x: number, y: number): boolean {
  return pointInRings(component.rings, x, y, component.fillRule);
}

/** Squared distance from (px, py) to the segment (ax, ay)–(bx, by). */
function distSqToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const cx = ax + t * dx - px;
  const cy = ay + t * dy - py;
  return cx * cx + cy * cy;
}

/** Unsigned distance from (x, y) to the nearest point on any ring. */
export function distanceToRings(rings: readonly Ring[], x: number, y: number): number {
  let best = Infinity;
  for (const ring of rings) {
    const n = ring.length / 2;
    if (n < 2) continue;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const d = distSqToSegment(x, y, ring[j * 2], ring[j * 2 + 1], ring[i * 2], ring[i * 2 + 1]);
      if (d < best) best = d;
    }
  }
  return Math.sqrt(best);
}

/**
 * Resample a ring so no edge is longer than `maxSegment`.
 *
 * Inflate displaces *vertices*, so the mesh can only be as round as the
 * boundary is dense. Curves arrive from the importer already flattened; this
 * subdivides the long straight runs those leave behind.
 */
export function resampleRing(ring: Ring, maxSegment: number): Ring {
  const n = ring.length / 2;
  if (n < 2 || !(maxSegment > 0)) return ring;
  const out: number[] = [];
  let added = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = ring[i * 2];
    const ay = ring[i * 2 + 1];
    const bx = ring[j * 2];
    const by = ring[j * 2 + 1];
    out.push(ax, ay);
    const len = Math.hypot(bx - ax, by - ay);
    const steps = Math.floor(len / maxSegment);
    added += steps;
    for (let s = 1; s <= steps; s++) {
      const t = s / (steps + 1);
      out.push(ax + (bx - ax) * t, ay + (by - ay) * t);
    }
  }
  // Nothing needed splitting — hand back the same array rather than a copy, so
  // an already-dense ring costs nothing to pass through the pipeline again.
  return added === 0 ? ring : Float64Array.from(out);
}

/** Force a ring's winding. `ccw` is measured in the ring's own coordinate frame. */
export function orientRing(ring: Ring, ccw: boolean): Ring {
  const isCcw = ringArea(ring) > 0;
  if (isCcw === ccw) return ring;
  const n = ring.length / 2;
  const out = new Float64Array(ring.length);
  for (let i = 0; i < n; i++) {
    out[i * 2] = ring[(n - 1 - i) * 2];
    out[i * 2 + 1] = ring[(n - 1 - i) * 2 + 1];
  }
  return out;
}

/**
 * Split a component's rings into `{ outer, holes }` under its fill rule.
 *
 * Triangulators want that split explicitly. It is derived, never stored, and
 * the definition is local: a ring bounds a hole when a point *immediately
 * inside that ring* is not filled by the component as a whole. That handles
 * both fill rules, holes inside holes, and disjoint rings with one rule.
 *
 * The probe has to hug the ring's own edge. An earlier draft asked whether an
 * arbitrary interior point fell inside the *other* rings, and classified the
 * outer boundary of a ring-with-a-hole as a hole itself — because the interior
 * point it picked for a square is the centre, which is exactly where the hole
 * is.
 */
export function classifyRings(component: Component): { outer: Ring[]; holes: Ring[] } {
  const outer: Ring[] = [];
  const holes: Ring[] = [];
  const { rings, fillRule } = component;
  for (const ring of rings) {
    if (ring.length < 6) continue;
    const probe = probeJustInside(ring);
    if (probe && !pointInRings(rings, probe[0], probe[1], fillRule)) holes.push(ring);
    else outer.push(ring);
  }
  return { outer, holes };
}

/**
 * A point a hair inside `ring`, next to its own boundary.
 *
 * Steps inward from the midpoint of the longest edge — longest because it has
 * the most room around it. The inward side is the left of the edge for a
 * counter-clockwise ring and the right for a clockwise one. The step shrinks
 * until the point really is inside the ring, so a thin sliver still gets an
 * answer instead of a point that fell out the other side.
 */
export function probeJustInside(ring: Ring): [number, number] | null {
  const n = ring.length / 2;
  if (n < 3) return null;
  const ccw = ringArea(ring) > 0;

  let bestI = -1;
  let bestLen = -1;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const len = Math.hypot(ring[j * 2] - ring[i * 2], ring[j * 2 + 1] - ring[i * 2 + 1]);
    if (len > bestLen) { bestLen = len; bestI = i; }
  }
  if (bestI < 0 || bestLen <= 0) return null;

  const j = (bestI + 1) % n;
  const ax = ring[bestI * 2];
  const ay = ring[bestI * 2 + 1];
  const bx = ring[j * 2];
  const by = ring[j * 2 + 1];
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  // Left normal of a->b, flipped for a clockwise ring.
  const s = ccw ? 1 : -1;
  const nx = (-(by - ay) / bestLen) * s;
  const ny = ((bx - ax) / bestLen) * s;

  // Start *tiny* and grow only if that misses. Starting at half the edge
  // length instead put the probe at the centre of a square — which for a
  // ring-with-a-hole is inside the hole, so the outer boundary classified
  // itself as a hole and the component came back with no outline at all.
  for (let step = bestLen * 1e-6; step <= bestLen / 2; step *= 8) {
    const px = mx + nx * step;
    const py = my + ny * step;
    if (pointInRings([ring], px, py, 'nonzero')) return [px, py];
  }
  return null;
}
