/**
 * =============================================================================
 * Surface sampling — the interior mesh every height-field mode shares
 * =============================================================================
 *
 * Inflate and a bevelled Extrude are the same construction with different
 * height functions: both need a triangulation of a component's *interior*, with
 * enough vertices inside it to displace, and with the outline preserved exactly
 * so the silhouette is the artwork's.
 *
 * That is this module. It is deliberately not a triangulator of outlines —
 * earcut does that better and is used for flat caps — it is a sampler, and the
 * points it returns are ordered so that the first `boundaryCount` of them are
 * on the contour. Callers rely on that ordering to weld front and back
 * surfaces along the rim.
 */

import Delaunator from 'delaunator';
import type { Component } from '../types';
import { componentBounds, pointInComponent, pointInRings, resampleRing } from './polygon';
import { SegmentIndex } from './segmentIndex';

export interface SurfaceSample {
  xs: Float64Array;
  ys: Float64Array;
  /** Points `[0, boundaryCount)` lie on the contour; the rest are interior. */
  boundaryCount: number;
  /** Triangle indices into `xs`/`ys`, clipped back to the shape. */
  triangles: Uint32Array;
  /** Distance from each point to the nearest boundary. Zero on the contour. */
  distance: Float64Array;
  /** The spacing actually used, after any refinement. */
  spacing: number;
  index: SegmentIndex;
}

export interface SampleOptions {
  /** Tessellation density, 0..1. */
  quality: number;
  /** Extra rings to measure against — `fused` behaviour. Defaults to the component's own. */
  againstRings?: readonly Float64Array[];
  /** Extra containment test for fused mode. */
  alsoInside?: (x: number, y: number) => boolean;
}

const EMPTY: SurfaceSample = {
  xs: new Float64Array(0),
  ys: new Float64Array(0),
  boundaryCount: 0,
  triangles: new Uint32Array(0),
  distance: new Float64Array(0),
  spacing: 0,
  index: new SegmentIndex([]),
};

