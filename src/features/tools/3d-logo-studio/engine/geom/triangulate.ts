/**
 * =============================================================================
 * Cap triangulation
 * =============================================================================
 *
 * Turns a component's rings into flat triangles for the front and back faces of
 * an extrusion. Earcut wants one flat coordinate array with hole start indices,
 * which means the outer/hole split has to be resolved first — `classifyRings`
 * does that from the fill rule rather than from winding, so an Illustrator
 * export whose holes wind the same way as their outline still works.
 */

import earcut from 'earcut';
import type { Component, Ring } from '../types';
import { classifyRings, pointInRings, probeJustInside } from './polygon';

export interface CapTriangulation {
  /** Flat `[x0, y0, x1, y1, …]` — the vertices the indices refer to. */
  coords: Float64Array;
  /** Triangle indices into `coords`, counter-clockwise in a Y-up frame. */
  indices: Uint32Array;
}

/**
 * Triangulate one component's fill.
 *
 * Each outer ring is triangulated with the holes that belong to it. Holes are
 * matched to their outer ring by containment rather than assumed to be in
 * order: a compound path can hold several islands, and handing every hole to
 * the first outline punches holes through the wrong shape.
 */
export function triangulateComponent(component: Component): CapTriangulation {
  const { outer, holes } = classifyRings(component);
  if (outer.length === 0) return { coords: new Float64Array(0), indices: new Uint32Array(0) };

  const coords: number[] = [];
  const indices: number[] = [];

  for (const shell of outer) {
    const mine = holes.filter((h) => {
      const p = probeJustInside(h);
      return p ? pointInRings([shell], p[0], p[1], 'nonzero') : false;
    });

    const flat: number[] = [];
    const holeStarts: number[] = [];
    pushRing(flat, shell);
    for (const h of mine) {
      holeStarts.push(flat.length / 2);
      pushRing(flat, h);
    }

    const base = coords.length / 2;
    const tri = earcut(flat, holeStarts, 2);
    for (let i = 0; i < flat.length; i++) coords.push(flat[i]);
    for (let i = 0; i < tri.length; i++) indices.push(base + tri[i]);
  }

  return { coords: Float64Array.from(coords), indices: Uint32Array.from(indices) };
}

function pushRing(into: number[], ring: Ring): void {
  for (let i = 0; i < ring.length; i++) into.push(ring[i]);
}
