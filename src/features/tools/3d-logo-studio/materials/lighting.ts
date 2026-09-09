/**
 * =============================================================================
 * Lighting presets
 * =============================================================================
 *
 * Data, like the material registry, and deliberately not in `render/`: the
 * properties panel needs to list these, and importing them from the module that
 * owns the WebGL scene dragged the whole of Three.js into the page chunk — 588
 * KB downloaded by anyone who opened the tool, before they had chosen a file.
 *
 * Nothing here imports Three.js, and nothing here may.
 */

export interface LightingPreset {
  id: string;
  name: string;
  background: string;
  /** Separate from `background` on purpose: the PRD requires the reflected
   *  environment to be independent of what the viewer sees behind the object. */
  environmentIntensity: number;
  key: { position: [number, number, number]; intensity: number; color: string };
  fill: { position: [number, number, number]; intensity: number; color: string };
  rim: { position: [number, number, number]; intensity: number; color: string };
  ambient: number;
}

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'white-studio', name: 'White studio', background: '#f2f1ee', environmentIntensity: 1.0,
    key: { position: [4, 6, 6], intensity: 1.1, color: '#ffffff' },
    fill: { position: [-5, 1, 4], intensity: 0.4, color: '#eef1f5' },
    rim: { position: [0, 3, -6], intensity: 0.7, color: '#ffffff' },
    ambient: 0.15,
  },
  {
    id: 'black-studio', name: 'Black studio', background: '#0c0c0e', environmentIntensity: 0.55,
    key: { position: [4, 5, 5], intensity: 2.6, color: '#ffffff' },
    fill: { position: [-5, 0, 3], intensity: 0.35, color: '#9fb4d0' },
    rim: { position: [-1, 2, -6], intensity: 2.4, color: '#ffffff' },
    ambient: 0.08,
  },
  {
    id: 'neutral-studio', name: 'Neutral studio', background: '#8b8b8e', environmentIntensity: 1,
    key: { position: [3, 5, 6], intensity: 1.8, color: '#ffffff' },
    fill: { position: [-4, 1, 4], intensity: 0.9, color: '#ffffff' },
    rim: { position: [0, 2, -5], intensity: 1, color: '#ffffff' },
    ambient: 0.4,
  },
  {
    id: 'soft-product', name: 'Soft product', background: '#e8e6e1', environmentIntensity: 1.15,
    key: { position: [2, 7, 5], intensity: 0.7, color: '#fffaf2' },
    fill: { position: [-4, 2, 5], intensity: 0.35, color: '#f0f4ff' },
    rim: { position: [1, 1, -5], intensity: 0.3, color: '#ffffff' },
    ambient: 0.12,
  },
  {
    id: 'dramatic-rim', name: 'Dramatic rim', background: '#111114', environmentIntensity: 0.4,
    key: { position: [6, 3, 2], intensity: 1.2, color: '#ffd9b0' },
    fill: { position: [-6, -1, 2], intensity: 0.25, color: '#7aa2ff' },
    rim: { position: [-2, 4, -6], intensity: 4, color: '#ffffff' },
    ambient: 0.05,
  },
  {
    id: 'high-contrast', name: 'High contrast reflective', background: '#ffffff', environmentIntensity: 1.6,
    key: { position: [5, 8, 4], intensity: 3, color: '#ffffff' },
    fill: { position: [-6, 0, 2], intensity: 0.2, color: '#ffffff' },
    rim: { position: [0, -3, -6], intensity: 2, color: '#ffffff' },
    ambient: 0.2,
  },
];

/**
 * Where the key light is, and how big and bright.
 *
 * Deliberately expressed as a *position on the surrounding sphere* rather than
 * as a 3D vector, because it has to drive two different things at once: the
 * softbox painted into the environment map, and the directional light the
 * rasterizer shades with. A traced render is lit **only** by the environment —
 * the directional lights do not exist to it — so a control that moved just the
 * light would appear to do nothing the moment the user switched to high
 * quality. Both are derived from these four numbers.
 */
export interface LightSource {
  /** Around the object, 0..1. 0.5 is behind the camera, lighting the front. */
  azimuth: number;
  /** Top to bottom, 0..1. 0 is directly overhead. */
  elevation: number;
  /** Angular size, 0..1. Large is soft and wraps; small is hard and specular. */
  size: number;
  intensity: number;
}

export const DEFAULT_LIGHT_SOURCE: LightSource = {
  azimuth: 0.5,
  elevation: 0.16,
  size: 0.4,
  intensity: 1.5,
};

/**
 * The key light's direction in world space.
 *
 * Shared by the softbox and the directional light so the two cannot disagree
 * about where the light is — which would show as a highlight in one place and a
 * shadow from another.
 */
export function lightDirection(source: LightSource): [number, number, number] {
  // Derived from three's own `equirectUv`, which is the only authority here:
  //   u = atan2(z, x) / 2π + 0.5      so +Z (the camera's side) is u = 0.75
  //   v = asin(y) / π + 0.5           so v = 1 is up
  // The azimuth control is defined with 0.5 facing the camera, so it maps to
  // u = 1.25 - azimuth, and the angle back out is (0.75 - azimuth) · 2π.
  // Elevation is defined with 0 overhead, which is y = +1.
  const theta = (0.75 - source.azimuth) * Math.PI * 2;
  const elevation = Math.max(0, Math.min(1, source.elevation));
  const y = Math.cos(elevation * Math.PI);
  const ring = Math.sin(elevation * Math.PI);
  return [ring * Math.cos(theta), y, ring * Math.sin(theta)];
}
