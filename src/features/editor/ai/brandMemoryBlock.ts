// Phase 6.6 — `<brand_memory>` block for the AI system prompt.
//
// Renders the user's observed preferences (top non-kit colors + fonts
// from saved designs) as a compact, token-cheap block. Sits next to
// <brand_resolution> in the prompt: brand_resolution carries the kit's
// authoritative values; brand_memory carries soft signal about what
// the user has actually reached for outside the kit. The AI is told to
// treat memory as a tiebreaker, NOT as license to violate Rule 3
// (SlotRefs for brand-bound properties).
//
// Pure, dependency-free. Tested in isolation.

import type { BrandMemorySnapshot } from '@/core/services/IBrandMemoryService';

/**
 * Render the `<brand_memory>` block. Returns `''` (empty string) when
 * the snapshot is null or carries no signal — callers can drop empty
 * lines via the same `.filter((s) => s !== '')` pass `buildSystemPrompt`
 * already runs.
 *
 * Cap entries (default 6 colors, 4 fonts) so the block stays under
 * ~80 tokens even on heavy users.
 */
export function buildBrandMemoryBlock(
  snapshot: BrandMemorySnapshot | null | undefined,
  options: { colorLimit?: number; fontLimit?: number } = {},
): string {
  if (!snapshot) return '';
  const colorLimit = options.colorLimit ?? 6;
  const fontLimit = options.fontLimit ?? 4;
  const colors = snapshot.colors.slice(0, colorLimit);
  const fonts = snapshot.fonts.slice(0, fontLimit);
  if (colors.length === 0 && fonts.length === 0) return '';

  const lines: string[] = ['<brand_memory>'];
  lines.push(
    '  Observed preferences from the user\'s saved designs. Use as a TIEBREAKER',
  );
  lines.push(
    '  when the prompt is open-ended ("add a CTA", "make this stand out"). Do',
  );
  lines.push(
    '  NOT inline these as literals when a SlotRef is more appropriate (Rule 3).',
  );

  if (colors.length > 0) {
    lines.push('  colors_used:');
    for (const c of colors) {
      lines.push(`    - ${c.hex} (×${c.count})`);
    }
  }
  if (fonts.length > 0) {
    lines.push('  fonts_used:');
    for (const f of fonts) {
      lines.push(`    - ${f.family} (×${f.count})`);
    }
  }
  lines.push('</brand_memory>');
  return lines.join('\n');
}
