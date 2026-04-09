/**
 * decompose — split a SourceLogo into its compositional parts.
 *
 * For SVG sources we attempt structural detection (groups named
 * `icon` / `mark` / `wordmark`, or text elements separated from path
 * elements). For raster sources we treat the whole image as an opaque
 * mark and rely on the wordmark text being supplied separately by
 * the brand.
 *
 * This module is intentionally conservative — it never invents pixel
 * data. If decomposition fails, the source is treated as a unitary
 * mark and the wordmark must come from the brand context.
 */
import type { Bbox, SourceLogo } from './types';

export interface DecomposeResult {
  hasIcon: boolean;
  hasWordmark: boolean;
  iconBbox?: Bbox;
  wordmarkText?: string;
  /** True if we used structural cues; false if it was a guess. */
  structural: boolean;
}

const ID_HINTS = /(icon|mark|symbol|logo-icon|brand-icon)/i;
const WORD_HINTS = /(wordmark|word-mark|text|name|brand-name)/i;

export function decompose(source: SourceLogo): DecomposeResult {
  // Already structured? Good — trust it.
  if (source.icon && source.wordmark) {
    return {
      hasIcon: true,
      hasWordmark: true,
      iconBbox: source.icon.bbox,
      wordmarkText: source.wordmark.text,
      structural: true,
    };
  }
  if (source.icon && !source.wordmark) {
    return {
      hasIcon: true,
      hasWordmark: false,
      iconBbox: source.icon.bbox,
      structural: true,
    };
  }

  const svg = source.original.svg;
  if (!svg) {
    // Raster — treat as opaque mark.
    return { hasIcon: true, hasWordmark: false, structural: false };
  }

  // SVG heuristic: look for any element id matching ICON or WORDMARK hints.
  const iconMatch = svg.match(/id="([^"]*)"/g) ?? [];
  const hasIconId = iconMatch.some((m) => ID_HINTS.test(m));
  const hasWordmarkId = iconMatch.some((m) => WORD_HINTS.test(m));
  const hasTextElement = /<text[\s>]/i.test(svg);

  return {
    hasIcon: hasIconId || !hasWordmarkId, // default true: most marks have a glyph
    hasWordmark: hasWordmarkId || hasTextElement,
    structural: hasIconId || hasWordmarkId || hasTextElement,
  };
}
