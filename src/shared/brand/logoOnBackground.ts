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
 *   - `pickLogoByPriority(brand, bg, roles)` → the FIRST readable role in a
 *     caller's order, falling back to the best-scoring variant.
 *   - `pickLogoVariant(brand, roles)`  → the variant to SHOW, ground not yet
 *     decided. Pair with `pickGroundForInk` when the surface owns its ground.
 *   - `knownInkOfRole(role)`           → the exact ink of a mono variant, or
 *     `undefined` for a coloured one (measure it — see `logoInk.ts`).
 *   - `pickGroundForInk(ink, grounds)` → the ground a given ink reads on.
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

/**
 * The order a brand's face is chosen in when the caller has one: the Primary
 * logo, then the Brand Icon, then whatever else reads.
 *
 * The primary IS the brand's logo — the one it would put on a sign — so it
 * leads, and the icon stands in when there is no primary. Neither should lose
 * the slot to a mono variant merely because that variant scores a higher
 * contrast ratio: scoring answers "can this be seen", which is a floor, not a
 * ranking of which mark is the right one.
 */
export const FACE_PRIORITY: LogoRole[] = ['primary', 'iconmark'];

/**
 * Pick a logo by the caller's ORDER, with this module's contrast floor still
 * doing the safety work.
 *
 * The priority decides; contrast only vetoes. Walking `priority` in order, the
 * first role the brand actually has AND that clears `minContrast` on this
 * background wins outright — no scoring comparison between them. Only when
 * every priority role is missing or unreadable does it fall through to
 * `pickLogoOnBackground`, which searches the remaining variants for one that
 * can be seen at all (this is what routes a brand-coloured mark on its own
 * brand-coloured card to its mono twin).
 *
 * `undefined` means the brand has no usable logo for this background, and the
 * caller should draw its letter — the last resort, never an earlier one.
 */
export function pickLogoByPriority(
  brand: Brand | null | undefined,
  bgHex: string,
  priority: LogoRole[] = FACE_PRIORITY,
  options: PickOptions = {},
): ResolvedLogo | undefined {
  if (!brand) return undefined;
  const minContrast = options.minContrast ?? 1.8;

  for (const role of priority) {
    const resolved = resolveBrandLogo(brand, role);
    if (!resolved) continue;
    if (contrastRatio(toneOfRole(role, brand), bgHex) >= minContrast) return resolved;
  }

  return pickLogoOnBackground(brand, bgHex, options);
}

/* ── Choosing a ground for a logo, rather than a logo for a ground ── */

/**
 * The variant to SHOW, before anything has been decided about the ground.
 *
 * `pickLogoOnBackground` and `pickLogoByPriority` answer "given this
 * background, what can be seen on it" — right when the background is fixed
 * (a slide, a printed page, someone else's card). A surface that owns its own
 * background has the better question available: show the brand's actual logo,
 * then put it on something it reads against. This is the first half of that,
 * and it applies NO contrast test, because there is not yet anything to test
 * against.
 */
export function pickLogoVariant(
  brand: Brand | null | undefined,
  priority: LogoRole[] = FACE_PRIORITY,
): { resolved: ResolvedLogo; role: LogoRole } | undefined {
  return variantsInPriorityOrder(brand, priority)[0];
}

/**
 * Every variant the brand has, in the caller's preference order.
 *
 * A surface that owns its ground wants the whole list, not the first entry: it
 * keeps its ground and walks down until it finds a variant that can be seen on
 * it, which is how a card stays in the brand's colour instead of turning white
 * for the sake of one lockup. The priority roles lead; the rest follow in the
 * module's own order so a brand whose only artwork is a mono twin still shows
 * artwork.
 */
export function variantsInPriorityOrder(
  brand: Brand | null | undefined,
  priority: LogoRole[] = FACE_PRIORITY,
): Array<{ resolved: ResolvedLogo; role: LogoRole }> {
  if (!brand) return [];
  const roles = [...priority, ...PICK_ROLES.filter((r) => !priority.includes(r))];
  const out: Array<{ resolved: ResolvedLogo; role: LogoRole }> = [];
  const seen = new Set<string>();
  for (const role of roles) {
    const resolved = resolveBrandLogo(brand, role);
    // The same asset can fill more than one role; showing it twice would make
    // the walk look like it had more choices than it does.
    if (!resolved || seen.has(resolved.url)) continue;
    seen.add(resolved.url);
    out.push({ resolved, role });
  }
  return out;
}

/**
 * The ink of a variant we know for certain, or `undefined` when we do not.
 *
 * Only the mono roles are certain: `mono.white` is white and `mono.black` is
 * black, by definition of the role. A coloured variant's ink is a fact about
 * the ARTWORK, which this module cannot see — `readLogoInk` can, and callers
 * that care should measure rather than accept the brand's primary colour as a
 * stand-in. That stand-in is why a lockup with a dark grey wordmark used to
 * score as though it were painted in the brand's yellow.
 */
export function knownInkOfRole(role: LogoRole): string | undefined {
  if (role === 'mono.black') return '#000000';
  if (role === 'mono.white') return '#ffffff';
  return undefined;
}

/**
 * Given an ink, the ground it reads on — the caller's preferred ground first.
 *
 * `grounds` is in preference order, and the FIRST one clearing `minContrast`
 * wins; a card that wants to stay in its brand's colour puts that colour first
 * and its brand-tinted extremes after it. Nothing clears the floor → the
 * highest-contrast candidate, because showing the logo somewhere imperfect
 * beats not showing it.
 */
export function pickGroundForInk(
  inkHex: string,
  grounds: string[],
  minContrast = 2.2,
): string | undefined {
  if (grounds.length === 0) return undefined;
  for (const ground of grounds) {
    if (contrastRatio(inkHex, ground) >= minContrast) return ground;
  }
  return grounds.reduce((best, g) =>
    contrastRatio(inkHex, g) > contrastRatio(inkHex, best) ? g : best,
  );
}
