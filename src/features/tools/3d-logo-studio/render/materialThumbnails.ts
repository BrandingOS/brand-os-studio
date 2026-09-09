/**
 * =============================================================================
 * Material thumbnails
 * =============================================================================
 *
 * A rendered sphere per material, for the picker.
 *
 * A CSS gradient was the cheaper option and it cannot do this job: polished
 * chrome, brushed aluminium and textured silver are all "a light grey metal" by
 * their colour values, and what separates them is entirely how they reflect and
 * how their grain runs. A swatch that cannot tell them apart is a swatch that
 * makes the user open all three.
 *
 * So the previews are the real material on a real sphere under the real studio
 * environment — the same code path the viewport uses, which also means a
 * material can never look one way in the picker and another on the model.
 *
 * All of them are drawn in a single pass on one offscreen canvas, then cached
 * for the tab. Twenty-four spheres at 96px is a few milliseconds of GPU work
 * once; it is the WebGL context that is worth being careful with, and this takes
 * exactly one and gives it straight back.
 */

import * as THREE from 'three';
import type { MaterialPreset } from '../materials/types';
import { Studio, buildMaterial } from './studio';
import { LIGHTING_PRESETS } from '../materials/lighting';

/** Cached per size, because the render is deterministic and the cost is real. */
const cache = new Map<number, Promise<Map<string, string>>>();

export function materialThumbnails(
  presets: readonly MaterialPreset[],
  size = 96,
): Promise<Map<string, string>> {
  const existing = cache.get(size);
  if (existing) return existing;
  const pending = render(presets, size).catch(() => new Map<string, string>());
  cache.set(size, pending);
  return pending;
}

async function render(presets: readonly MaterialPreset[], size: number): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (typeof document === 'undefined') return out;

  const pixelRatio = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = size * pixelRatio;
  canvas.height = size * pixelRatio;

  let studio: Studio;
  try {
    studio = new Studio({ canvas, width: size, height: size, pixelRatio, transparent: true });
  } catch {
    // No WebGL — the caller falls back to a flat chip rather than showing
    // nothing. A picker that fails closed is worse than one that is imprecise.
    return out;
  }

  // Lit as a product shot rather than dramatically: a swatch has to read at
  // 22 pixels, where a rim light is just a bright edge and tells you nothing.
  studio.setLighting(LIGHTING_PRESETS.find((l) => l.id === 'soft-product') ?? LIGHTING_PRESETS[0], false);

  const geometry = new THREE.SphereGeometry(1, 96, 64);
  try {
    for (const preset of presets) {
      // Glass over nothing renders as nothing: transmission refracts what is
      // behind the surface, and behind it was a transparent background. Clear
      // and frosted glass came out as blank circles. A gradient card gives them
      // something to bend, and opaque materials keep the empty surround so their
      // own silhouette is the swatch.
      // High contrast, and a hard-ish horizon: what makes glass legible at 22
      // pixels is seeing the horizon bent and flipped through it. A gentle
      // backdrop close to the glass's own tone gave a featureless pale disc that
      // could have been ceramic.
      if (preset.params.transmission > 0) studio.setBackdrop('#fbfcfd', '#191d24', 2.6);
      else studio.clearBackdrop();
      const material = buildMaterial(preset);
      studio.setObject(geometry, material);
      // Slightly off-axis: dead-on, a sphere shows one highlight and no
      // silhouette shading, and every metal looks the same.
      studio.camera.position.set(0.35, 0.42, 1);
      studio.frame(1.02);
      studio.render();
      out.set(preset.id, canvas.toDataURL('image/png'));
      studio.clearObject();
      material.dispose();
      for (const t of (material.userData.grainTextures ?? []) as THREE.Texture[]) t.dispose();
    }
  } finally {
    geometry.dispose();
    studio.dispose();
  }
  return out;
}
