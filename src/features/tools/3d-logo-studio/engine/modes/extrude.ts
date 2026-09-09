/**
 * =============================================================================
 * Extrude — and Flat, which is the same generator with the depth taken out
 * =============================================================================
 *
 * A solid with the logo's outline as its cross-section: two caps and a wall
 * joining them.
 *
 * The bevel is where the interesting decision is. The textbook approach offsets
 * the outline inward by the bevel size and lofts to it, which self-intersects
 * the moment the bevel exceeds half the width of any feature — the same failure
 * that rules a bevel out as an inflation method. So the bevel here is a *height
 * field over the cap*, driven by the same distance-to-boundary the inflate
 * generator uses. A bevel wider than a thin stroke then rounds that stroke over
 * completely instead of tearing it, which is the sane reading of the request,
 * and the cap stays a valid triangulation at any bevel size.
 */

import type { Component, MeshData } from '../types';
import { boundsOf, componentBounds, resampleRing } from '../geom/polygon';
import { SegmentIndex } from '../geom/segmentIndex';
import { MeshBuilder } from '../geom/meshBuilder';
import { triangulateComponent, canonicalRings } from '../geom/triangulate';
import { sampleSurface } from '../geom/surfaceSample';
import { inflateProfile } from './inflate';

/** Where the solid sits relative to the plane the artwork was drawn on. */
export type DepthAlignment = 'front' | 'center' | 'back';

export interface ExtrudeOptions {
  depth: number;
  alignment: DepthAlignment;
  /** How far in from the outline the bevel reaches, in logo units. 0 is a hard edge. */
  bevelSize: number;
  /** How far down from the cap the bevel travels. */
  bevelThickness: number;
  /** 0 is a chamfer, 0.5 a quarter-round, 1 a full soft roll. Same family as inflate's fullness. */
  bevelProfile: number;
  /** Rings across the bevel band. Ignored when there is no bevel. */
  bevelSegments: number;
  /** Longest contour edge, in logo units. Lower is rounder and heavier. */
  curveQuality: number;
  capFront: boolean;
  capBack: boolean;
}

export const DEFAULT_EXTRUDE: ExtrudeOptions = {
  depth: 8,
  alignment: 'center',
  bevelSize: 0,
  bevelThickness: 0,
  bevelProfile: 0.5,
  bevelSegments: 4,
  curveQuality: 0.6,
  capFront: true,
  capBack: true,
};

