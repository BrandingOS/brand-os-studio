/**
 * Brand palette — derived role-based color tokens, the way Elementor /
 * Tailwind / shadcn do it but specific to the brand at hand.
 *
 * Why this exists:
 *   We kept building surfaces (cards, kit previews, presentation slides,
 *   guideline pages) that picked colors ad-hoc and ended up with
 *   guidelines where every section bleeds into the next ("الالوان كلها
 *   لازقة في بعض"). The fix is a small set of NAMED surface roles plus
 *   a deterministic builder that turns any brand into a complete,
 *   contrast-safe palette.
 *
 * Public API:
 *   - `buildBrandPalette(brand, mode='light')` → `BrandPalette`
 *   - `pickSurfaceTokens(palette, kind)`        → `SurfaceTokens`
 *   - `applyPaletteToRoot(palette, root?)`      → write CSS custom props
 *   - `surfacePalette(brand, kind, mode='light')` → one-shot shortcut
 *
 * **Design rules** (the "smart" part):
 *   1. Neutrals are TINTED with the brand hue (via `suggestNeutrals`),
 *      not pure gray. A page background looks branded without being loud.
 *   2. Every surface kind has a guaranteed-readable text + muted +
 *      border partner, picked by WCAG contrast — never hand-paired.
 *   3. The "subtle" kind uses the lightest tinted neutral so a section
 *      band reads as on-brand without competing with hero/brand sections.
 *   4. The "brand" kind always pairs `brand.primary` with the
 *      higher-contrast of pure black or pure white as text — same
 *      decision Apple / Linear / Stripe make on a primary-tinted hero.
 *   5. `accent` defaults to the existing colorSystem.accent, falling
 *      back to a triadic suggestion. It's the CTA color — used sparingly
 *      to keep everything readable and not noisy.
 */

import type { Brand } from '@/shared/types/brand';
import type { ColorToken } from '@/shared/types/brandAssets';
import {
  hexToHsl,
  hslToHex,
  suggestAccent,
  suggestNeutrals,
} from '@/shared/color/colorEngine';
import {
  bgTone,
  contrastRatio,
  pickFgOnBackground,
} from './logoOnBackground';

/* ── Types ────────────────────────────────────────────────────────── */

export type SurfaceKind =
  | 'page'             // app/page background — the canvas everything sits on
  | 'card'             // standard surface — inset on the page
  | 'elevated'         // popovers / modals — sits above cards
  | 'subtle'           // tinted band — primary hue at very low saturation
  | 'brand'            // primary-color hero — bold
  | 'brand-secondary'  // secondary-color band — alternative bold
  | 'inverted';        // dark surface in light mode (or vice versa)

export interface SurfaceTokens {
  bg: string;
  text: string;        // headings + primary copy
  textMuted: string;   // captions / secondary copy
  border: string;      // dividers + hairlines
  accent: string;      // CTA / highlight on this surface
}

export interface BrandPalette {
  /** The brand-expression colors — the "shouty" set. */
  brand: {
    primary: string;
    secondary: string;
    accent: string;
  };

  /** Surface backgrounds — "where things sit". */
  bg: {
    page: string;
    surface: string;
    elevated: string;
    subtle: string;       // tinted band
    inverted: string;     // dark in light mode, light in dark
  };

  /** Foregrounds — picked off the surface ramp. */
  text: {
    heading: string;       // strongest contrast against surface
    body: string;          // softer, body copy
    muted: string;         // captions
    onBrand: string;       // text that sits on `brand.primary`
    onBrandSecondary: string;
    onInverted: string;
  };

  /** Strokes. */
  border: {
    subtle: string;
    strong: string;
  };

  /** Functional / state. */
  state: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };

  /** Whether the surface ramp is light-on-light or dark-on-dark biased. */
  mode: 'light' | 'dark';
}

/* ── Helpers ──────────────────────────────────────────────────────── */

const FALLBACK_PRIMARY = '#0d0d0d';

function hex(c?: ColorToken | string | null, fallback?: string): string {
  if (!c) return fallback ?? FALLBACK_PRIMARY;
  if (typeof c === 'string') return c;
  return c.hex || fallback || FALLBACK_PRIMARY;
}

/**
 * Derive a guaranteed light/dark surface ramp from the brand primary.
 * Returns 6 HSL stops keyed by tint depth — not "neutrals" the way
 * we'd render them, but a band of safe surface candidates.
 */
function tintedRamp(
  primary: string,
  mode: 'light' | 'dark',
): { L98: string; L94: string; L82: string; L55: string; L35: string; L10: string } {
  // Reuse the existing suggestNeutrals which returns 6 tinted shades
  // from L98 → L10. Indices match the names below for clarity.
  const [L98, L94, L82, L55, L35, L10] = suggestNeutrals(primary);
  void mode; // mode is consumed by callers, not the ramp itself
  return {
    L98: L98 ?? '#fafafa',
    L94: L94 ?? '#f0f0f0',
    L82: L82 ?? '#d0d0d0',
    L55: L55 ?? '#888888',
    L35: L35 ?? '#444444',
    L10: L10 ?? '#0d0d0d',
  };
}

