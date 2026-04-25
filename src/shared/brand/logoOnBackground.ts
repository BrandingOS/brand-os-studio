/**
 * Canonical "what reads on what" helpers for any surface that places a
 * logo (or text, or icon) over a background color.
 *
 * Why this exists:
 *   We kept shipping cards / variations / kit previews where a brand's
 *   primary-colored logo sat on the same primary-colored background, or
 *   a mono-black logo on a black background — invisible. This module is
 *   the single place that decides which logo variant to use for a given
 *   background, so card grids, brand-kit previews, presentation slides,
 *   guidelines exports, and future auto-generated surfaces all make the
 *   same correct choice.
 *
 * Public API:
 *   - `pickLogoOnBackground(brand, bg)` → the best `ResolvedLogo` for that bg.
 *   - `bgTone(bg)`                      → 'light' | 'dark' (use for text/icon).
 *   - `pickFgOnBackground(bg, [...])`   → highest-contrast fg from candidates.
 *   - `relativeLuminance` / `contrastRatio` — primitives if you need them.
 *
 * **Don't reinvent these.** If you find yourself writing
 *   `brand.primaryColor || ... ? whiteLogo : blackLogo`
 * stop and use `pickLogoOnBackground`.
 */

import type { Brand } from '@/shared/types/brand';
import type { LogoRole } from '@/shared/types/brandAssets';
import { resolveBrandLogo, type ResolvedLogo } from '@/shared/hooks/useBrandLogo';

/* ── Color primitives ─────────────────────────────────────────────── */

/** WCAG 2.1 relative luminance for an `#rrggbb` hex string (0..1). */
export function relativeLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const int = parseInt(m[1]!, 16);
  const channels = [(int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

/** WCAG contrast ratio between two `#rrggbb` colors. Range 1..21. */
export function contrastRatio(aHex: string, bHex: string): number {
  const a = relativeLuminance(aHex);
  const b = relativeLuminance(bHex);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Light or dark background? Threshold matches the WCAG-suggested cutoff
 * (luminance 0.179) — the same one Tailwind / shadcn use to switch text
 * color on a tinted surface.
 */
export function bgTone(bgHex: string): 'light' | 'dark' {
  return relativeLuminance(bgHex) < 0.179 ? 'dark' : 'light';
}

/**
 * Given a background and a list of foreground hex candidates, return
 * the one with the highest contrast. Use this for "what color should
 * the text on this card be?" — pass `['#000', '#fff']` and trust it.
 */
export function pickFgOnBackground(bgHex: string, candidates: string[]): string {
  if (candidates.length === 0) return bgTone(bgHex) === 'dark' ? '#ffffff' : '#000000';
  return candidates.reduce((best, c) =>
    contrastRatio(c, bgHex) > contrastRatio(best, bgHex) ? c : best,
  );
}

/* ── Logo picker ──────────────────────────────────────────────────── */

/**
 * Each known logo role has a "tone color" — the dominant ink color of
 * that variant — used for scoring it against a background.
 *
 * For the explicit mono variants we know the exact pixel value. For
 * colored variants (primary/iconmark/wordmark/secondary) we don't (we'd
 * have to parse the asset), so we fall back to the brand's primary
 * color as the best approximation. Brands that ship a primary asset
 * intended for dark backgrounds (i.e. it's actually white) should also
 * publish `mono.white` — the picker will route to it automatically.
 */
function toneOfRole(role: LogoRole, brand: Brand): string {
  if (role === 'mono.black') return '#000000';
  if (role === 'mono.white') return '#ffffff';
  return (
    brand.primaryColor ||
    brand.colorSystem?.primary?.hex ||
    '#000000'
  );
}

/**
 * Roles considered when picking a logo. Order doesn't matter for
 * correctness — we score every candidate and return the highest. It
 * matters only for tie-breaking (first one in this list wins ties).
 */
const PICK_ROLES: LogoRole[] = [
  'mono.black',
  'mono.white',
  'iconmark',
  'primary',
  'wordmark',
];

interface PickOptions {
  /** Override the role candidate list (rarely needed). */
  roles?: LogoRole[];
  /**
   * Minimum acceptable contrast ratio. If even the best candidate is
   * below this, the picker returns `undefined` so the caller can fall
   * back to a letter mark / placeholder. WCAG calls 3.0 the floor for
   * non-text content; we use 1.8 by default because brand marks often
   * include thicker shapes that are still readable below the text floor.
   */
  minContrast?: number;
}

/**
 * Pick the brand-logo variant that reads best on `bgHex`. Returns
 * `undefined` if the brand has no logo at all, or if even the best
 * available variant fails the minimum-contrast check.
 *
 * Examples:
 *   - SKAM (primary red `#EF4444`) on a red card → returns `mono.white`
 *     (white ink on red, contrast ~3.5) instead of the colored primary
 *     (red on red, contrast 1.0).
 *   - Vector (primary blue) on a blue card → same pattern.
 *   - Brand on a near-white background → `mono.black` wins.
 *   - Brand whose primary is bright orange on a dark navy bg → primary
 *     wins on contrast (orange on navy is high-contrast and on-brand).
 */
export function pickLogoOnBackground(
  brand: Brand | null | undefined,
  bgHex: string,
  options: PickOptions = {},
): ResolvedLogo | undefined {
  if (!brand) return undefined;
  const minContrast = options.minContrast ?? 1.8;
  const roles = options.roles ?? PICK_ROLES;

  let best: { resolved: ResolvedLogo; score: number } | undefined;
  for (const role of roles) {
    const resolved = resolveBrandLogo(brand, role);
    if (!resolved) continue;
    const tone = toneOfRole(role, brand);
    const score = contrastRatio(tone, bgHex);
    if (!best || score > best.score) best = { resolved, score };
  }

  if (!best || best.score < minContrast) return undefined;
  return best.resolved;
}
