/**
 * =============================================================================
 * Revolve — a lathe over a chosen profile
 * =============================================================================
 *
 * Sweeps a component's outline around an axis lying in the artwork's own plane.
 * Unlike the other three modes this one does not preserve the logo: the PRD
 * calls it "a creative operation [that] may substantially change the logo
 * silhouette", and the interface has to say so before it runs.
 *
 * The axis is a line in 2D, not a 3D vector, and that is deliberate. An axis
 * perpendicular to the artwork (a "Z axis") sweeps every profile point in the
 * plane it already lies in, so the result collapses to a flat annulus — the
 * operation is undefined rather than merely ugly. `revolve` reports that as an
 * unsupported combination instead of returning a degenerate mesh, which is what
 * "report unsupported combinations clearly" has to mean at this layer.
 */

import type { Component, MeshData } from '../types';
import { boundsOf, componentBounds, resampleRing, ringArea } from '../geom/polygon';
import { MeshBuilder } from '../geom/meshBuilder';
import { triangulateComponent } from '../geom/triangulate';

/** `'x'` and `'y'` are the artwork's own axes; a number is an angle in radians. */
export type RevolveAxis = 'x' | 'y' | { angle: number };

export interface RevolveOptions {
  axis: RevolveAxis;
  /**
   * Where the axis sits, as a fraction of the *whole logo's* extent across it.
   * 0 is the near edge, 1 the far edge, 0.5 the middle.
   *
   * Whole logo, not per component, and that is the difference between a lathe
   * and nine unrelated tureens: every component sweeps about one shared axis, so
   * a multi-part mark revolves into a single coherent form. Measuring per
   * component also made the default straddle every one of them at once, which
   * is how a nine-part logo produced nine identical warnings.
   */
  pivot: number;
  /** Extra offset along the axis normal, in logo units — moves the lathe off
   *  the shape entirely to produce a ring rather than a solid. */
  offset: number;
  /** Sweep in radians. 2π is a full revolution. */
  sweep: number;
  segments: number;
  /** Close the two ends of a partial sweep. Ignored at a full revolution. */
  caps: boolean;
  curveQuality: number;
}

export const DEFAULT_REVOLVE: RevolveOptions = {
  axis: 'y',
  // At the edge rather than the middle: a profile straddling its own axis folds
  // through itself, and a default that does that to every component is a
  // default that greets the user with a wall of warnings.
  pivot: 0,
  offset: 0,
  sweep: Math.PI * 2,
  segments: 64,
  caps: true,
  curveQuality: 0.6,
};

export interface RevolveResult {
  mesh: MeshData;
  /** Non-fatal notes the UI must surface — an empty array means a clean run. */
  warnings: RevolveWarning[];
}

export type RevolveWarning =
  | { code: 'profile-crosses-axis'; componentId: string }
  | { code: 'empty-profile'; componentId: string };