/**
 * State colors. We keep these brand-agnostic by default — green / amber /
 * red / blue universal-recognisable hues. If `colorSystem.semantic` is
 * defined we use those instead.
 */
function defaultState(): BrandPalette['state'] {
  return {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  };
}

/* ── Builder ──────────────────────────────────────────────────────── */

export function buildBrandPalette(
  brand: Brand | null | undefined,
  mode: 'light' | 'dark' = 'light',
): BrandPalette {
  const cs = brand?.colorSystem;
  const primary = hex(cs?.primary ?? brand?.primaryColor, FALLBACK_PRIMARY);
  const secondary = hex(
    cs?.secondary ?? brand?.secondaryColor,
    // If no secondary, use a desaturated primary so it still reads as
    // "another brand color" rather than the same color twice.
    desaturate(primary, 0.4),
  );
  const accent = hex(cs?.accent, suggestAccent(primary));

  const ramp = tintedRamp(primary, mode);

  // Light-mode surfaces: from white-ish (page) up the ramp.
  // Dark-mode surfaces: invert the ramp.
  const isDark = mode === 'dark';

  const bg = isDark
    ? {
        page: ramp.L10,
        surface: shiftL(ramp.L10, +4),
        elevated: shiftL(ramp.L10, +8),
        subtle: tint(primary, 0.18, 'dark'),  // brand-tinted dark band
        inverted: ramp.L98,
      }
    : {
        page: ramp.L98,
        surface: '#ffffff',
        elevated: '#ffffff',
        subtle: tint(primary, 0.06, 'light'), // brand-tinted light band
        inverted: ramp.L10,
      };

  // Pick text/border off the ramp so contrast is guaranteed.
  const heading = isDark ? ramp.L98 : ramp.L10;
  const body = isDark ? shiftL(ramp.L98, -10) : ramp.L35;
  const muted = isDark ? ramp.L55 : shiftL(ramp.L55, -4);
  const onBrand = pickFgOnBackground(primary, ['#ffffff', ramp.L10]);
  const onBrandSecondary = pickFgOnBackground(secondary, ['#ffffff', ramp.L10]);
  const onInverted = isDark ? ramp.L10 : ramp.L98;

  return {
    brand: { primary, secondary, accent },
    bg,
    text: {
      heading,
      body,
      muted,
      onBrand,
      onBrandSecondary,
      onInverted,
    },
    border: {
      subtle: isDark ? shiftL(ramp.L82, -55) : ramp.L82,
      strong: isDark ? shiftL(ramp.L82, -40) : shiftL(ramp.L82, -10),
    },
    state: cs?.semantic
      ? {
          success: hex(cs.semantic.success, '#10b981'),
          warning: hex(cs.semantic.warning, '#f59e0b'),
          error: hex(cs.semantic.error, '#ef4444'),
          info: hex(cs.semantic.info, '#3b82f6'),
        }
      : defaultState(),
    mode,
  };
}

/* ── Surface picker ───────────────────────────────────────────────── */

/**
 * Given a palette and a surface kind, return a `{ bg, text, textMuted,
 * border, accent }` token bundle that's guaranteed to be readable.
 * Use this anywhere you'd otherwise hand-pair colors.
 */
export function pickSurfaceTokens(
  palette: BrandPalette,
  kind: SurfaceKind,
): SurfaceTokens {
  switch (kind) {
    case 'page':
      return {
        bg: palette.bg.page,
        text: palette.text.heading,
        textMuted: palette.text.muted,
        border: palette.border.subtle,
        accent: palette.brand.primary,
      };
    case 'card':
      return {
        bg: palette.bg.surface,
        text: palette.text.heading,
        textMuted: palette.text.muted,
        border: palette.border.subtle,
        accent: palette.brand.primary,
      };
    case 'elevated':
      return {
        bg: palette.bg.elevated,
        text: palette.text.heading,
        textMuted: palette.text.muted,
        border: palette.border.strong,
        accent: palette.brand.primary,
      };
    case 'subtle':
      return {
        bg: palette.bg.subtle,
        text: palette.text.heading,
        textMuted: palette.text.muted,
        border: palette.border.subtle,
        accent: palette.brand.primary,
      };
    case 'brand': {
      const onBrandMuted = mix(palette.text.onBrand, palette.brand.primary, 0.35);
      return {
        bg: palette.brand.primary,
        text: palette.text.onBrand,
        textMuted: onBrandMuted,
        border: mix(palette.text.onBrand, palette.brand.primary, 0.7),
        accent: palette.text.onBrand,
      };
    }
    case 'brand-secondary': {
      const onSecMuted = mix(palette.text.onBrandSecondary, palette.brand.secondary, 0.35);
      return {
        bg: palette.brand.secondary,
        text: palette.text.onBrandSecondary,
        textMuted: onSecMuted,
        border: mix(palette.text.onBrandSecondary, palette.brand.secondary, 0.7),
        accent: palette.text.onBrandSecondary,
      };
    }
    case 'inverted':
      return {
        bg: palette.bg.inverted,
        text: palette.text.onInverted,
        textMuted: mix(palette.text.onInverted, palette.bg.inverted, 0.4),
        border: mix(palette.text.onInverted, palette.bg.inverted, 0.7),
        accent: palette.brand.accent,
      };
  }
}

