// Neutrals normalization — always 6 hex strings, lightest → darkest.
//
// Phase 3 review rejected the original "repeat last entry" pad strategy
// because it produces visually broken brands: a 4-neutral source would
// have slots 4/5/6 identical (the darkest value), so any layer slotted
// to neutral[4] looks the same as neutral[5]. Silent semantic loss.
//
// Replacement: HSL-space linear interpolation. Sources of length 2..5
// are placed at proportional positions on a 0..1 scale; we sample at 6
// evenly-spaced positions and lerp HSL between adjacent stops. The
// result is a monotonic luminance ramp regardless of how many entries
// the source has.

import { hexToHsl, hslToHex } from '@/shared/color/colorEngine';

const TARGET_NEUTRAL_COUNT = 6;

/**
 * Normalize a neutrals source to exactly 6 hex strings, lightest → darkest.
 *
 * Behaviour by input length:
 *   • 0          → throws (caller should fall back to `suggestNeutrals(primary)`)
 *   • 1          → 6 copies (degenerate; caller should generally avoid this)
 *   • 2..5       → linear HSL interpolation between sorted-by-luminance stops
 *   • 6          → returned as-is, sorted by luminance (defensive against
 *                  reverse-ordered input)
 *   • 7+         → even-spacing downsample after sort
 *
 * Output is always sorted lightest → darkest by luminance, matching the
 * v3 ColorSystem.neutrals and Brand Board generator conventions.
 */
export function normalizeNeutrals(source: string[]): string[] {
  if (source.length === 0) {
    throw new Error('normalizeNeutrals: source must have at least 1 entry');
  }
  if (source.length === 1) {
    return Array(TARGET_NEUTRAL_COUNT).fill(source[0]);
  }

  // Sort source by luminance (light → dark) so the output ramp is
  // always monotonic, even if the caller passed entries in arbitrary
  // order. Stable sort over precomputed L values.
  const withL = source.map((hex) => ({ hex, l: hexToHsl(hex).l }));
  withL.sort((a, b) => b.l - a.l);
  const sorted = withL.map((s) => s.hex);

  if (sorted.length === TARGET_NEUTRAL_COUNT) return sorted;

  if (sorted.length > TARGET_NEUTRAL_COUNT) {
    // Even-spacing downsample: pick 6 indices spread across the source.
    const step = (sorted.length - 1) / (TARGET_NEUTRAL_COUNT - 1);
    return Array.from({ length: TARGET_NEUTRAL_COUNT }, (_, i) =>
      sorted[Math.round(i * step)],
    );
  }

  // 2..5 entries: lerp HSL between proportionally-placed stops.
  const stops = sorted.map((hex, i) => ({
    pos: i / (sorted.length - 1),
    hsl: hexToHsl(hex),
  }));

  const result: string[] = [];
  for (let i = 0; i < TARGET_NEUTRAL_COUNT; i++) {
    const t = i / (TARGET_NEUTRAL_COUNT - 1);
    let lo = 0;
    while (lo + 1 < stops.length && stops[lo + 1].pos <= t) lo++;
    const hi = Math.min(lo + 1, stops.length - 1);
    const span = stops[hi].pos - stops[lo].pos;
    const u = span === 0 ? 0 : (t - stops[lo].pos) / span;
    const a = stops[lo].hsl;
    const b = stops[hi].hsl;
    result.push(
      hslToHex(
        Math.round(lerpHue(a.h, b.h, u)),
        Math.round(a.s + (b.s - a.s) * u),
        Math.round(a.l + (b.l - a.l) * u),
      ),
    );
  }
  return result;
}

/**
 * Hue lerp via the shorter arc on the color wheel. Lerping (350, 10)
 * directly walks through orange/yellow; the right answer is the 20°
 * path through 0.
 */
function lerpHue(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
}
