/**
 * Semantic color suggestion engine.
 *
 * The goal is to produce success/warning/error/info hues that feel like
 * they belong to the same family as the brand primary — not dropped-in
 * stock greens and reds that make the system look off-the-shelf.
 *
 * Strategy:
 *   1. Anchor to the archetype hue for each semantic role (research-backed
 *      from thousands of design systems: success is green-ish 130-155,
 *      warning is amber 40-50, error is red 8-18, info is blue 215-225).
 *   2. Blend a small amount of the seed's hue toward the anchor so shades
 *      pick up the brand's personality without losing the semantic cue.
 *   3. Preserve the seed's *chroma envelope* — if the brand is muted, the
 *      semantics are muted; if the brand is vivid, so are the semantics.
 */
import { hexToOklch, oklchToHex } from './conversions';
import type { OklchTuple } from './types';

export interface SemanticAnchor {
  /** Archetype hue in degrees, 0..360. */
  hue: number;
  /** Target lightness for the 500 stop. */
  lightness: number;
  /** Minimum chroma floor — don't render mud. */
  minChroma: number;
  /** Maximum chroma ceiling — don't render neon. */
  maxChroma: number;
}

const ANCHORS: Record<'success' | 'warning' | 'error' | 'info', SemanticAnchor> = {
  success: { hue: 145, lightness: 0.6, minChroma: 0.12, maxChroma: 0.18 },
  warning: { hue: 70, lightness: 0.78, minChroma: 0.14, maxChroma: 0.2 },
  error: { hue: 25, lightness: 0.6, minChroma: 0.16, maxChroma: 0.22 },
  info: { hue: 230, lightness: 0.62, minChroma: 0.1, maxChroma: 0.18 },
};

/**
 * Derive a single seed hex for a semantic role given the brand primary.
 *
 * `blendTowardBrand` ∈ [0, 1] — 0 = pure archetype hue, 1 = pure brand hue.
 * Default of 0.18 keeps strong semantic recognition while picking up
 * brand personality.
 */
export function suggestSemanticSeed(
  primaryHex: string,
  role: 'success' | 'warning' | 'error' | 'info',
  blendTowardBrand = 0.18,
): string {
  const brand = hexToOklch(primaryHex);
  const anchor = ANCHORS[role];

  const blendedHue = shortestHueBlend(anchor.hue, brand.h, blendTowardBrand);
  const chroma = Math.min(
    anchor.maxChroma,
    Math.max(anchor.minChroma, brand.c * 0.9),
  );

  const oklch: OklchTuple = {
    l: anchor.lightness,
    c: chroma,
    h: blendedHue,
  };
  return oklchToHex(oklch);
}

export function suggestAllSemanticSeeds(primaryHex: string): {
  success: string;
  warning: string;
  error: string;
  info: string;
} {
  return {
    success: suggestSemanticSeed(primaryHex, 'success'),
    warning: suggestSemanticSeed(primaryHex, 'warning'),
    error: suggestSemanticSeed(primaryHex, 'error'),
    info: suggestSemanticSeed(primaryHex, 'info'),
  };
}

/** Shortest angular interpolation between two hues (deg). */
function shortestHueBlend(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
}
