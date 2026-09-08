/**
 * =============================================================================
 * Inflate — the soft, swollen geometry
 * =============================================================================
 *
 * The PRD is explicit that this must be *real geometry generation, rather than
 * a large extrusion bevel*, and the distinction is not cosmetic. A bevel is a
 * fixed offset applied to the outline: make it larger than half the width of
 * any feature and the offset curves cross each other, so a wordmark's thin
 * strokes self-intersect and a narrow bridge between two blobs tears. Every
 * logo with a hairline in it fails, and it fails as garbage geometry rather
 * than as a poor-looking result.
 *
 * So height is a function of *how far inside the shape a point is*:
 *
 *     z(p) = thickness · profile( min(1, distance(p, boundary) / thickness) )
 *
 * That is well defined everywhere, for any topology. A narrow bridge is close
 * to the boundary on both sides, so it stays thin — which is what a real
 * inflated object does. Holes push the surface down because a hole is boundary
 * too, and they need no special case anywhere in this file. Disconnected
 * components never interact unless the user asks them to.
 *
 * The mesh is built by triangulating the *interior* rather than the outline:
 * boundary points come from the contours themselves so the silhouette stays
 * exact, interior points come from a hex-packed grid so there are vertices to
 * displace, and a Delaunay triangulation over the union is filtered back to the
 * shape. Front and back surfaces share the boundary ring, which makes the
 * result watertight by construction — a requirement for GLB export and for any
 * later boolean or fusion work.
 */

import type { Component, MeshData } from '../types';
import { boundsOf, pointInComponent } from '../geom/polygon';
import { MeshBuilder } from '../geom/meshBuilder';
import { sampleSurface } from '../geom/surfaceSample';

export interface InflateOptions {
  /** Peak half-thickness, in the logo's own 2D units. */
  thickness: number;
  /**
   * How domed the surface is. 0 is a flat cone rising linearly from the edge;
   * 0.5 is a circular dome; 1 is a full, taut pillow with steep walls.
   */
  fullness: number;
  /**
   * How the surface meets the flat plane at the rim. 0 leaves a crisp vertical
   * edge — the silhouette stays razor-sharp; 1 brings the surface in
   * tangentially, like a pillow whose seam is rolled under.
   */
  edgeSoftness: number;
  /**
   * Where the volume goes. 0.5 is symmetric; 1 puts everything in front and
   * leaves the back flat, which is what a sticker or an applied badge does.
   */
  balance: number;
  /** Laplacian relaxation passes over the displaced surface. */
  smoothness: number;
  /**
   * How firmly the original outline resists that relaxation. 1 pins the
   * silhouette exactly; lower values let smoothing round off sharp corners of
   * the artwork itself.
   */
  outlinePreservation: number;
  /**
   * Tessellation density, 0..1. Drives both the interior sample spacing and how
   * finely long contour edges are split.
   */
  quality: number;
  /**
   * `separate` inflates each component against its own boundary — nine dots
   * become nine domes. `fused` measures against every component at once, so
   * neighbours influence each other's height and the set reads as one object.
   */
  mode: 'separate' | 'fused';
}

export const DEFAULT_INFLATE: InflateOptions = {
  thickness: 6,
  fullness: 0.5,
  edgeSoftness: 0.25,
  balance: 0.5,
  smoothness: 1,
  outlinePreservation: 1,
  quality: 0.5,
  mode: 'separate',
};

/**
 * Height profile, mapping "fraction of the way to the deepest interior point"
 * to "fraction of full thickness".
 *
 * Two shapes are blended. The superellipse `(1 - (1-t)^n)^(1/n)` is the family
 * that runs from a cone at n = 1 through a true circular dome at n = 2 to a
 * taut, flat-topped pillow above that — it is the *fullness* axis. Smoothstep
 * has zero slope at both ends, so blending towards it rolls the rim under
 * instead of standing it up — that is the *edge softness* axis. Blending two
 * closed forms rather than special-casing the rim keeps the function monotonic
 * and C¹, which matters because its derivative becomes the surface normal.
 */
export function inflateProfile(t: number, fullness: number, edgeSoftness: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const n = Math.pow(2, clamp01(fullness) * 2); // 1 → cone, 2 → dome, 4 → pillow
  const sharp = Math.pow(1 - Math.pow(1 - t, n), 1 / n);
  const soft = t * t * (3 - 2 * t);
  const k = clamp01(edgeSoftness);
  return sharp * (1 - k) + soft * k;
}

