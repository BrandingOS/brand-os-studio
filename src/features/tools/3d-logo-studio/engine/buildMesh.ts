/**
 * =============================================================================
 * Document → mesh
 * =============================================================================
 *
 * The single dispatch point from a saved project to generated geometry. Every
 * mode goes through it, which is what "all four methods work through the same
 * engine contract" has to mean in code: nothing downstream — the renderer, the
 * exporters, the future modifier stack — knows which mode produced a mesh.
 *
 * It returns warnings alongside the mesh because some correct results still
 * need saying out loud. Revolve can fold a profile through its own axis, and a
 * generator that could only return geometry would have to either refuse or stay
 * silent; neither is right.
 */

import type { MeshData } from './types';
import { EMPTY_MESH } from './types';
import { inflate } from './modes/inflate';
import { extrude, flat } from './modes/extrude';
import { revolve, type RevolveWarning } from './modes/revolve';
import { visibleComponents, type Studio3dDocument } from './document';

export interface BuildResult {
  mesh: MeshData;
  warnings: RevolveWarning[];
  /** Wall-clock milliseconds, for the adaptive-quality decisions Phase 8 makes. */
  durationMs: number;
}

export function buildMesh(doc: Studio3dDocument): BuildResult {
  const started = now();
  const components = visibleComponents(doc);
  if (components.length === 0) {
    return { mesh: EMPTY_MESH, warnings: [], durationMs: now() - started };
  }

  const { mode } = doc.geometry;
  let mesh: MeshData;
  let warnings: RevolveWarning[] = [];

  if (mode === 'inflate') {
    mesh = inflate(components, doc.geometry.inflate);
  } else if (mode === 'extrude') {
    mesh = extrude(components, doc.geometry.extrude);
  } else if (mode === 'flat') {
    mesh = flat(components, doc.geometry.flat);
  } else {
    const result = revolve(components, doc.geometry.revolve);
    mesh = result.mesh;
    warnings = result.warnings;
  }

  return { mesh, warnings, durationMs: now() - started };
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
