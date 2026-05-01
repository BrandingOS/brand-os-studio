// Compact brand-resolution block for the AI system prompt.
//
// Phase 3.5. Renders the BrandKit's resolved values for each SlotRef the
// AI can emit, in a token-cheap form (~80–120 tokens total). The block
// gives Claude explicit contrast/tone context for color decisions so it
// can pick brand-bound colors that read against their backgrounds —
// without having to parse the full BrandKit JSON.
//
// Shape (one line per SlotRef):
//
//   <brand_resolution>
//     brand.color.primary → #1A1A2E (Brand Navy, dark)
//     brand.color.secondary → #16A34A (Brand Green)
//     brand.color.neutral.0 → #FAFAFA (lightest)
//     ...
//     brand.font.heading → DM Sans
//     brand.font.body → Roboto
//   </brand_resolution>
//
// Co-located with future buildBrandCard (Phase 3.5 commit 2 moves the
// brandCard helper from src/features/ai-design/lib/ → src/features/editor/ai/,
// where this file already lives).
//
// The renderer is a pure function over BrandKit. No React, no DI. Tested
// in isolation at src/features/editor/ai/brandResolutionBlock.test.ts.

import type { BrandKit } from '@/features/editor/brand/BrandKit';

/**
 * Render the condensed `<brand_resolution>` block for the system prompt.
 * Lists every SlotRef the AI can emit with its resolved value plus an
 * optional human-readable tone hint (lightest / mid / darkest) for
 * neutrals and (light / dark) for branded colors.
 */
export function buildBrandResolutionBlock(kit: BrandKit): string {
  const lines: string[] = ['<brand_resolution>'];

  const primaryLabel = colorLabel(kit.colors.primary.hex, kit.colors.primary.name);
  lines.push(`  brand.color.primary → ${kit.colors.primary.hex}${primaryLabel}`);

  if (kit.colors.secondary) {
    const label = colorLabel(kit.colors.secondary.hex, kit.colors.secondary.name);
    lines.push(`  brand.color.secondary → ${kit.colors.secondary.hex}${label}`);
  }

  if (kit.colors.accent) {
    const label = colorLabel(kit.colors.accent.hex, kit.colors.accent.name);
    lines.push(`  brand.color.accent → ${kit.colors.accent.hex}${label}`);
  }

  // Neutrals: always 6 entries, lightest → darkest. List with index +
  // a tone hint so the AI can pick the right index for contrast.
  const NEUTRAL_HINTS = ['lightest', '', '', 'mid', '', 'darkest'] as const;
  kit.colors.neutrals.forEach((hex, i) => {
    const hint = NEUTRAL_HINTS[i];
    const tag = hint ? ` (${hint})` : '';
    lines.push(`  brand.color.neutral.${i} → ${hex}${tag}`);
  });

  lines.push(`  brand.font.heading → ${kit.typography.heading.family}`);
  lines.push(`  brand.font.body → ${kit.typography.body.family}`);

  lines.push('</brand_resolution>');
  return lines.join('\n');
}

/**
 * Build a parenthetical label for a brand color. Includes:
 *   • The color's stored `name` if present.
 *   • A tone tag (`light` / `dark`) computed from relative luminance.
 *
 * Examples:
 *   colorLabel('#1A1A2E', 'Brand Navy') → ' (Brand Navy, dark)'
 *   colorLabel('#16A34A', undefined)    → ' (dark)'
 *   colorLabel('#FAFAFA', 'Cloud')      → ' (Cloud, light)'
 *
 * Returns an empty string if the hex is unparseable (defensive — a
 * malformed brand kit should not crash the prompt builder).
 */
function colorLabel(hex: string, name?: string): string {
  const tone = hexTone(hex);
  const parts: string[] = [];
  if (name) parts.push(name);
  if (tone) parts.push(tone);
  return parts.length === 0 ? '' : ` (${parts.join(', ')})`;
}

/** Light / dark heuristic from sRGB luminance. Returns '' if hex is unparseable. */
function hexTone(hex: string): 'light' | 'dark' | '' {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '';
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  // Relative luminance per WCAG 2.x (simplified — no gamma correction).
  // Threshold 0.5 splits "needs dark text" from "needs light text" for
  // ordinary brand-color use; matches the editor's bgTone() helper at
  // src/shared/brand/logoOnBackground.ts.
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum < 0.5 ? 'dark' : 'light';
}
