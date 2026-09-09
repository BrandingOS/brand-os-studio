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
  /**
   * Horizontal position, 0..1 around the sphere, in the texture's own
   * coordinates. Three samples an equirectangular map as
   * `u = atan2(z, x) / 2π + 0.5`, so **u = 0.75 is +Z — the camera's side** and
   * u = 0.5 is +X, the right. Use `azimuthToU` rather than guessing.
   */
  u: number;
  /** Vertical position, authored with **0 at the top**. The painter flips it,
   *  because the texture's own v runs the other way. */
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

/**
 * Replace a recipe's key light with the user's.
 *
 * The first softbox is the key by convention — every recipe here lists it
 * first — and the fills are left alone: a control that moved every source at
 * once would not be a light, it would be a preset.
 */
export function withLightSource(recipe: EnvironmentRecipe, source: {
  azimuth: number; elevation: number; size: number; intensity: number;
} | null | undefined): EnvironmentRecipe {
  if (!source) return recipe;
  const [key, ...rest] = recipe.boxes;
  return {
    ...recipe,
    boxes: [
      {
        u: azimuthToU(source.azimuth),
        v: source.elevation,
        size: Math.max(0.04, source.size),
        intensity: Math.max(0, source.intensity),
        color: key?.color ?? '#ffffff',
      },
      ...rest,
    ],
  };
}

/**
 * Azimuth (0.5 = facing the camera) to the texture's own u.
 *
 * The one place the mapping is written down. `equirectUv` puts +Z — the camera's
 * side — at u = 0.75, so an azimuth control that meant anything intuitive had to
 * be converted rather than passed straight through, which is how the reflected
 * source and the shaded highlight ended up on opposite sides of the object.
 */
export function azimuthToU(azimuth: number): number {
  return ((1.25 - azimuth) % 1 + 1) % 1;
}

/** A broad overhead source with a soft fill — the default product studio. */
export const SOFT_STUDIO: EnvironmentRecipe = {
  top: 0.78,
  horizon: 0.34,
  bottom: 0.09,
  tint: '#ffffff',
  boxes: [
    { u: 0.75, v: 0.15, size: 0.4, intensity: 1.5, color: '#ffffff' },
    { u: 0.37, v: 0.44, size: 0.32, intensity: 0.55, color: '#eef2ff' },
    { u: 0.11, v: 0.48, size: 0.28, intensity: 0.4, color: '#fff6ec' },
  ],
};

/** Dark surround with a hard-edged key — for rim-lit, high-contrast frames. */
export const DARK_STUDIO: EnvironmentRecipe = {
  top: 0.22,
  horizon: 0.06,
  bottom: 0.02,
  tint: '#ffffff',
  boxes: [
    { u: 0.75, v: 0.2, size: 0.2, intensity: 4.5, color: '#ffffff' },
    { u: 0.33, v: 0.55, size: 0.16, intensity: 1.6, color: '#cfe0ff' },
  ],
};

/** Bright, wrap-around light with almost no falloff — maximum reflection. */
export const BRIGHT_STUDIO: EnvironmentRecipe = {
  top: 1.5,
  horizon: 1.1,
  bottom: 0.6,
  tint: '#ffffff',
  boxes: [
    { u: 0.75, v: 0.14, size: 0.5, intensity: 2.2, color: '#ffffff' },
    { u: 0.5, v: 0.62, size: 0.4, intensity: 1.1, color: '#ffffff' },
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
    const texV = y / (height - 1);
    // Three samples this map as `v = asin(dir.y) / π + 0.5`, so **v = 1 is up
    // and v = 0 is down**. Painting the sky at v = 0 puts it under the object
    // and the floor over it — which is what this did until it was measured
    // against the shader, and it is why a light placed overhead lit from below.
    const height01 = (Math.sin((texV - 0.5) * Math.PI) + 1) / 2;
    const base = height01 > 0.5
      ? recipe.horizon + (recipe.top - recipe.horizon) * ((height01 - 0.5) / 0.5)
      : recipe.bottom + (recipe.horizon - recipe.bottom) * (height01 / 0.5);
    // Horizontal compression towards the poles: an unscaled distance turns a
    // round source into a wide smear near the top of the map.
    const ring = Math.max(0.15, Math.cos((texV - 0.5) * Math.PI));

    for (let x = 0; x < width; x++) {
      const u = x / width;
      let r = base * tint.r;
      let g = base * tint.g;
      let b = base * tint.b;

      for (const box of boxes) {
        // Wrapped in u, because the map joins at the seam and a source near it
        // would otherwise be cut in half.
        let du = Math.abs(u - box.u);
        if (du > 0.5) du = 1 - du;
        du *= ring;
        const dv = Math.abs(texV - (1 - box.v));
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