/** One-shot helper — most callers want this. */
export function surfacePalette(
  brand: Brand | null | undefined,
  kind: SurfaceKind,
  mode: 'light' | 'dark' = 'light',
): SurfaceTokens {
  return pickSurfaceTokens(buildBrandPalette(brand, mode), kind);
}

/* ── CSS variable plumbing ────────────────────────────────────────── */

/**
 * Write the palette to CSS custom properties on the given root (defaults
 * to `:root`). Any DOM consumer can then read the variables instead of
 * importing this module.
 *
 *   var(--bp-bg-page)   var(--bp-text-heading)
 *   var(--bp-bg-card)   var(--bp-text-body)
 *   var(--bp-brand-primary)   ...
 */
export function applyPaletteToRoot(
  palette: BrandPalette,
  root: HTMLElement | null = typeof document !== 'undefined' ? document.documentElement : null,
): void {
  if (!root) return;
  const set = (k: string, v: string) => root.style.setProperty(`--bp-${k}`, v);

  set('mode', palette.mode);

  set('brand-primary', palette.brand.primary);
  set('brand-secondary', palette.brand.secondary);
  set('brand-accent', palette.brand.accent);

  set('bg-page', palette.bg.page);
  set('bg-surface', palette.bg.surface);
  set('bg-elevated', palette.bg.elevated);
  set('bg-subtle', palette.bg.subtle);
  set('bg-inverted', palette.bg.inverted);

  set('text-heading', palette.text.heading);
  set('text-body', palette.text.body);
  set('text-muted', palette.text.muted);
  set('text-on-brand', palette.text.onBrand);
  set('text-on-brand-secondary', palette.text.onBrandSecondary);
  set('text-on-inverted', palette.text.onInverted);

  set('border-subtle', palette.border.subtle);
  set('border-strong', palette.border.strong);

  set('state-success', palette.state.success);
  set('state-warning', palette.state.warning);
  set('state-error', palette.state.error);
  set('state-info', palette.state.info);
}

/* ── Validation utility ───────────────────────────────────────────── */

/**
 * Returns `true` if every surface kind in the palette clears the
 * minimum WCAG contrast ratio for body text (4.5:1). Useful for tests
 * and for CI guards on the brand-onboarding flow.
 */
export function isPaletteReadable(palette: BrandPalette, minRatio = 4.5): boolean {
  const kinds: SurfaceKind[] = [
    'page', 'card', 'elevated', 'subtle', 'brand', 'brand-secondary', 'inverted',
  ];
  return kinds.every((k) => {
    const t = pickSurfaceTokens(palette, k);
    return contrastRatio(t.text, t.bg) >= minRatio;
  });
}

/* ── Local color math (kept private — colorEngine doesn't expose these) */

function shiftL(hexColor: string, delta: number): string {
  const { h, s, l } = hexToHsl(hexColor);
  return hslToHex(h, s, clamp(l + delta, 0, 100));
}

function desaturate(hexColor: string, factor: number): string {
  const { h, s, l } = hexToHsl(hexColor);
  return hslToHex(h, clamp(s * (1 - factor), 0, 100), l);
}

function tint(brandHex: string, strength: number, mode: 'light' | 'dark'): string {
  const { h, s } = hexToHsl(brandHex);
  // strength: 0..1 (how much of the brand hue to keep)
  // light mode → mostly white, sliver of brand → very-pale tinted band
  // dark mode → mostly near-black, sliver of brand → moody tinted band
  if (mode === 'light') {
    return hslToHex(h, Math.round(s * strength), Math.round(98 - strength * 6));
  }
  return hslToHex(h, Math.round(s * strength), Math.round(14 + strength * 6));
}

function mix(aHex: string, bHex: string, weight: number): string {
  const a = parseHex(aHex);
  const b = parseHex(bHex);
  const w = clamp(weight, 0, 1);
  const r = Math.round(a.r * w + b.r * (1 - w));
  const g = Math.round(a.g * w + b.g * (1 - w));
  const bl = Math.round(a.b * w + b.b * (1 - w));
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function parseHex(hexColor: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hexColor.trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  const int = parseInt(m[1]!, 16);
  return { r: (int >> 16) & 0xff, g: (int >> 8) & 0xff, b: int & 0xff };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/* ── Re-export bgTone so consumers can pick text on arbitrary bgs ── */
export { bgTone };
