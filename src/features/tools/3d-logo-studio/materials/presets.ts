/**
 * =============================================================================
 * Material registry
 * =============================================================================
 *
 * The PRD's launch target is 24 curated presets. The four the PRD names as the
 * visual benchmarks — clear glass, textured silver, glossy black lacquer and
 * satin black — are the ones tuned first and the ones the render proof reviews;
 * the rest are set to plausible physical values and will be tuned against real
 * renders in Phase 7.
 *
 * Every distance in here — `thickness`, `attenuationDistance` — is in the
 * renderer's normalized space, where the logo is 2 units across. See
 * `MaterialParams.thickness`.
 */

import { BASE_PARAMS, type MaterialParams, type MaterialPreset } from './types';

const preset = (
  id: string,
  name: string,
  family: MaterialPreset['family'],
  params: Partial<MaterialParams>,
  glbFallback?: Partial<MaterialParams>,
): MaterialPreset => ({ id, name, family, params: { ...BASE_PARAMS, ...params }, glbFallback });

/** Transmission has no meaning in a plain glTF PBR material; a viewer without
 *  KHR_materials_transmission shows an opaque white blob. Every glass declares
 *  what it becomes instead. */
const GLASS_GLB: Partial<MaterialParams> = { transmission: 0, opacity: 0.35, roughness: 0.1, metalness: 0 };

export const MATERIAL_PRESETS: MaterialPreset[] = [
  // ---- metals ----------------------------------------------------------
  preset('polished-chrome', 'Polished chrome', 'metal', { color: '#f4f6f8', metalness: 1, roughness: 0.04 }),
  preset('brushed-aluminium', 'Brushed aluminium', 'metal', {
    color: '#d8dadd', metalness: 1, roughness: 0.34, anisotropy: 0.85,
    textureKind: 'brushed', textureStrength: 0.3, textureScale: 7,
  }),
  // Tuned against the owner's reference frames: soft cast aluminium, not a
  // mirror. Higher roughness than a polished metal, fine grain at a high tiling
  // frequency so it reads as the surface of the object rather than as a pattern
  // printed on it.
  preset('textured-silver', 'Textured silver', 'metal', {
    color: '#cfd2d6', metalness: 1, roughness: 0.42,
    textureKind: 'speckle', textureStrength: 0.55, textureScale: 9,
  }),
  preset('gold', 'Gold', 'metal', { color: '#d4a13a', metalness: 1, roughness: 0.18 }),
  preset('copper', 'Copper', 'metal', { color: '#b06a4a', metalness: 1, roughness: 0.22 }),
  preset('titanium', 'Titanium', 'metal', { color: '#8f9196', metalness: 1, roughness: 0.38 }),

  // ---- glass -----------------------------------------------------------
  preset('clear-glass', 'Clear glass', 'glass', {
    color: '#ffffff', metalness: 0, roughness: 0.02, transmission: 1, ior: 1.52,
    thickness: 0.5, clearcoat: 1, clearcoatRoughness: 0.02, dispersion: 2.2,
  }, GLASS_GLB),
  preset('frosted-glass', 'Frosted glass', 'glass', {
    color: '#ffffff', roughness: 0.42, transmission: 1, ior: 1.5, thickness: 0.5,
  }, { ...GLASS_GLB, roughness: 0.45, opacity: 0.5 }),
  preset('smoked-glass', 'Smoked glass', 'glass', {
    color: '#ffffff', roughness: 0.06, transmission: 1, ior: 1.5, thickness: 0.6,
    attenuationColor: '#2a2c31', attenuationDistance: 0.9, dispersion: 1.2,
  }, { ...GLASS_GLB, color: '#4a4d53', opacity: 0.6 }),
  preset('tinted-glass', 'Tinted glass', 'glass', {
    color: '#ffffff', roughness: 0.05, transmission: 1, ior: 1.5, thickness: 0.6,
    attenuationColor: '#2f6f8f', attenuationDistance: 0.8, dispersion: 1.6,
  }, { ...GLASS_GLB, color: '#5f9fbf', opacity: 0.55 }),

  // ---- coatings and synthetics -----------------------------------------
  preset('glossy-black', 'Glossy black lacquer', 'coating', {
    color: '#0b0b0d', metalness: 0, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02,
  }),
  preset('satin-black', 'Satin black', 'coating', {
    color: '#141416', metalness: 0, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.35,
  }),
  preset('glazed-ceramic', 'Glazed ceramic', 'coating', {
    color: '#f2efe8', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08,
  }),
  preset('matte-ceramic', 'Matte ceramic', 'coating', { color: '#ece7dd', roughness: 0.78 }),
  preset('enamel', 'Enamel', 'coating', { color: '#f5f5f2', roughness: 0.16, clearcoat: 0.8 }),
  preset('glossy-plastic', 'Glossy plastic', 'coating', { color: '#ffffff', roughness: 0.15, clearcoat: 0.6 }),
  preset('matte-plastic', 'Matte plastic', 'coating', { color: '#e9e9ea', roughness: 0.62 }),
  preset('rubber', 'Rubber', 'coating', { color: '#1b1b1d', roughness: 0.92 }),

  // ---- natural and textured --------------------------------------------
  preset('clay', 'Clay', 'natural', {
    color: '#c08a6d', roughness: 0.95, textureKind: 'grain', textureStrength: 0.25, textureScale: 4,
  }),
  preset('concrete', 'Concrete', 'natural', {
    color: '#a8a6a1', roughness: 0.88, textureKind: 'speckle', textureStrength: 0.45, textureScale: 5,
  }),
  preset('marble', 'Marble', 'natural', {
    color: '#eeece7', roughness: 0.18, clearcoat: 0.4, textureKind: 'grain', textureStrength: 0.2, textureScale: 2,
  }),
  preset('wood', 'Wood', 'natural', {
    color: '#8a5a34', roughness: 0.55, textureKind: 'grain', textureStrength: 0.4, textureScale: 3,
  }),

  // ---- effects ---------------------------------------------------------
  preset('pearlescent', 'Pearlescent', 'effect', {
    color: '#f3f1ef', metalness: 0.2, roughness: 0.18, iridescence: 1, clearcoat: 1,
  }, { iridescence: 0, color: '#e8e4ea' }),
  preset('emissive', 'Emissive', 'effect', {
    color: '#0d0d10', roughness: 0.5, emissive: '#ff6a2b', emissiveIntensity: 2.4,
  }),
];

export const MATERIALS_BY_ID = new Map(MATERIAL_PRESETS.map((m) => [m.id, m]));

export function getMaterial(id: string): MaterialPreset | undefined {
  return MATERIALS_BY_ID.get(id);
}

/** The four the PRD names as the quality benchmarks. */
export const BENCHMARK_MATERIALS = ['clear-glass', 'textured-silver', 'glossy-black', 'satin-black'] as const;
