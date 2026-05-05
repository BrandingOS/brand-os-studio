// Phase 6.5 — Brand asset font analysis.
//
// Walks one or more BrandOSDocument bodies and tallies LITERAL font
// families used across text layers. SlotRefs (brand-kit bindings) are
// deliberately skipped — those ARE the brand kit by construction; the
// goal of brand memory is surfacing fonts the user reaches for OUTSIDE
// the kit, signalling preferences worth suggesting back later.
//
// Pure, dependency-free. Mirrors analyzeBrandColors so future
// memory categories (position, etc.) follow the same ergonomics.

import type { BrandOSDocument, Layer } from '@/features/editor/schema';

export interface BrandFontEntry {
  /** Family name as written. Trimmed; case-preserved (display value). */
  family: string;
  /** How many text-layer appearances. */
  count: number;
}

/**
 * Tally font families across a single document. Returns a Map for
 * cheap merging across docs. Skips SlotRefs (objects with .slotRef)
 * and non-string values.
 */
export function analyzeDocumentFonts(doc: BrandOSDocument): Map<string, number> {
  const out = new Map<string, number>();
  for (const page of doc.pages) {
    walkLayers(page.layers, out);
  }
  return out;
}

function walkLayers(layers: Layer[], counts: Map<string, number>): void {
  for (const layer of layers) {
    switch (layer.kind) {
      case 'text':
        pushFont(counts, layer.fontFamily);
        break;
      case 'group':
        walkLayers(layer.children, counts);
        break;
      // Other layer kinds don't carry a font family.
    }
  }
}

function pushFont(counts: Map<string, number>, value: unknown): void {
  if (typeof value !== 'string') return;
  const family = normalizeFontFamily(value);
  if (!family) return;
  counts.set(family, (counts.get(family) ?? 0) + 1);
}

/**
 * Normalize a font-family string for tallying. Trims whitespace and
 * strips the surrounding quotes that CSS-style font stacks use
 * ('"Helvetica Neue"' → 'Helvetica Neue'). Returns null for empty
 * input. Case is preserved so the display row reads correctly.
 */
export function normalizeFontFamily(input: string): string | null {
  let s = input.trim();
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).trim();
  else if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1).trim();
  return s.length > 0 ? s : null;
}

/**
 * Merge multiple per-doc font maps into a sorted ranked list. Caller
 * computes one map per doc via analyzeDocumentFonts, then passes them
 * here for a brand-wide ranking.
 */
export function rankBrandFonts(
  perDoc: Iterable<Map<string, number>>,
  options: { limit?: number } = {},
): BrandFontEntry[] {
  const merged = new Map<string, number>();
  for (const docCounts of perDoc) {
    for (const [family, n] of docCounts) {
      merged.set(family, (merged.get(family) ?? 0) + n);
    }
  }
  const ranked: BrandFontEntry[] = Array.from(merged, ([family, count]) => ({ family, count }));
  ranked.sort((a, b) => b.count - a.count || a.family.localeCompare(b.family));
  return options.limit !== undefined ? ranked.slice(0, options.limit) : ranked;
}
