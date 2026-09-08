/**
 * =============================================================================
 * GLB export
 * =============================================================================
 *
 * GLB is the confirmed interchange format, and "it downloaded" is explicitly
 * not the acceptance test — the file has to reimport. Two things here exist
 * because of that:
 *
 * 1. **Components survive as named nodes.** A single mesh with material groups
 *    is how the renderer wants it, but a recipient opening the file wants nine
 *    selectable objects with the names they had in the studio. So the export
 *    splits by group.
 * 2. **Materials are translated, not hoped for.** `KHR_materials_transmission`
 *    is an extension, and a viewer without it shows an opaque white blob where
 *    the glass was. Each preset declares its own fallback and that is what
 *    ships when the caller asks for maximum compatibility.
 */

import * as THREE from 'three';
import type { MeshData } from '../engine/types';
import type { MaterialPreset } from '../materials/types';
import { buildMaterial } from '../render/studio';

export interface GlbExportOptions {
  /** Material per component id; anything unlisted takes `defaultMaterial`. */
  materials?: Record<string, MaterialPreset>;
  defaultMaterial: MaterialPreset;
  /** Substitute each preset's documented fallback for parameters that need a
   *  glTF extension. Off keeps full fidelity for viewers that support them. */
  compatibleMaterials?: boolean;
  /** Name of the root node, and of the file the caller will write. */
  name?: string;
}

export interface GlbExportResult {
  glb: ArrayBuffer;
  /** Anything downgraded on the way out, so the UI can say it rather than the
   *  user discovering it in another application. */
  notes: string[];
}

export async function exportGlb(mesh: MeshData, options: GlbExportOptions): Promise<GlbExportResult> {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const notes: string[] = [];
  const root = new THREE.Group();
  root.name = options.name ?? 'logo';

  const disposables: (THREE.BufferGeometry | THREE.Material)[] = [];
  const groups = mesh.groups.length > 0
    ? mesh.groups
    : [{ componentId: root.name, start: 0, count: mesh.indices.length }];

  for (const group of groups) {
    const geometry = sliceGeometry(mesh, group.start, group.count);
    if (!geometry) continue;
    disposables.push(geometry);

    const preset = options.materials?.[group.componentId] ?? options.defaultMaterial;
    const overrides = options.compatibleMaterials ? preset.glbFallback : undefined;
    if (options.compatibleMaterials && preset.glbFallback) {
      notes.push(`${preset.name}: exported using its documented fallback — the original uses glTF extensions.`);
    }
    const material = buildMaterial(preset, overrides);
    material.name = preset.name;
    disposables.push(material);

    const child = new THREE.Mesh(geometry, material);
    child.name = group.componentId;
    root.add(child);
  }

  // Y-up, metre-scale, +Z towards the viewer is what every glTF consumer
  // assumes; the studio already works that way, so nothing is rotated here.
  const glb = await new Promise<ArrayBuffer>((resolve, reject) => {
    new GLTFExporter().parse(
      root,
      (result) => {
        if (result instanceof ArrayBuffer) resolve(result);
        else reject(new Error('The exporter returned JSON where binary was requested.'));
      },
      (err) => reject(err instanceof Error ? err : new Error(String(err))),
      { binary: true },
    );
  });

  for (const d of disposables) d.dispose();
  return { glb, notes: [...new Set(notes)] };
}

/**
 * Extract one component's triangles as a standalone geometry.
 *
 * The vertices are re-indexed rather than copied wholesale: a component's
 * triangles reference a handful of the mesh's vertices, and shipping the whole
 * buffer nine times over would make the file nine times larger than the model.
 */
function sliceGeometry(mesh: MeshData, start: number, count: number): THREE.BufferGeometry | null {
  if (count <= 0) return null;
  const remap = new Map<number, number>();
  const indices = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    const original = mesh.indices[start + i];
    let mapped = remap.get(original);
    if (mapped === undefined) {
      mapped = remap.size;
      remap.set(original, mapped);
    }
    indices[i] = mapped;
  }
  const n = remap.size;
  if (n === 0) return null;

  const positions = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  const uvs = new Float32Array(n * 2);
  const hasNormals = mesh.normals.length === mesh.positions.length;
  const hasUvs = mesh.uvs.length === (mesh.positions.length / 3) * 2;
  for (const [original, mapped] of remap) {
    positions[mapped * 3] = mesh.positions[original * 3];
    positions[mapped * 3 + 1] = mesh.positions[original * 3 + 1];
    positions[mapped * 3 + 2] = mesh.positions[original * 3 + 2];
    if (hasNormals) {
      normals[mapped * 3] = mesh.normals[original * 3];
      normals[mapped * 3 + 1] = mesh.normals[original * 3 + 1];
      normals[mapped * 3 + 2] = mesh.normals[original * 3 + 2];
    }
    if (hasUvs) {
      uvs[mapped * 2] = mesh.uvs[original * 2];
      uvs[mapped * 2 + 1] = mesh.uvs[original * 2 + 1];
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (hasNormals) geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  if (hasUvs) geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  if (!hasNormals) geometry.computeVertexNormals();
  return geometry;
}
