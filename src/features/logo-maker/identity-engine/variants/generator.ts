// Derives the full 16-variant map from a primary LogoDocument + brand context.
// Pure — no side effects, no network.

import type { LogoDocument, VariantId, ColorSystem } from '../types';
import {
  dropSmallDetails,
  invertPalette,
  isolateGroup,
  monochrome,
  monogramFromBrandName,
  withBackground,
  withOpacity,
} from './transforms';

export interface VariantGeneratorInput {
  primary: LogoDocument;
  colors: ColorSystem;
  brandName: string;
}

function wrap(svg: string, primary: LogoDocument): LogoDocument {
  return {
    svg,
    groups: primary.groups,
    bounds: primary.bounds,
  };
}

/**
 * Builds every derived variant. The `primary` slot is just a copy of the
 * input — included so callers can iterate `VARIANT_ORDER` uniformly.
 *
 * Failures in individual transforms fall back to the primary SVG. We never
 * throw — a broken variant is better than a broken screen.
 */
export function generateAllVariants(
  input: VariantGeneratorInput,
): Record<VariantId, LogoDocument> {
  const { primary, colors, brandName } = input;

  const safe = (op: () => string): string => {
    try {
      return op();
    } catch {
      return primary.svg;
    }
  };

  const out: Record<VariantId, LogoDocument> = {
    primary,
    horizontal: wrap(safe(() => primary.svg), primary), // layout reflow needs tagged groups — Phase 12
    stacked: wrap(safe(() => primary.svg), primary), // same
    icon_only: wrap(
      safe(() => (primary.groups.symbol ? isolateGroup(primary.svg, primary.groups.symbol.name) : primary.svg)),
      primary,
    ),
    wordmark_only: wrap(
      safe(() => (primary.groups.wordmark ? isolateGroup(primary.svg, primary.groups.wordmark.name) : primary.svg)),
      primary,
    ),
    monogram: wrap(safe(() => monogramFromBrandName(primary.svg, brandName, colors.primary)), primary),
    mono_black: wrap(safe(() => monochrome(primary.svg, '#111111')), primary),
    mono_white: wrap(safe(() => monochrome(primary.svg, '#FFFFFF')), primary),
    inverse: wrap(safe(() => invertPalette(primary.svg)), primary),
    dark_bg: wrap(safe(() => withBackground(primary.svg, colors.neutrals.darkest)), primary),
    light_bg: wrap(safe(() => withBackground(primary.svg, colors.neutrals.lightest)), primary),
    transparent: wrap(safe(() => primary.svg), primary),
    favicon: wrap(safe(() => dropSmallDetails(primary.svg, 32, 2)), primary),
    social_avatar: wrap(safe(() => withBackground(primary.svg, colors.primary)), primary),
    watermark: wrap(safe(() => withOpacity(monochrome(primary.svg, '#111111'), 0.25)), primary),
    print_safe: wrap(safe(() => monochrome(primary.svg, '#000000')), primary),
  };

  return out;
}