/** Build inflated geometry for `components`. */
export function inflate(components: readonly Component[], options: Partial<InflateOptions> = {}): MeshData {
  const opt = { ...DEFAULT_INFLATE, ...options };
  const builder = new MeshBuilder();
  if (components.length === 0) return builder.build();

  const overall = boundsOf(components);
  const span = Math.max(overall.maxX - overall.minX, overall.maxY - overall.minY, 1e-6);

  // In fused mode a component is measured against every contour in the logo, so
  // neighbours press on each other's height and the set reads as one object.
  const fusedRings = opt.mode === 'fused' ? components.flatMap((c) => c.rings) : undefined;

  // The distance at which the surface reaches full thickness is `thickness`
  // itself, not the component's own deepest point. Normalising per component
  // would mean every piece peaks at full height however narrow it is: a 3-unit
  // bar and a 40-unit slab would come out equally thick, and a wordmark's
  // hairlines would inflate into tubes fatter than they are wide. Tying it to
  // thickness makes the control absolute and the result physical — anything at
  // least as wide as it is thick rounds over fully, anything thinner stays
  // proportionally flatter, which is what an inflated object does.
  const full = Math.max(opt.thickness, 1e-6);
  const balance = clamp01(opt.balance);

  for (const component of components) {
    const sample = sampleSurface(component, {
      quality: opt.quality,
      againstRings: fusedRings,
      alsoInside: fusedRings
        ? (x, y) => components.some((o) => o !== component && pointInComponent(o, x, y))
        : undefined,
    });
    if (sample.triangles.length === 0) continue;

    const { xs, ys, distance, boundaryCount, triangles } = sample;
    const n = xs.length;
    const front = new Float64Array(n);
    const back = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const h = inflateProfile(Math.min(1, distance[i] / full), opt.fullness, opt.edgeSoftness) * opt.thickness;
      front[i] = h * balance * 2;
      back[i] = -h * (1 - balance) * 2;
    }

    relax(front, triangles, distance, opt.smoothness, opt.outlinePreservation, boundaryCount);
    relax(back, triangles, distance, opt.smoothness, opt.outlinePreservation, boundaryCount);

    builder.beginComponent(component.id);
    const frontIdx = new Int32Array(n);
    const backIdx = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const u = (xs[i] - overall.minX) / span;
      const v = (ys[i] - overall.minY) / span;
      if (i < boundaryCount) {
        // One shared vertex on the seam: the two surfaces are literally the
        // same points there, so the solid is closed with no rim strip and no
        // chance of a hairline crack under a glass material.
        const shared = builder.vertex(xs[i], ys[i], 0, u, v);
        frontIdx[i] = shared;
        backIdx[i] = shared;
      } else {
        frontIdx[i] = builder.vertex(xs[i], ys[i], front[i], u, v);
        backIdx[i] = builder.vertex(xs[i], ys[i], back[i], u, v);
      }
    }
    for (let t = 0; t < triangles.length; t += 3) {
      const a = triangles[t], b = triangles[t + 1], c = triangles[t + 2];
      // Delaunator emits clockwise triangles in a Y-down frame, which is the
      // frame SVG hands us. Front faces +Z; the back is the same loop reversed.
      builder.triangle(frontIdx[a], frontIdx[b], frontIdx[c]);
      builder.triangle(backIdx[c], backIdx[b], backIdx[a]);
    }
    builder.endComponent();
  }

  builder.computeVertexNormals();
  return builder.build();
}

/**
 * Laplacian relaxation of the height field.
 *
 * Only heights move — the points keep their 2D positions — so relaxing cannot
 * shrink the silhouette or drag the outline inward, which is what a general
 * mesh smoother does to a shape with corners. `outlinePreservation` is applied
 * as a per-vertex resistance that falls off with distance from the edge, so a
 * value below 1 softens the artwork's corners without releasing the whole rim.
 */
function relax(
  height: Float64Array,
  triangles: ArrayLike<number>,
  dist: Float64Array,
  iterations: number,
  outlinePreservation: number,
  boundaryCount: number,
): void {
  const passes = Math.max(0, Math.round(iterations));
  if (passes === 0) return;

  const n = height.length;
  const sum = new Float64Array(n);
  const count = new Uint32Array(n);
  const neighbourSum = () => {
    sum.fill(0);
    count.fill(0);
    for (let t = 0; t < triangles.length; t += 3) {
      const a = triangles[t], b = triangles[t + 1], c = triangles[t + 2];
      sum[a] += height[b] + height[c]; count[a] += 2;
      sum[b] += height[a] + height[c]; count[b] += 2;
      sum[c] += height[a] + height[b]; count[c] += 2;
    }
  };

  const pin = clamp01(outlinePreservation);
  let maxDist = 0;
  for (let i = 0; i < n; i++) if (dist[i] > maxDist) maxDist = dist[i];

  for (let p = 0; p < passes; p++) {
    neighbourSum();
    for (let i = 0; i < n; i++) {
      if (count[i] === 0) continue;
      // The seam never moves: it is the silhouette, and it is the weld between
      // the two surfaces.
      if (i < boundaryCount) continue;
      const target = sum[i] / count[i];
      // Resistance is strongest next to the outline and fades inward.
      const nearness = maxDist > 0 ? 1 - Math.min(1, dist[i] / maxDist) : 0;
      const resist = pin * nearness;
      height[i] = height[i] * resist + target * (1 - resist);
    }
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
