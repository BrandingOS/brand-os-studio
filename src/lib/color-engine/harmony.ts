/**
 * Color harmony generation.
 *
 * Harmonies are pure hue rotations in OKLCH space around the seed, with
 * chroma/lightness preserved so the resulting seeds belong to the same
 * visual family. Consumers then feed these seeds into `generateShades`
 * to produce full multi-role palettes.
 */
import { hexToOklch, oklchToHex } from './conversions';
import type { HarmonyName, HarmonyResult } from './types';

export const HARMONY_DESCRIPTORS: Record<HarmonyName, string> = {
  monochromatic:
    'Minimal, unified, premium. Works for enterprise, fintech, luxury — a single personality.',
  analogous:
    'Warm, cohesive, editorial. Great for storytelling, lifestyle, content-heavy marketing.',
  complementary:
    'High contrast, vibrant, energetic. Strong for SaaS dashboards, playful products, call-to-action emphasis.',
  'split-complementary':
    'Balanced energy — pop without clash. Solid default for consumer SaaS and modern marketing.',
  triadic:
    'Playful, confident, rich. Suits creative tools, children/education, bold consumer brands.',
  tetradic:
    'Four-way palette for data-rich UIs, dashboards, and multi-category products. Use with care.',
};

export function generateHarmony(seedHex: string, harmony: HarmonyName): HarmonyResult {
  const oklch = hexToOklch(seedHex);
  const rotate = (delta: number) => oklchToHex({ ...oklch, h: (oklch.h + delta + 360) % 360 });

  let seeds: string[];
  switch (harmony) {
    case 'monochromatic':
      // Same hue — return a single seed; consumers build via shades.
      seeds = [oklchToHex(oklch)];
      break;
    case 'analogous':
      seeds = [oklchToHex(oklch), rotate(20), rotate(-20)];
      break;
    case 'complementary':
      seeds = [oklchToHex(oklch), rotate(180)];
      break;
    case 'split-complementary':
      seeds = [oklchToHex(oklch), rotate(150), rotate(210)];
      break;
    case 'triadic':
      seeds = [oklchToHex(oklch), rotate(120), rotate(240)];
      break;
    case 'tetradic':
      seeds = [oklchToHex(oklch), rotate(90), rotate(180), rotate(270)];
      break;
    default:
      seeds = [oklchToHex(oklch)];
  }

  return {
    name: harmony,
    seeds,
    descriptor: HARMONY_DESCRIPTORS[harmony],
  };
}

export const ALL_HARMONIES: readonly HarmonyName[] = [
  'monochromatic',
  'analogous',
  'complementary',
  'split-complementary',
  'triadic',
  'tetradic',
] as const;
