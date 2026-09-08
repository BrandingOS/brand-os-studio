/**
 * =============================================================================
 * 3D Logo Studio — engine types
 * =============================================================================
 *
 * The pure layer. Nothing here imports React, the DOM, or Three.js: a
 * component is rings of numbers, a mesh is typed arrays, and every generator
 * is a function from one to the other. That is what lets the whole geometry
 * pipeline run inside a Worker and be unit-tested in Node without a canvas.
 *
 * `render/` owns the translation to `THREE.BufferGeometry`; nothing in this
 * folder knows that Three.js exists.
 */

/** A closed polygon ring, flat `[x0, y0, x1, y1, …]`. The closing edge from the
 *  last point back to the first is implicit — never repeat the first point. */
export type Ring = Float64Array;

/** SVG's two fill rules. Decides which rings are solid and which are holes. */
export type FillRule = 'nonzero' | 'evenodd';

/**
 * One addressable piece of the logo.
 *
 * A component is whatever the importer decided is a single thing the user can
 * select — usually one `<path>`. It may be a compound path: `rings` holds the
 * outer boundary *and* its holes, and `fillRule` is what tells them apart.
 * Keeping them together is why holes never need a separate code path.
 */
export interface Component {
  /** Stable for the life of the project. Survives reordering and re-import. */
  id: string;
  rings: Ring[];
  fillRule: FillRule;
  /** Source fill, `#rrggbb`. The importer's reading of the artwork, not a material. */
  color?: string;
}

/** Axis-aligned bounds in the logo's own 2D units (the SVG viewBox). */
export interface Bounds2 {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Which component each slice of `indices` belongs to, so a generated mesh can
 *  still be selected, hidden, and materialled per component. */
export interface MeshGroup {
  componentId: string;
  /** Offset into `indices`. */
  start: number;
  /** Number of indices. */
  count: number;
}

/**
 * The output of every geometry generator and the input to every modifier.
 *
 * Typed arrays because these cross a Worker boundary and reach the GPU
 * unchanged. `normals` may be empty when a generator leaves them to be
 * computed later; `uvs` may be empty when a generator has no opinion.
 */
export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  groups: MeshGroup[];
}

/** An empty mesh — the identity value, so callers never branch on null. */
export const EMPTY_MESH: MeshData = {
  positions: new Float32Array(0),
  normals: new Float32Array(0),
  uvs: new Float32Array(0),
  indices: new Uint32Array(0),
  groups: [],
};
