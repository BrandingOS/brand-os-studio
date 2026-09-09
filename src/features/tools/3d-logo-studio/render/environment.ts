/**
 * =============================================================================
 * The studio environment
 * =============================================================================
 *
 * What a metal surface reflects, and therefore what it looks like.
 *
 * Three.js ships `RoomEnvironment`, which is a small box with hard rectangular
 * emissive panels in it. It is excellent for making a scene readable and wrong
 * for this: a polished sphere reflects those panels as sharp bright rectangles
 * that converge towards the pole, so a ball of textured silver came out with a
 * starburst across it. No amount of tuning the *material* fixes that, because
 * the material was never the problem — a mirror shows you the room.
 *
 * A product studio is instead a very large, very soft source: a broad overhead
 * softbox, a gentler fill, and a gradient falling away to the floor. That is
 * what this paints, directly into an equirectangular canvas, which
 * `PMREMGenerator` then prefilters. It is a few kilobytes of arithmetic rather
 * than a downloaded HDRI, which keeps the promise that nothing leaves the
 * device.
 */

import * as THREE from 'three';

export interface SoftBox {
  /** Horizontal position, 0..1 around the sphere. 0.5 faces the camera. */
  u: number;
  /** Vertical position, 0 at the top pole, 1 at the bottom. */
  v: number;
  /** Angular size, as a fraction of the map. Large is soft. */
  size: number;
  intensity: number;
  color: string;
}

export interface EnvironmentRecipe {
  /** Sky and floor luminance, before the softboxes are added. */
  top: number;
  horizon: number;
  bottom: number;
  tint: string;
  boxes: SoftBox[];
}

/** A broad overhead source with a soft fill — the default product studio. */
export const SOFT_STUDIO: EnvironmentRecipe = {
  top: 0.78,
  horizon: 0.34,
  bottom: 0.09,
  tint: '#ffffff',
  boxes: [
    { u: 0.5, v: 0.15, size: 0.4, intensity: 1.5, color: '#ffffff' },
    { u: 0.12, v: 0.44, size: 0.32, intensity: 0.55, color: '#eef2ff' },
    { u: 0.86, v: 0.48, size: 0.28, intensity: 0.4, color: '#fff6ec' },
  ],
};

/** Dark surround with a hard-edged key — for rim-lit, high-contrast frames. */
export const DARK_STUDIO: EnvironmentRecipe = {
  top: 0.22,
  horizon: 0.06,
  bottom: 0.02,
  tint: '#ffffff',
  boxes: [
    { u: 0.5, v: 0.2, size: 0.2, intensity: 4.5, color: '#ffffff' },
    { u: 0.08, v: 0.55, size: 0.16, intensity: 1.6, color: '#cfe0ff' },
  ],
};

/** Bright, wrap-around light with almost no falloff — maximum reflection. */
export const BRIGHT_STUDIO: EnvironmentRecipe = {
  top: 1.5,
  horizon: 1.1,
  bottom: 0.6,
  tint: '#ffffff',
  boxes: [
    { u: 0.5, v: 0.14, size: 0.5, intensity: 2.2, color: '#ffffff' },
    { u: 0.25, v: 0.62, size: 0.4, intensity: 1.1, color: '#ffffff' },
  ],
};

/**
 * Paint a recipe into an equirectangular texture.
 *
 * `HalfFloatType` because the softboxes are deliberately brighter than white:
 * clipping them to 1.0 would flatten the specular highlights into featureless
 * discs, which is the difference between metal and grey paint.
 */
export function buildEnvironmentTexture(recipe: EnvironmentRecipe, width = 512): THREE.DataTexture {
  const height = Math.max(2, Math.round(width / 2));
  const data = new Uint16Array(width * height * 4);
  const tint = new THREE.Color(recipe.tint);

  const boxes = recipe.boxes.map((b) => ({ ...b, rgb: new THREE.Color(b.color) }));

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1);
    // Two linear ramps rather than one, so the horizon can sit where a real
    // studio's does instead of halfway up.
    const base = v < 0.5
      ? recipe.top + (recipe.horizon - recipe.top) * (v / 0.5)
      : recipe.horizon + (recipe.bottom - recipe.horizon) * ((v - 0.5) / 0.5);

    for (let x = 0; x < width; x++) {
      const u = x / width;
      let r = base * tint.r;
      let g = base * tint.g;
      let b = base * tint.b;

      for (const box of boxes) {
        // Wrap in u, because the map joins at the seam and a source near it
        // would otherwise be cut in half.
        let du = Math.abs(u - box.u);
        if (du > 0.5) du = 1 - du;
        // Scaled by sin(latitude): near the poles the map is stretched, and an
        // unscaled distance makes a round source into a wide smear.
        const lat = v * Math.PI;
        du *= Math.max(0.15, Math.sin(lat));
        const dv = Math.abs(v - box.v);
        const d = Math.hypot(du * 2, dv) / box.size;
        if (d >= 1) continue;
        // Smootherstep falloff: a linear edge on a softbox shows as a visible
        // ring in the reflection.
        const t = 1 - d;
        const falloff = t * t * t * (t * (t * 6 - 15) + 10);
        r += box.intensity * falloff * box.rgb.r;
        g += box.intensity * falloff * box.rgb.g;
        b += box.intensity * falloff * box.rgb.b;
      }

      const i = (y * width + x) * 4;
      data[i] = THREE.DataUtils.toHalfFloat(r);
      data[i + 1] = THREE.DataUtils.toHalfFloat(g);
      data[i + 2] = THREE.DataUtils.toHalfFloat(b);
      data[i + 3] = THREE.DataUtils.toHalfFloat(1);
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.HalfFloatType);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}
