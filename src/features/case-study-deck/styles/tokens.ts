/**
 * Style → token resolvers.
 *
 * Helpers that turn a `DeckStyle` + `BrandProfile` into the concrete
 * values an archetype renderer needs (background hex, text color, font
 * stacks, sizes, chrome shape). Keeps the slide files free of branching
 * logic and means a new template only needs to touch this module + the
 * presets.
 */

import type { BrandProfile } from '../types';
import { inkOn, shiftLightness } from '../utils';
import type { DeckStyle } from './types';
import { fontStackFor } from './presets';

/** What the slide is painted on. */
export interface SurfaceTokens {
  /** Slide background fill (hex or gradient css). */
  bg: string;
  /** Body / heading ink color guaranteed-readable on bg. */
  ink: string;
  /** Accent role color (brand primary by default). */
  accent: string;
  /** Subtle tint for cards, divider rules, marginalia. */
  subtle: string;
  /** Quiet text color (for muted captions). */
  muted: string;
  /** Border color for frames. */
  border: string;
  /** Inverted surface bg (the opposite of bg) — for inset blocks. */
  invertedBg: string;
  /** Ink color readable on invertedBg. */
  invertedInk: string;
}

export function resolveSurface(style: DeckStyle, profile: BrandProfile): SurfaceTokens {
  const primary = profile.palette.primary;
  const paper = profile.palette.paper;
  const ink = profile.palette.ink;

  let bg: string;
  switch (style.color.bgRole) {
    case 'brand':
      bg = primary;
      break;
    case 'ink':
      bg = '#0A0A0A';
      break;
    case 'tinted-paper':
      bg = shiftLightness(paper, -0.04 + style.color.tint);
      break;
    case 'tinted-ink':
      bg = shiftLightness('#0A0A0A', 0.04 + style.color.tint);
      break;
    case 'paper':
    default:
      bg = paper;
  }

  const fg = inkOn(bg);
  const subtleBg = shiftLightness(bg, fg === '#FFFFFF' ? 0.06 : -0.06);
  const invertedBg = bg === paper ? '#0A0A0A' : paper;
  const invertedInk = inkOn(invertedBg);

  return {
    bg,
    ink: fg,
    accent: primary,
    subtle: subtleBg,
    muted: shiftLightness(fg, fg === '#FFFFFF' ? -0.35 : 0.35),
    border: shiftLightness(fg, fg === '#FFFFFF' ? -0.6 : 0.7),
    invertedBg,
    invertedInk,
  };
}

/** Background CSS for the slide frame (handles gradient/grid/pattern effects). */
export function resolveBackground(style: DeckStyle, surface: SurfaceTokens): string {
  switch (style.effect.background) {
    case 'gradient':
      return `radial-gradient(circle at 30% 30%, ${shiftLightness(surface.bg, 0.06)} 0%, ${surface.bg} 65%)`;
    case 'grid': {
      const lineColor = surface.ink === '#FFFFFF' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      return `linear-gradient(to right, ${lineColor} 1px, transparent 1px) 0 0 / 80px 80px, linear-gradient(to bottom, ${lineColor} 1px, transparent 1px) 0 0 / 80px 80px, ${surface.bg}`;
    }
    case 'noise':
    case 'pattern':
    case 'flat':
    default:
      return surface.bg;
  }
}

/** Font-family stacks ready to drop into CSS. */
export function resolveFonts(style: DeckStyle, profile: BrandProfile) {
  return {
    heading: fontStackFor(style.typography.headingFamily, profile.typography.headingFamily),
    body: fontStackFor(style.typography.bodyFamily, profile.typography.bodyFamily),
  };
}

/** Heading size from a base + scale multiplier. */
export function headingSize(style: DeckStyle, base: number): number {
  return Math.round(base * style.typography.headingScale);
}
export function bodySize(style: DeckStyle, base: number): number {
  return Math.round(base * style.typography.bodyScale);
}

/**
 * Auto-shrink an oversized headline so long brand taglines don't run
 * off the canvas. Returns a font size that scales with the inverse of
 * the visual character density.
 *
 * Tuned for the 1920×1080 canvas with ~80–120px edge padding.
 */
export function fitHeadingSize(style: DeckStyle, baseSize: number, text: string, maxChars = 24): number {
  const len = (text ?? '').length;
  const factor = len <= maxChars ? 1 : Math.max(0.45, maxChars / len);
  return Math.round(baseSize * style.typography.headingScale * factor);
}

/**
 * How much vertical room the chrome reserves at the TOP of the slide.
 * Body paddings should use this so they automatically clear taller
 * chrome variants instead of hand-tuning a `paddingTop: 170` literal
 * that's wrong for a 3-line tabular meta block.
 */
export function chromeTopPad(style: DeckStyle): number {
  switch (style.chrome.topBar) {
    case 'tabular':
      return 200; // 3-line meta + rule + breathing room
    case 'numbered':
      return 140; // single-bar w/ underline
    case 'minimal':
      return 170; // eyebrow + small logo
    case 'none':
      return 110;
  }
  return 170;
}

/** Mirrors `chromeTopPad` for the bottom band. */
export function chromeBottomPad(style: DeckStyle): number {
  switch (style.chrome.bottomBar) {
    case 'meta':
    case 'tagline':
      return 130;
    case 'page-num':
      return 120;
    case 'none':
      return 90;
  }
  return 110;
}
