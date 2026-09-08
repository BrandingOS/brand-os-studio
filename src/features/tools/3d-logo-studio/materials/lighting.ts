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
    id: 'white-studio', name: 'White studio', background: '#f2f1ee', environmentIntensity: 1.1,
    key: { position: [4, 6, 6], intensity: 2.2, color: '#ffffff' },
    fill: { position: [-5, 1, 4], intensity: 0.8, color: '#eef1f5' },
    rim: { position: [0, 3, -6], intensity: 1.4, color: '#ffffff' },
    ambient: 0.35,
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
    id: 'soft-product', name: 'Soft product', background: '#e8e6e1', environmentIntensity: 1.3,
    key: { position: [2, 7, 5], intensity: 1.5, color: '#fffaf2' },
    fill: { position: [-4, 2, 5], intensity: 1.1, color: '#f0f4ff' },
    rim: { position: [1, 1, -5], intensity: 0.6, color: '#ffffff' },
    ambient: 0.55,
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
