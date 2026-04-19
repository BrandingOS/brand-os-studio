import { FONT_PAIRINGS } from './fontPairings';
import { UI_PRESETS } from './uiPresets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  neutrals: string[];
}

// ---------------------------------------------------------------------------
// Module-level cycling counters
// ---------------------------------------------------------------------------

let colorStrategyCounter = 0;
let fontPairingCounter = 0;
let uiPresetCounter = 0;

// ---------------------------------------------------------------------------
// HSL ↔ Hex helpers
// ---------------------------------------------------------------------------

function hexToHSL(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '');
  const r = parseInt(sanitized.substring(0, 2), 16) / 255;
  const g = parseInt(sanitized.substring(2, 4), 16) / 255;
  const b = parseInt(sanitized.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (hue < 60) { r = c; g = x; }
  else if (hue < 120) { r = x; g = c; }
  else if (hue < 180) { g = c; b = x; }
  else if (hue < 240) { g = x; b = c; }
  else if (hue < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = (v: number) => {
    const hex = Math.round((v + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ---------------------------------------------------------------------------
// Neutral generation
// ---------------------------------------------------------------------------

export function generateNeutrals(hue: number): string[] {
  const saturation = 0.06;
  const steps = [0.97, 0.92, 0.82, 0.62, 0.42, 0.18];
  return steps.map((l) => hslToHex(hue, saturation, l));
}

// ---------------------------------------------------------------------------
// Color shuffle strategies
// ---------------------------------------------------------------------------

function complementary(h: number, s: number, l: number): ColorScheme {
  const primary = hslToHex(h, s, l);
  const secondary = hslToHex(h + 180, s * 0.8, Math.min(l + 0.1, 0.85));
  const accent = hslToHex(h + 180, Math.min(s + 0.1, 1), l);
  return { primary, secondary, accent, neutrals: generateNeutrals(h) };
}

function analogous(h: number, s: number, l: number): ColorScheme {
  const primary = hslToHex(h, s, l);
  const secondary = hslToHex(h + 30, s * 0.9, Math.min(l + 0.08, 0.85));
  const accent = hslToHex(h - 30, Math.min(s + 0.1, 1), l);
  return { primary, secondary, accent, neutrals: generateNeutrals(h) };
}

function triadic(h: number, s: number, l: number): ColorScheme {
  const primary = hslToHex(h, s, l);
  const secondary = hslToHex(h + 120, s * 0.85, Math.min(l + 0.05, 0.85));
  const accent = hslToHex(h + 240, Math.min(s + 0.05, 1), l);
  return { primary, secondary, accent, neutrals: generateNeutrals(h) };
}

function splitComplementary(h: number, s: number, l: number): ColorScheme {
  const primary = hslToHex(h, s, l);
  const secondary = hslToHex(h + 150, s * 0.85, Math.min(l + 0.08, 0.85));
  const accent = hslToHex(h + 210, Math.min(s + 0.05, 1), l);
  return { primary, secondary, accent, neutrals: generateNeutrals(h) };
}

async function curatedPalette(h: number): Promise<ColorScheme | null> {
  try {
    const { default: palettes } = await import(
      '@/features/logo-presentation/data/palettes'
    ) as any;

    // The module may export the array as `CURATED_PALETTES` or as default
    const list: any[] = Array.isArray(palettes)
      ? palettes
      : palettes.CURATED_PALETTES ?? Object.values(palettes).find(Array.isArray) ?? [];

    if (list.length === 0) return null;

    const palette = list[Math.floor(Math.random() * list.length)];
    const colors: string[] = palette.colors ?? [];
    if (colors.length < 3) return null;

    return {
      primary: colors[0],
      secondary: colors[1],
      accent: colors[2],
      neutrals: generateNeutrals(h),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const STRATEGY_COUNT = 5;

/**
 * Pick a fresh primary seed that isn't the same hue the user is already
 * looking at. We randomize the hue by at least ~30° and keep saturation
 * + lightness in an aesthetically safe band so the result never looks
 * washed out or neon.
 */
function pickFreshPrimary(currentPrimary: string): [number, number, number] {
  const [currentH] = hexToHSL(currentPrimary);
  // Random hue at least 30° off the current one, jittered up to +300°.
  const delta = 30 + Math.random() * 300;
  const h = (currentH + delta) % 360;
  const s = 0.55 + Math.random() * 0.3; // 0.55–0.85
  const l = 0.42 + Math.random() * 0.18; // 0.42–0.60
  return [h, s, l];
}

export function shuffleColorScheme(
  currentPrimary: string,
  strategy?: number,
): ColorScheme {
  const idx = strategy ?? colorStrategyCounter;
  colorStrategyCounter = (colorStrategyCounter + 1) % STRATEGY_COUNT;

  // Rotate the PRIMARY — not just derive harmonies from the existing one.
  // Anchoring on `currentPrimary` made Shuffle feel broken because the
  // main color never changed; only secondary/accent rotated around it.
  const [h, s, l] = pickFreshPrimary(currentPrimary);

  switch (idx % STRATEGY_COUNT) {
    case 0:
      return complementary(h, s, l);
    case 1:
      return analogous(h, s, l);
    case 2:
      return triadic(h, s, l);
    case 3:
      return splitComplementary(h, s, l);
    case 4: {
      // Synchronous fallback — try curated palette lazily, but return
      // triadic as a deterministic fallback (curated import is async).
      // The store can optionally await the async variant below.
      return triadic(h, s, l);
    }
    default:
      return complementary(h, s, l);
  }
}

/**
 * Async variant that actually loads a curated palette for strategy 4.
 */
export async function shuffleColorSchemeAsync(
  currentPrimary: string,
  strategy?: number,
): Promise<ColorScheme> {
  const idx = strategy ?? colorStrategyCounter;
  colorStrategyCounter = (colorStrategyCounter + 1) % STRATEGY_COUNT;

  const [h, s, l] = pickFreshPrimary(currentPrimary);

  if ((idx % STRATEGY_COUNT) === 4) {
    const result = await curatedPalette(h);
    if (result) return result;
    return triadic(h, s, l);
  }

  return shuffleColorScheme(currentPrimary, idx);
}

export function shuffleFontPairing(): { heading: string; body: string; style: string } {
  const pairing = FONT_PAIRINGS[fontPairingCounter % FONT_PAIRINGS.length];
  fontPairingCounter = (fontPairingCounter + 1) % FONT_PAIRINGS.length;
  return { heading: pairing.heading, body: pairing.body, style: pairing.style };
}

export function shuffleUIStyle(): {
  borderRadius: number;
  shadowIntensity: string;
  spacing: string;
} {
  const preset = UI_PRESETS[uiPresetCounter % UI_PRESETS.length];
  uiPresetCounter = (uiPresetCounter + 1) % UI_PRESETS.length;
  return {
    borderRadius: preset.borderRadius,
    shadowIntensity: preset.shadowIntensity,
    spacing: preset.spacing,
  };
}

export function shuffleEverything(currentPrimary: string) {
  const colors = shuffleColorScheme(currentPrimary);
  const typography = shuffleFontPairing();
  const uiStyle = shuffleUIStyle();
  return { colors, typography, uiStyle };
}
