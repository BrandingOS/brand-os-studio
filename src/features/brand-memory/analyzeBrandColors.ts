// Phase 6.1 — Brand asset color analysis.
//
// Walks one or more BrandOSDocument bodies and tallies the LITERAL hex
// colors the user has applied across layers. SlotRefs (brand-kit
// bindings) are deliberately skipped — those ARE the brand kit by
// construction; the goal of brand memory is surfacing colors the user
// reaches for OUTSIDE the kit, which signal preferences worth
// suggesting back later.
//
// Pure, dependency-free. Caller decides where the docs come from
// (IDesignStorage.listDesigns + load each, or in-memory snapshots).

import type { BrandOSDocument, Layer } from '@/features/editor/schema';

export interface BrandColorEntry {
  /** Lowercase hex (with leading #). Normalized so duplicates merge. */
  hex: string;
  /** How many layer-level appearances. */
  count: number;
}

/**
 * Tally hex colors across a single document. Returns a Map for cheap
 * merging across docs. Source of colors:
 *   • text.color
 *   • shape.fill
 *   • page.background
 *
 * Skips SlotRefs (objects with .slotRef). Skips non-string fields
 * (numbers, undefineds). Skips already-extracted layer fills that
 * resolved to non-hex values (e.g. 'transparent', 'inherit').
 */
export function analyzeDocumentColors(doc: BrandOSDocument): Map<string, number> {
  const out = new Map<string, number>();

  for (const page of doc.pages) {
    pushColor(out, page.background);
    walkLayers(page.layers, out);
  }

  return out;
}

function walkLayers(layers: Layer[], counts: Map<string, number>): void {
  for (const layer of layers) {
    switch (layer.kind) {
      case 'text':
        pushColor(counts, layer.color);
        break;
      case 'shape':
        pushColor(counts, layer.fill);
        break;
      case 'group':
        // Recursive group walk so nested compositions count too.
        walkLayers(layer.children, counts);
        break;
      // image / svg / logo don't carry a single literal color we can
      // tally (image is raster, logo is brand-bound). Skip.
    }
  }
}

function pushColor(counts: Map<string, number>, value: unknown): void {
  if (typeof value !== 'string') return;
  const hex = normalizeHex(value);
  if (!hex) return;
  counts.set(hex, (counts.get(hex) ?? 0) + 1);
}

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Normalize a string to a lowercase 6-digit hex (#rrggbb). Returns null
 * for non-hex inputs ('transparent', '', 'red'), 3-digit shorthand is
 * expanded so #fff and #ffffff merge into the same bucket. Alpha is
 * stripped — color preference is about hue/value, not opacity.
 */
export function normalizeHex(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!HEX_PATTERN.test(trimmed)) return null;
  let body = trimmed.slice(1);
  if (body.length === 3) {
    body = body.split('').map((c) => c + c).join('');
  } else if (body.length === 4) {
    // #rgba — drop alpha, expand the rgb.
    body = body.slice(0, 3).split('').map((c) => c + c).join('');
  } else if (body.length === 8) {
    // #rrggbbaa — drop alpha.
    body = body.slice(0, 6);
  }
  return `#${body}`;
}

/**
 * Merge multiple per-doc color maps into a sorted ranked list. The
 * caller would compute one map per doc via analyzeDocumentColors,
 * then pass them all here for a brand-wide ranking.
 */
export function rankBrandColors(
  perDoc: Iterable<Map<string, number>>,
  options: { limit?: number } = {},
): BrandColorEntry[] {
  const merged = new Map<string, number>();
  for (const docCounts of perDoc) {
    for (const [hex, n] of docCounts) {
      merged.set(hex, (merged.get(hex) ?? 0) + n);
    }
  }
  const ranked: BrandColorEntry[] = Array.from(merged, ([hex, count]) => ({ hex, count }));
  ranked.sort((a, b) => b.count - a.count || a.hex.localeCompare(b.hex));
  return options.limit !== undefined ? ranked.slice(0, options.limit) : ranked;
}