export function revolve(components: readonly Component[], options: Partial<RevolveOptions> = {}): RevolveResult {
  const opt = { ...DEFAULT_REVOLVE, ...options };
  const builder = new MeshBuilder();
  const warnings: RevolveWarning[] = [];
  if (components.length === 0) return { mesh: builder.build(), warnings };

  const overall = boundsOf(components);
  const span = Math.max(overall.maxX - overall.minX, overall.maxY - overall.minY, 1e-6);
  const sweep = clamp(opt.sweep, 1e-3, Math.PI * 2);
  const full = Math.abs(sweep - Math.PI * 2) < 1e-6;
  const segments = Math.max(3, Math.round(opt.segments));
  const angle = opt.axis === 'x' ? 0 : opt.axis === 'y' ? Math.PI / 2 : opt.axis.angle;
  // Direction along the axis, and the perpendicular the radius is measured on.
  const ax = Math.cos(angle);
  const ay = Math.sin(angle);
  // The perpendicular is taken so that `pivot` grows along +X for a Y axis:
  // dragging the slider right moves the axis right. The opposite sign is
  // geometrically equivalent — the sweep is symmetric about the axis — but it
  // made pivot 0 mean the far edge, which is not what a slider labelled
  // "Pivot" should do.
  const nx = ay;
  const ny = -ax;

  // One axis for the whole logo, measured across the overall bounds, so every
  // component sweeps about the same line and the parts stay in relation to each
  // other.
  const overallCorners: [number, number][] = [
    [overall.minX, overall.minY], [overall.maxX, overall.minY],
    [overall.maxX, overall.maxY], [overall.minX, overall.maxY],
  ];
  let pMin = Infinity;
  let pMax = -Infinity;
  for (const [x, y] of overallCorners) {
    const p = x * nx + y * ny;
    if (p < pMin) pMin = p;
    if (p > pMax) pMax = p;
  }
  const pivotP = pMin + (pMax - pMin) * opt.pivot + opt.offset;

  for (const component of components) {
    const rings = component.rings.filter((r) => r.length >= 6);
    if (rings.length === 0) {
      warnings.push({ code: 'empty-profile', componentId: component.id });
      continue;
    }

    const cb = componentBounds(component);
    const maxSegment = Math.max(
      Math.min(cb.maxX - cb.minX, cb.maxY - cb.minY) / (4 + clamp01(opt.curveQuality) * 60),
      1e-4,
    );

    builder.beginComponent(component.id);
    let crossed = false;

    for (const ring of rings) {
      const dense = resampleRing(ring, maxSegment);
      const n = dense.length / 2;
      if (n < 3) continue;

      // Profile: distance from the axis (radius) and position along it (height).
      const radius = new Float64Array(n);
      const height = new Float64Array(n);
      let anyPositive = false;
      let anyNegative = false;
      for (let i = 0; i < n; i++) {
        const x = dense[i * 2];
        const y = dense[i * 2 + 1];
        const r = x * nx + y * ny - pivotP;
        if (r > 1e-9) anyPositive = true;
        if (r < -1e-9) anyNegative = true;
        radius[i] = Math.abs(r);
        height[i] = x * ax + y * ay;
      }
      // A profile straddling the axis folds through itself when swept. The mesh
      // is still built — the user may want exactly that — but it is reported.
      if (anyPositive && anyNegative) crossed = true;

      const ringCount = full ? segments : segments + 1;
      const first = builder.vertexCount;
      for (let s = 0; s < ringCount; s++) {
        const t = full ? s / segments : s / segments;
        const th = t * sweep;
        const c = Math.cos(th);
        const sn = Math.sin(th);
        for (let i = 0; i < n; i++) {
          // The axis stays in the XY plane; the sweep lifts the radius out of it.
          const r = radius[i];
          const h = height[i];
          builder.vertex(
            ax * h + nx * (pivotP + r * c),
            ay * h + ny * (pivotP + r * c),
            r * sn,
            t,
            i / n,
          );
        }
      }

      const ccw = ringArea(dense) > 0;
      for (let s = 0; s < segments; s++) {
        const a0 = first + (s % ringCount) * n;
        const a1 = first + ((s + 1) % ringCount) * n;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const v00 = a0 + i, v01 = a0 + j, v10 = a1 + i, v11 = a1 + j;
          if (ccw) {
            builder.triangle(v00, v10, v01);
            builder.triangle(v01, v10, v11);
          } else {
            builder.triangle(v00, v01, v10);
            builder.triangle(v01, v11, v10);
          }
        }
      }
    }

    // A partial sweep leaves the profile open at both ends. Capping it with the
    // flat triangulation is what makes the result a solid rather than a shell.
    if (!full && opt.caps) {
      const cap = triangulateComponent({ ...component, rings });
      if (cap.indices.length > 0) {
        for (const [th, flip] of [[0, false], [sweep, true]] as const) {
          const c = Math.cos(th);
          const sn = Math.sin(th);
          const base = builder.vertexCount;
          for (let i = 0; i < cap.coords.length / 2; i++) {
            const x = cap.coords[i * 2];
            const y = cap.coords[i * 2 + 1];
            const r = x * nx + y * ny - pivotP;
            const h = x * ax + y * ay;
            const ar = Math.abs(r);
            builder.vertex(
              ax * h + nx * (pivotP + ar * c),
              ay * h + ny * (pivotP + ar * c),
              ar * sn,
              (x - overall.minX) / span,
              (y - overall.minY) / span,
            );
          }
          for (let t = 0; t < cap.indices.length; t += 3) {
            if (flip) builder.triangle(base + cap.indices[t], base + cap.indices[t + 1], base + cap.indices[t + 2]);
            else builder.triangle(base + cap.indices[t + 2], base + cap.indices[t + 1], base + cap.indices[t]);
          }
        }
      }
    }

    builder.endComponent();
    if (crossed) warnings.push({ code: 'profile-crosses-axis', componentId: component.id });
  }

  builder.computeVertexNormals();
  return { mesh: builder.build(), warnings };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
function clamp01(v: number): number {
  return clamp(v, 0, 1);
}
