import type { FeelPalette } from '../types';

const SEEDS: Omit<FeelPalette, 'locked' | 'isCustom'>[] = [
  { id: 'p-mono', name: 'Monolith', vibe: 'Quiet · Editorial', colors: ['#0e0e0e', '#2a2a2a', '#6b6963', '#d6d4cc', '#f5f4ef'] },
  { id: 'p-amber', name: 'Amber Hour', vibe: 'Warm · Cinematic', colors: ['#1b1109', '#6b3a1d', '#c38247', '#efc992', '#fbf2e1'] },
  { id: 'p-crater', name: 'Crater', vibe: 'Lunar · Brutalist', colors: ['#0c0d10', '#262a33', '#60646c', '#a7acb4', '#e5e5ea'] },
  { id: 'p-spectrum', name: 'Spectrum', vibe: 'Digital · Postmodern', colors: ['#111113', '#4b2dce', '#f24e1e', '#f6d44a', '#eaeaea'] },
  { id: 'p-soan', name: 'Soan', vibe: 'Organic · Sun', colors: ['#2a2116', '#7d5a33', '#c88a4d', '#e9cca1', '#f4ecd8'] },
  { id: 'p-nuworld', name: 'Nu World', vibe: 'Future · Calm', colors: ['#0b1220', '#1d3557', '#3d6ea5', '#a8c5e0', '#f1f5fb'] },
];

export function initialPalettes(): FeelPalette[] {
  return SEEDS.map((p) => ({ ...p, locked: false, isCustom: false }));
}
