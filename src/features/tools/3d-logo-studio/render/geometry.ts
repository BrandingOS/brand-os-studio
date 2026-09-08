/**
 * =============================================================================
 * MeshData → Three.js
 * =============================================================================
 *
 * The only place the engine's typed arrays become a GPU object. Keeping it in
 * one function is what lets everything upstream stay renderer-agnostic — and
 * what makes it obvious where to add a second backend later.
 */

import * as THREE from 'three';
import type { MeshData } from '../engine/types';

export interface BuiltGeometry {
  geometry: THREE.BufferGeometry;
  /** `groups` mirrored onto the geometry so a component can take its own
   *  material without the mesh being split into separate objects. */
  componentOrder: string[];
}

export function toBufferGeometry(mesh: MeshData): BuiltGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  if (mesh.normals.length === mesh.positions.length) {
    geometry.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
  }
  if (mesh.uvs.length === (mesh.positions.length / 3) * 2) {
    geometry.setAttribute('uv', new THREE.BufferAttribute(mesh.uvs, 2));
  }
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));

  const componentOrder: string[] = [];
  mesh.groups.forEach((g, i) => {
    geometry.addGroup(g.start, g.count, i);
    componentOrder.push(g.componentId);
  });
  if (mesh.normals.length !== mesh.positions.length) geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, componentOrder };
}

/**
 * Centre the geometry on the origin and scale it to a known size.
 *
 * Everything upstream works in the SVG's own units, where a 113-unit viewBox and
 * a 1024-unit one describe the same logo. Normalising here means the camera,
 * the lights and every material's `thickness` mean the same thing whatever the
 * file's units were — and it is the reason a project saved from one logo opens
 * looking sane with another.
 */
export function normalizeToUnitSize(geometry: THREE.BufferGeometry, targetSize = 2): number {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return 1;
  const size = new THREE.Vector3();
  const centre = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(centre);
  const largest = Math.max(size.x, size.y, size.z, 1e-9);
  const scale = targetSize / largest;
  geometry.translate(-centre.x, -centre.y, -centre.z);
  geometry.scale(scale, scale, scale);
  // SVG's Y axis points down and every 3D convention here points it up. Flipping
  // on the geometry rather than the object keeps the model upright in an
  // exported GLB too, where a parent's negative scale is a well-known way to
  // make other applications' normals come out inside-out.
  geometry.scale(1, -1, 1);
  // A negative scale on one axis reverses every triangle's winding, so the
  // faces have to be turned back or the whole model renders inside-out. Doing
  // it here rather than leaving it to the caller is deliberate: the two
  // operations are one step, and separating them is a bug waiting to be
  // reintroduced.
  flipWinding(geometry);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return scale;
}

/** Reverse triangle winding (and the Y component of the normals with it). */
export function flipWinding(geometry: THREE.BufferGeometry): void {
  const index = geometry.getIndex();
  if (!index) return;
  const a = index.array as Uint32Array | Uint16Array;
  for (let i = 0; i < a.length; i += 3) {
    const t = a[i];
    a[i] = a[i + 2];
    a[i + 2] = t;
  }
  index.needsUpdate = true;
  const normal = geometry.getAttribute('normal');
  if (normal) {
    const n = normal.array as Float32Array;
    for (let i = 1; i < n.length; i += 3) n[i] = -n[i];
    normal.needsUpdate = true;
  }
}
