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
  geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions.slice(), 3));
  if (mesh.normals.length === mesh.positions.length) {
    geometry.setAttribute('normal', new THREE.BufferAttribute(mesh.normals.slice(), 3));
  }
  if (mesh.uvs.length === (mesh.positions.length / 3) * 2) {
    geometry.setAttribute('uv', new THREE.BufferAttribute(mesh.uvs.slice(), 2));
  }
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices.slice(), 1));

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
  // Generators intentionally emit negative signed volume in SVG's Y-down
  // frame. Reflecting Y already turns that into positive volume. Reversing
  // indices a second time made every rendered surface face inward.
  geometry.scale(1, -1, 1);
  const normal = geometry.getAttribute('normal');
  if (normal) {
    // Reflection changes cross-product handedness; the normal matrix alone
    // cannot account for that sign. Preserve smoothing and negate once.
    for (let i = 0; i < normal.count; i++) {
      normal.setXYZ(i, -normal.getX(i), -normal.getY(i), -normal.getZ(i));
    }
    normal.needsUpdate = true;
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return scale;
}

/** Reverse winding after reflection. BufferGeometry.scale already transformed normals. */
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
}
