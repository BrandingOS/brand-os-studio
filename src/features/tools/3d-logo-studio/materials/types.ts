/**
 * =============================================================================
 * Material model
 * =============================================================================
 *
 * A material is data, never a Three.js object. The registry is a plain map of
 * parameter sets, so adding one is an entry rather than an editor change — the
 * PRD's requirement — and so a saved project can round-trip a material without
 * the renderer being loaded.
 *
 * `MaterialParams` is a superset of what any single family needs. Which knobs
 * the UI shows is decided by `relevantControls`, not by the material carrying a
 * different shape, because a user editing a glass and then switching to a metal
 * should not silently lose the values they set.
 */

export type MaterialFamily = 'metal' | 'glass' | 'coating' | 'natural' | 'effect';

export interface MaterialParams {
  color: string;
  metalness: number;
  roughness: number;
  /** 0 is opaque. Above 0 the surface refracts, which needs an environment. */
  transmission: number;
  ior: number;
  /**
   * Optical path length for transmission, in the *normalized* object space the
   * renderer works in — where `normalizeToUnitSize` has made the logo 2 units
   * across. It is not the geometry's depth and it is not in the SVG's units:
   * carrying a logo-space value here made every glass 3x thicker than the whole
   * object, which attenuates to a flat opaque white and is exactly why the
   * first glass render came out looking like plastic.
   */
  thickness: number;
  /** Colour picked up travelling through the material. */
  attenuationColor: string;
  attenuationDistance: number;
  clearcoat: number;
  clearcoatRoughness: number;
  emissive: string;
  emissiveIntensity: number;
  iridescence: number;
  anisotropy: number;
  /** Micro-relief strength for the brushed and textured presets. 0 is smooth. */
  textureStrength: number;
  textureScale: number;
  textureRotation: number;
  /** Brushed metal is anisotropic along one direction; this is that direction. */
  textureKind: 'none' | 'brushed' | 'speckle' | 'grain';
  opacity: number;
}

export interface MaterialPreset {
  id: string;
  name: string;
  family: MaterialFamily;
  params: MaterialParams;
  /** What this becomes in a GLB, where transmission and iridescence may not
   *  survive. Documented per preset rather than guessed at export time. */
  glbFallback?: Partial<MaterialParams>;
}

export const BASE_PARAMS: MaterialParams = {
  color: '#ffffff',
  metalness: 0,
  roughness: 0.5,
  transmission: 0,
  ior: 1.5,
  thickness: 0,
  attenuationColor: '#ffffff',
  attenuationDistance: Infinity,
  clearcoat: 0,
  clearcoatRoughness: 0.1,
  emissive: '#000000',
  emissiveIntensity: 0,
  iridescence: 0,
  anisotropy: 0,
  textureStrength: 0,
  textureScale: 1,
  textureRotation: 0,
  textureKind: 'none',
  opacity: 1,
};

/** Which controls are worth showing for a given preset. Keeps the panel honest:
 *  transmission on an opaque plastic does nothing and should not be offered. */
export function relevantControls(preset: MaterialPreset): (keyof MaterialParams)[] {
  const base: (keyof MaterialParams)[] = ['color', 'roughness', 'metalness'];
  const p = preset.params;
  if (p.transmission > 0) base.push('transmission', 'ior', 'thickness', 'attenuationColor', 'attenuationDistance');
  if (p.clearcoat > 0) base.push('clearcoat', 'clearcoatRoughness');
  if (p.emissiveIntensity > 0) base.push('emissive', 'emissiveIntensity');
  if (p.iridescence > 0) base.push('iridescence');
  if (p.anisotropy > 0) base.push('anisotropy');
  if (p.textureKind !== 'none') base.push('textureStrength', 'textureScale', 'textureRotation');
  if (p.opacity < 1) base.push('opacity');
  return base;
}