export function sampleSurface(component: Component, options: SampleOptions): SurfaceSample {
  const rings = component.rings.filter((r) => r.length >= 6);
  if (rings.length === 0) return EMPTY;

  const cb = componentBounds(component);
  const cw = cb.maxX - cb.minX;
  const ch = cb.maxY - cb.minY;
  if (!(cw > 0) || !(ch > 0)) return EMPTY;

  const q = clamp01(options.quality);
  const baseSpacing = Math.min(cw, ch) / (6 + q * 26);
  if (!(baseSpacing > 0)) return EMPTY;

  const index = new SegmentIndex(options.againstRings ?? rings);
  const inside = options.alsoInside
    ? (x: number, y: number) => pointInComponent(component, x, y) || options.alsoInside!(x, y)
    : (x: number, y: number) => pointInComponent(component, x, y);

  // A feature thinner than the sample spacing gets no interior points at all,
  // and a component made only of boundary points is a flat sheet — every
  // triangle sits at z = 0. So the spacing halves until an interior appears.
  // This is what keeps a hairline stroke, or the crossbar of an 'e', from
  // collapsing, and it costs nothing on artwork that never needs it.
  let xs: number[] = [];
  let ys: number[] = [];
  let boundaryCount = 0;
  let spacing = baseSpacing;

  for (let attempt = 0; attempt < 5; attempt++) {
    xs = [];
    ys = [];
    boundaryCount = 0;
    for (const ring of rings) {
      const dense = resampleRing(ring, spacing);
      for (let i = 0; i < dense.length; i += 2) {
        xs.push(dense[i]);
        ys.push(dense[i + 1]);
        boundaryCount++;
      }
    }

    // Graded inset rings, hugging the contour.
    //
    // Two problems, one cause. Without any inset ring the first row of interior
    // points is a whole grid step from the outline, and Delaunay fills that
    // band with triangles made only of boundary vertices — flat facets lying on
    // the rim plane, which read as a serrated edge around the bottom of every
    // inflated shape. With a single inset ring the facets go, but the *profile*
    // is still resolved by one step exactly where it is steepest: fullness
    // makes the surface climb towards half its height within the first fraction
    // of a unit, and one step across that rise is a visible scallop.
    //
    // So the rings are graded — close together at the edge, spreading inward —
    // which puts the vertices where the curvature is instead of spreading them
    // evenly over a surface that is nearly flat in the middle.
    //
    // The direction is found by trying both normals and keeping whichever lands
    // inside, rather than by reading the winding: a hole winds the opposite way
    // to its outline, and a compound path can hold both.
    const insetRings = [0.45, 1.05, 1.85];
    for (const factor of insetRings) {
      const insetDistance = spacing * factor;
      for (const ring of rings) {
        const dense = resampleRing(ring, spacing);
        const count = dense.length / 2;
        if (count < 3) continue;
        for (let i = 0; i < count; i++) {
          const prev = (i - 1 + count) % count;
          const next = (i + 1) % count;
          const tx = dense[next * 2] - dense[prev * 2];
          const ty = dense[next * 2 + 1] - dense[prev * 2 + 1];
          const len = Math.hypot(tx, ty);
          if (!(len > 0)) continue;
          const inx = -ty / len;
          const iny = tx / len;
          const px = dense[i * 2];
          const py = dense[i * 2 + 1];
          for (const sign of [1, -1]) {
            const qx = px + inx * insetDistance * sign;
            const qy = py + iny * insetDistance * sign;
            if (!inside(qx, qy)) continue;
            // A feature narrower than the inset would put this point on the far
            // side of its own shape, or on top of the opposite wall.
            if (index.distance(qx, qy) < insetDistance * 0.6) break;
            xs.push(qx);
            ys.push(qy);
            break;
          }
        }
      }
    }

    // Interior points on a hex packing. Rows offset by half a step because a
    // square lattice makes triangles aligned with the axes, and those read as
    // diagonal banding the moment the surface catches a specular highlight.
    // The exclusion band clears the inset rings as well as the contour, or the
    // two collide and make slivers.
    const rowStep = (spacing * Math.sqrt(3)) / 2;
    const near = spacing * 2.3;
    for (let row = 0, y = cb.minY + rowStep * 0.5; y < cb.maxY; y += rowStep, row++) {
      const offset = (row & 1) === 1 ? spacing * 0.5 : 0;
      for (let x = cb.minX + offset + spacing * 0.5; x < cb.maxX; x += spacing) {
        if (index.distance(x, y) < near) continue;
        if (!inside(x, y)) continue;
        xs.push(x);
        ys.push(y);
      }
    }
    if (xs.length > boundaryCount) break;
    spacing /= 2;
  }
  if (xs.length < 3) return EMPTY;
  const hasInterior = xs.length > boundaryCount;

  const coords = new Float64Array(xs.length * 2);
  for (let i = 0; i < xs.length; i++) {
    coords[i * 2] = xs[i];
    coords[i * 2 + 1] = ys[i];
  }
  const tri = new Delaunator(coords).triangles;

  // Delaunay triangulates the convex hull of the points, so it happily spans
  // concavities, holes and the gaps between components. This filter is the
  // whole correctness story. A triangle survives only if its centroid is inside
  // the shape AND it has no absurdly long edge: the centroid test alone lets a
  // sliver hug the outside of a concave boundary, and the edge test alone lets
  // a wide flat triangle bridge a hole.
  const maxEdge = spacing * 3;
  const keep: number[] = [];
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2];
    const ax = xs[a], ay = ys[a], bx = xs[b], by = ys[b], cx = xs[c], cy = ys[c];
    if (Math.hypot(bx - ax, by - ay) > maxEdge) continue;
    if (Math.hypot(cx - bx, cy - by) > maxEdge) continue;
    if (Math.hypot(ax - cx, ay - cy) > maxEdge) continue;
    // Three boundary points make a triangle lying flat on the rim plane, and
    // the front and back copies of it are coincident: doubled coplanar faces,
    // z-fighting, useless normals, and a seam edge used four times instead of
    // twice — which is what stops the solid being manifold. Dropping it from
    // both surfaces welds them along those edges instead, which is closed and
    // correct. Only safe once the component actually has an interior; a
    // component that is all boundary would otherwise vanish.
    if (hasInterior && a < boundaryCount && b < boundaryCount && c < boundaryCount) continue;
    const gx = (ax + bx + cx) / 3;
    const gy = (ay + by + cy) / 3;
    if (!pointInRings(component.rings, gx, gy, component.fillRule) && !inside(gx, gy)) continue;
    keep.push(a, b, c);
  }

  const distance = new Float64Array(xs.length);
  for (let i = 0; i < xs.length; i++) {
    // A boundary point is on the contour by construction; asking the index
    // returns a floating-point crumb rather than a clean zero, and a rim that is
    // 1e-16 proud of the plane is a seam the two surfaces cannot share.
    distance[i] = i < boundaryCount ? 0 : index.distance(xs[i], ys[i]);
  }

  return {
    xs: Float64Array.from(xs),
    ys: Float64Array.from(ys),
    boundaryCount,
    triangles: Uint32Array.from(keep),
    distance,
    spacing,
    index,
  };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
