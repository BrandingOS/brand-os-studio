import type { FeelPalette } from '../types';
import { generateHarmonies, hexToHsl, hslToHex } from '@/features/brandkit/engine/colorEngine';

// generateHarmonies returns [complementary, analogous, triadic, split-complementary, monochromatic]
const HARMONY_INDEX: Record<string, number> = {
  'complementary':       0,
  'analogous':           1,
  'triadic':             2,
  'split-complementary': 3,
  'monochromatic':       4,
};

const HARMONY_RULES = [
  'complementary',
  'analogous',
  'triadic',
  'split-complementary',
  'monochromatic',
] as const;

type HarmonyRule = typeof HARMONY_RULES[number];

const MOODS = [
  'warm', 'cool', 'vibrant', 'muted', 'pastel', 'earthy', 'bold', 'monochrome',
  'dusk', 'ocean', 'forest', 'sunset', 'meadow', 'desert', 'arctic',
] as const;

function randomHue(): number {
  return Math.floor(Math.random() * 360);
}

function paletteId(): string {
  return `p-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function generateOnePalette(locked = false): FeelPalette {
  const hue = randomHue();
  const rule: HarmonyRule = HARMONY_RULES[Math.floor(Math.random() * HARMONY_RULES.length)];
  const baseHex = hslToHex(hue, 55 + Math.random() * 25, 45 + Math.random() * 15);
  const harmonies = generateHarmonies(baseHex);
  const harmony = harmonies[HARMONY_INDEX[rule]];
  const src = harmony.colors;
  const colors: [string, string, string, string, string] = [
    src[0],
    src[1] ?? src[0],
    src[2] ?? src[0],
    src[3] ?? src[0],
    src[4] ?? src[0],
  ];
  const mood = MOODS[Math.floor(Math.random() * MOODS.length)];
  const name = `${mood[0].toUpperCase()}${mood.slice(1)} ${rule.split('-')[0]}`;
  return { id: paletteId(), name, colors, mood, locked, isCustom: false };
}

export function generateSeedPalettes(): [FeelPalette, FeelPalette, FeelPalette] {
  return [generateOnePalette(), generateOnePalette(), generateOnePalette()];
}

export { hexToHsl, hslToHex };
