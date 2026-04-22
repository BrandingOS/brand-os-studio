/**
 * Role suggestion engine.
 *
 * Given a primary scale (and optionally secondary, tertiary), compute
 * a neutral scale that sits *next* to the brand (not pure gray), and
 * a full `SemanticTokens` map for light and dark themes.
 *
 * Key ideas:
 *   - Neutrals aren't pure gray. They're tinted slightly toward the brand
 *     hue so surfaces feel cohesive. This is what you see in premium
 *     design systems (Linear, Stripe, GitHub Primer).
 *   - `onPrimary` is picked per palette, not hard-coded to white. For
 *     bright-yellow primaries white-on-yellow fails; we pick the text
 *     shade with the best APCA against the primary's 600.
 *   - Surface/canvas hierarchy uses neutral 50/100/200 in light mode and
 *     neutral 900/950/850 in dark mode.
 */
import { generateShades } from './generateShades';
import { hexToOklch, oklchToHex } from './conversions';
import { apcaContrast } from './contrast';
import type {
  ColorScale,
  GenerationMode,
  RolePaletteMap,
  SemanticTokens,
} from './types';

export type Theme = 'light' | 'dark';

/**
 * Produce a neutral scale that inherits a touch of the primary's hue.
 * The resulting ramp reads as "warm gray" or "cool gray" depending on
 * the brand.
 */
export function suggestNeutralScale(primaryHex: string, mode: GenerationMode = 'auto'): ColorScale {
  const primary = hexToOklch(primaryHex);
  // Neutral chroma: 0.015 keeps the tint subtle; enterprise modes go lower.
  const chroma = mode === 'neutral-enterprise' ? 0.005 : 0.018;
  const neutralSeed = oklchToHex({ l: 0.6, c: chroma, h: primary.h });
  return generateShades(neutralSeed);
}

/**
 * Pick the best-contrast "on-[role]" foreground from a scale. APCA-based;
 * we compare the role's 500/600 against the scale's 50 (near-white) and
 * 950 (near-black) and pick the winner.
 */
export function pickOnColor(roleScale: ColorScale): string {
  const roleBg = roleScale.shades[600].hex;
  const light = roleScale.shades[50].hex;
  const dark = roleScale.shades[950].hex;
  const lightLc = Math.abs(apcaContrast(light, roleBg));
  const darkLc = Math.abs(apcaContrast(dark, roleBg));
  return lightLc >= darkLc ? light : dark;
}

/**
 * Generate the full semantic-tokens map for a theme.
 *
 * Dark-mode note: we don't just invert — surfaces are anchored to
 * neutral 900/950 (not black) to preserve the brand's coolness/warmth.
 */
export function generateSemanticTokens(roles: RolePaletteMap, theme: Theme = 'light'): SemanticTokens {
  const { primary, neutral } = roles;
  const isLight = theme === 'light';

  const canvas = isLight ? neutral.shades[50].hex : neutral.shades[950].hex;
  const surface = isLight ? '#ffffff' : neutral.shades[900].hex;
  const surfaceElevated = isLight ? neutral.shades[50].hex : neutral.shades[800].hex;
  const border = isLight ? neutral.shades[200].hex : neutral.shades[800].hex;
  const divider = isLight ? neutral.shades[100].hex : neutral.shades[800].hex;

  const textPrimary = isLight ? neutral.shades[900].hex : neutral.shades[50].hex;
  const textSecondary = isLight ? neutral.shades[700].hex : neutral.shades[300].hex;
  const textMuted = isLight ? neutral.shades[500].hex : neutral.shades[400].hex;
  const textInverse = isLight ? '#ffffff' : neutral.shades[950].hex;

  const onPrimary = pickOnColor(primary);
  const onSecondary = roles.secondary ? pickOnColor(roles.secondary) : onPrimary;
  const onTertiary = roles.tertiary ? pickOnColor(roles.tertiary) : onPrimary;
  const onSuccess = roles.success ? pickOnColor(roles.success) : '#ffffff';
  const onWarning = roles.warning ? pickOnColor(roles.warning) : '#1a1a1a';
  const onError = roles.error ? pickOnColor(roles.error) : '#ffffff';

  const buttonPrimaryBg = isLight ? primary.shades[600].hex : primary.shades[500].hex;
  const buttonPrimaryHover = isLight ? primary.shades[700].hex : primary.shades[400].hex;
  const buttonSecondaryBg = isLight ? neutral.shades[100].hex : neutral.shades[800].hex;
  const buttonSecondaryFg = isLight ? neutral.shades[900].hex : neutral.shades[50].hex;

  const inputBorder = isLight ? neutral.shades[300].hex : neutral.shades[700].hex;
  const inputFocus = primary.shades[500].hex;

  const focusRing = primary.shades[isLight ? 500 : 400].hex;
  const selection = primary.shades[isLight ? 200 : 700].hex;

  // Chart palette: cycle primary, secondary/tertiary (if present), plus
  // triadic rotations of primary. Deduplicated downstream by validation.
  const chartColors = buildChartRamp(roles);

  return {
    canvas,
    surface,
    surfaceElevated,
    border,
    divider,
    textPrimary,
    textSecondary,
    textMuted,
    textInverse,
    onPrimary,
    onSecondary,
    onTertiary,
    onSuccess,
    onWarning,
    onError,
    focusRing,
    selection,
    buttonPrimaryBg,
    buttonPrimaryFg: onPrimary,
    buttonPrimaryHover,
    buttonSecondaryBg,
    buttonSecondaryFg,
    inputBorder,
    inputFocus,
    chart1: chartColors[0],
    chart2: chartColors[1],
    chart3: chartColors[2],
    chart4: chartColors[3],
    chart5: chartColors[4],
    chart6: chartColors[5],
  };
}

export function buildChartRamp(roles: RolePaletteMap): string[] {
  const primary = hexToOklch(roles.primary.shades[500].hex);
  const rotate = (delta: number) =>
    oklchToHex({ l: primary.l, c: primary.c, h: (primary.h + delta + 360) % 360 });

  const ramp = [
    roles.primary.shades[500].hex,
    roles.secondary ? roles.secondary.shades[500].hex : rotate(40),
    roles.tertiary ? roles.tertiary.shades[500].hex : rotate(80),
    rotate(140),
    rotate(220),
    rotate(300),
  ];
  return ramp;
}