export function extrude(components: readonly Component[], options: Partial<ExtrudeOptions> = {}): MeshData {
  const opt = { ...DEFAULT_EXTRUDE, ...options };
  const builder = new MeshBuilder();
  if (components.length === 0) return builder.build();

  const overall = boundsOf(components);
  const span = Math.max(overall.maxX - overall.minX, overall.maxY - overall.minY, 1e-6);
  const depth = Math.max(0, opt.depth);
  const [zBack, zFront] = alignmentRange(opt.alignment, depth);

  const bevelSize = Math.max(0, opt.bevelSize);
  const bevelThickness = Math.max(0, Math.min(opt.bevelThickness, depth / 2));
  const bevelled = bevelSize > 0 && bevelThickness > 0;

  for (const component of components) {
    const rings = component.rings.filter((r) => r.length >= 6);
    if (rings.length === 0) continue;

    const cb = componentBounds(component);
    // curveQuality is "longest contour edge as a fraction of the component",
    // inverted so higher is finer.
    const maxSegment = Math.max(
      Math.min(cb.maxX - cb.minX, cb.maxY - cb.minY) / (4 + clamp01(opt.curveQuality) * 60),
      1e-4,
    );
    const resampled = rings.map((r) => resampleRing(r, maxSegment));
    // Canonical orientation, once, for both the caps and the wall. Letting each
    // of them read the source's own winding is how they came to disagree.
    const { outer, holes } = canonicalRings({ ...component, rings: resampled });
    // Order does not matter to the wall — the winding carries the meaning.
    const dense = [...outer, ...holes];
    if (dense.length === 0) continue;
    const denseComponent: Component = { ...component, rings: dense };

    // Where the wall stops and the bevel takes over. With no bevel they are the
    // same plane and the cap sits flat on top of the wall.
    const wallTop = bevelled ? zFront - bevelThickness : zFront;
    const wallBottom = bevelled ? zBack + bevelThickness : zBack;

    builder.beginComponent(component.id);

    let emitted = false;
    if (bevelled) {
      // A bevel is a height field over the cap, so the cap needs interior
      // vertices to carry it — earcut supplies none, which is why this shares
      // Inflate's sampler rather than triangulating the outline. It also means
      // a bevel wider than a thin stroke rounds that stroke over completely
      // instead of tearing it, which is what an inward offset would do.
      // A bevel is a gentle ramp, not a vertical wall: it needs no rim packing.
      const sample = sampleSurface(denseComponent, { quality: opt.curveQuality, rimRings: 3 });
      if (sample.triangles.length > 0) {
        emitted = true;
        const { xs, ys, distance, triangles } = sample;
        const capHeight = (d: number, sign: 1 | -1): number => {
          const base = sign === 1 ? zFront : zBack;
          const t = Math.min(1, d / bevelSize);
          // 1 at the outline, 0 once past the bevel band.
          const drop = 1 - inflateProfile(t, opt.bevelProfile, 0);
          return base - sign * bevelThickness * drop;
        };
        for (const sign of [1, -1] as const) {
          if (sign === 1 && !opt.capFront) continue;
          if (sign === -1 && !opt.capBack) continue;
          const base = builder.vertexCount;
          for (let i = 0; i < xs.length; i++) {
            builder.vertex(
              xs[i], ys[i], capHeight(distance[i], sign),
              (xs[i] - overall.minX) / span, (ys[i] - overall.minY) / span,
            );
          }
          for (let t = 0; t < triangles.length; t += 3) {
            const a = base + triangles[t], b = base + triangles[t + 1], c = base + triangles[t + 2];
            if (sign === 1) builder.triangle(a, b, c);
            else builder.triangle(c, b, a);
          }
        }
      }
    }

    if (!emitted) {
      // No bevel (or the sampler found nothing to work with): a flat cap from
      // earcut is cheaper, exact on the outline, and has no interior vertices
      // to go wrong.
      const cap = triangulateComponent(denseComponent);
      if (cap.indices.length === 0) { builder.endComponent(); continue; }
      const capVerts = cap.coords.length / 2;
      for (const sign of [1, -1] as const) {
        if (sign === 1 && !opt.capFront) continue;
        if (sign === -1 && !opt.capBack) continue;
        const base = builder.vertexCount;
        const z = sign === 1 ? wallTop : wallBottom;
        for (let i = 0; i < capVerts; i++) {
          const x = cap.coords[i * 2];
          const y = cap.coords[i * 2 + 1];
          builder.vertex(x, y, z, (x - overall.minX) / span, (y - overall.minY) / span);
        }
        // Earcut works in the artwork's own Y-down frame, so its winding reads
        // clockwise as Y-up. Reversed here so the front face points +Z.
        for (let t = 0; t < cap.indices.length; t += 3) {
          if (sign === 1) builder.triangle(base + cap.indices[t + 2], base + cap.indices[t + 1], base + cap.indices[t]);
          else builder.triangle(base + cap.indices[t], base + cap.indices[t + 1], base + cap.indices[t + 2]);
        }
      }
    }

    // ---- wall ------------------------------------------------------------
    // Its own vertices, not the caps': sharing one would average the cap normal
    // and the wall normal together and round off the very edge the user asked
    // to be crisp. Two coincident vertices carrying different normals is how a
    // hard edge is expressed.
    if (wallTop > wallBottom + 1e-9) {
      for (const ring of dense) {
        const n = ring.length / 2;
        if (n < 3) continue;
        const first = builder.vertexCount;
        for (let i = 0; i < n; i++) {
          const x = ring[i * 2];
          const y = ring[i * 2 + 1];
          const u = perimeterAt(ring, i) / span;
          builder.vertex(x, y, wallTop, u, 1);
          builder.vertex(x, y, wallBottom, u, 0);
        }
        for (let i = 0; i < n; i++) {
          const a = first + i * 2;
          const b = first + ((i + 1) % n) * 2;
          // One formula for outlines and holes alike. A hole's wall has to face
          // inwards, and it does so automatically: the canonical orientation
          // already winds holes opposite to outlines, so walking both the same
          // way produces opposite facings. Branching on "is this a hole" here as
          // well flips it a second time and cancels out — which is precisely
          // the bug that made a holed extrusion enclose the wrong volume.
          builder.triangle(a, b, a + 1);
          builder.triangle(b, b + 1, a + 1);
        }
      }
    }

    builder.endComponent();
  }

  builder.computeVertexNormals();
  return builder.build();
}

/** Flat is Extrude with no depth: one surface, optionally doubled so it reads
 *  from both sides. It stays an open surface — the PRD is explicit that a user
 *  who needs a solid should reach for Extrude or Inflate instead. */
export interface FlatOptions {
  /** Non-zero turns it into a very thin solid rather than a surface. */
  thickness: number;
  showFront: boolean;
  showBack: boolean;
  curveQuality: number;
}

export const DEFAULT_FLAT: FlatOptions = {
  thickness: 0,
  showFront: true,
  showBack: true,
  curveQuality: 0.6,
};

export function flat(components: readonly Component[], options: Partial<FlatOptions> = {}): MeshData {
  const opt = { ...DEFAULT_FLAT, ...options };
  return extrude(components, {
    depth: Math.max(0, opt.thickness),
    alignment: 'center',
    bevelSize: 0,
    bevelThickness: 0,
    curveQuality: opt.curveQuality,
    capFront: opt.showFront,
    capBack: opt.showBack,
  });
}

function alignmentRange(alignment: DepthAlignment, depth: number): [back: number, front: number] {
  if (alignment === 'front') return [-depth, 0];
  if (alignment === 'back') return [0, depth];
  return [-depth / 2, depth / 2];
}

/** Cumulative perimeter up to vertex `i`, for wall UVs that do not stretch. */
function perimeterAt(ring: Float64Array, i: number): number {
  let p = 0;
  for (let k = 0; k < i; k++) {
    const j = k + 1;
    p += Math.hypot(ring[j * 2] - ring[k * 2], ring[j * 2 + 1] - ring[k * 2 + 1]);
  }
  return p;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
