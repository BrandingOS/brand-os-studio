/**
 * Perceptually balanced 11-stop shade generation in OKLCH space.
 *
 * Why OKLCH and not HSL?
 * HSL interpolation produces muddy darks and washed-out lights because
 * its "L" is a rough mid-channel average, not perceptual lightness. OKLCH
 * gives us a lightness axis that matches human perception — so a 100
 * really looks 2× lighter than a 500, and a 900 really looks dark without
 * turning gray.
 *
 * Curves:
 *   - Lightness curve matches Radix/Tailwind 3.4 ramps: even spacing with
 *     soft shoulders at the extremes.
 *   - Chroma curve is reduced at the extremes. 50 and 950 pull toward the
 *     neutral axis — highly-saturated darks and lights are visually noisy
 *     and unusable as UI surfaces.
 *   - Hue is preserved from the seed; no hue shift per stop (that's a
 *     stylistic choice — we ship this behavior stable, adjustable
 *     per-shade via the drawer).
 *
 * Locking:
 *   When `lockedShade` is provided, the generated stop exactly equals the
 *   seed color, and the rest of the scale bends around it. This is how a
 *   designer says "my brand red is the 600 — now build the scale from
 *   there." Internally we scale the curves so the chosen stop lands on
 *   the seed's OKLCH values.
 */
import { hexToOklch, normalizeHex, oklchToHex } from './conversions';
import {
  SHADE_STOPS,
  type ColorScale,
  type OklchTuple,
  type ShadeMap,
  type ShadeStop,
  type ShadeValue,
} from './types';
import { hexToHsl, hexToRgb } from './conversions';

/**
 * Target lightness for each shade on a 0..1 scale.
 *
 * Tuned against:
 *   - Tailwind 3.4 ramps (slate, sky, orange) to match designer muscle memory
 *   - Radix scales for 9/11/12 stops
 *   - APCA readability tests at both ends
 */
const LIGHTNESS_CURVE: Record<ShadeStop, number> = {
  50: 0.975,
  100: 0.945,
  200: 0.895,
  300: 0.825,
  400: 0.72,
  500: 0.605,
  600: 0.52,
  700: 0.44,
  800: 0.36,
  900: 0.275,
  950: 0.19,
};

/**
 * Chroma multiplier applied to the seed's chroma at each stop.
 * 1.0 = keep seed chroma, <1 = desaturate, >1 never (would go out of gamut).
 */
const CHROMA_MULT: Record<ShadeStop, number> = {
  50: 0.22,
  100: 0.38,
  200: 0.62,
  300: 0.85,
  400: 0.98,
  500: 1.0,
  600: 0.98,
  700: 0.9,
  800: 0.78,
  900: 0.62,
  950: 0.45,
};

export interface GenerateShadesOptions {
  /** If set, the generated stop exactly equals the seed color. */
  lockedShade?: ShadeStop | null;
  /**
   * Per-stop overrides — used by the "generation mode" preset and the
   * shade-drawer edit flow. An override's hex is kept verbatim and marked
   * `edited: true`.
   */
  overrides?: Partial<Record<ShadeStop, { hex: string; locked?: boolean }>>;
}

/**
 * Build an 11-stop scale from a seed hex.
 *
 * - `inputHex` is normalized (lowercased 6-digit form).
 * - Stops are produced from curves, optionally re-centered on a locked stop.
 * - Overrides win over the generated values.
 */
export function generateShades(seedHex: string, options: GenerateShadesOptions = {}): ColorScale {
  const { lockedShade = null, overrides = {} } = options;

  const inputHex = normalizeHex(seedHex);
  const seedOklch = hexToOklch(inputHex);

  const targetChroma = seedOklch.c;
  const hue = seedOklch.h;

  // Curve calibration: if the user wants the seed to land on a specific
  // stop, compute a chroma scale and lightness offset so that stop hits
  // the seed exactly. We keep the curve shape — we just shift+scale.
  let chromaScale = 1;
  let lightnessOffset = 0;
  if (lockedShade != null) {
    const targetL = LIGHTNESS_CURVE[lockedShade];
    const targetCMult = CHROMA_MULT[lockedShade];
    lightnessOffset = seedOklch.l - targetL;
    chromaScale = targetCMult > 0 ? targetChroma / (targetChroma * targetCMult) : 1;
  }

  const shades: Partial<ShadeMap> = {};

  for (const stop of SHADE_STOPS) {
    const override = overrides[stop];
    if (override) {
      shades[stop] = buildValue(override.hex, { edited: true, locked: !!override.locked });
      continue;
    }

    if (lockedShade === stop) {
      shades[stop] = buildValue(inputHex, { edited: false, locked: true });
      continue;
    }

    const l = clamp01(LIGHTNESS_CURVE[stop] + lightnessOffset);
    const c = Math.max(0, targetChroma * CHROMA_MULT[stop] * chromaScale);
    const oklch: OklchTuple = { l, c, h: hue };
    const hex = oklchToHex(oklch);
    shades[stop] = buildValue(hex, { edited: false, locked: false });
  }

  return {
    inputHex,
    shades: shades as ShadeMap,
  };
}

function buildValue(
  hex: string,
  flags: { edited: boolean; locked: boolean },
): ShadeValue {
  const normalized = normalizeHex(hex);
  return {
    hex: normalized,
    hsl: hexToHsl(normalized),
    rgb: hexToRgb(normalized),
    oklch: hexToOklch(normalized),
    edited: flags.edited,
    locked: flags.locked,
  };
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
