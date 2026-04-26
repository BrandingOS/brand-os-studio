// src/shared/presentation/theme/buildDeckTokens.ts

import type { CSSProperties } from 'react';
import type { Brand } from '@/shared/types/brand';
import { buildBrandPalette } from '@/shared/brand/brandPalette';
import type { SemanticRole, SemanticEntry, ScaleSurface, FontRef } from '@/shared/types/typescale';
import type {
  PresentationTheme,
  DeckDensity,
  DeckRadiusKind,
  DeckShadowKind,
  DeckTypeRole,
} from './types';
import { normalizeTheme } from './types';

/* ── Density ─────────────────────────────────────────────────────── */
const DENSITY: Record<DeckDensity, {
  padX: number; padY: number; gap: number;
  chromePadX: number; chromePadY: number;
}> = {
  compact:     { padX: 32, padY: 24, gap: 16, chromePadX:  56, chromePadY: 36 },
  comfortable: { padX: 56, padY: 40, gap: 24, chromePadX:  96, chromePadY: 64 },
  spacious:    { padX: 88, padY: 64, gap: 32, chromePadX: 144, chromePadY: 96 },
};

const RADIUS: Record<DeckRadiusKind, string> = {
  sharp: '0px',
  soft:  '12px',
  pill:  '999px',
};

const SHADOW: Record<DeckShadowKind, string> = {
  none:    'none',
  soft:    '0 4px 12px rgba(13,13,13,0.06), 0 1px 2px rgba(13,13,13,0.04)',
  lifted:  '0 24px 48px -12px rgba(13,13,13,0.14), 0 8px 20px -8px rgba(13,13,13,0.10)',
};

/* ── Per-role defaults when the brand typescale doesn't define them ─ */
interface RoleDefault {
  sizePx: number;
  lineHeight: number;
  weight: number;
  /** Which font slot (heading or body) drives this role's font-family. */
  fontSlot: 'heading' | 'body';
}

const ROLE_DEFAULTS: Record<DeckTypeRole, RoleDefault> = {
  display: { sizePx: 96, lineHeight: 1.05, weight: 700, fontSlot: 'heading' },
  h1:      { sizePx: 64, lineHeight: 1.10, weight: 700, fontSlot: 'heading' },
  h2:      { sizePx: 48, lineHeight: 1.15, weight: 700, fontSlot: 'heading' },
  h3:      { sizePx: 32, lineHeight: 1.25, weight: 600, fontSlot: 'heading' },
  h4:      { sizePx: 24, lineHeight: 1.30, weight: 600, fontSlot: 'heading' },
  body:    { sizePx: 18, lineHeight: 1.55, weight: 400, fontSlot: 'body' },
  caption: { sizePx: 14, lineHeight: 1.45, weight: 400, fontSlot: 'body' },
  label:   { sizePx: 13, lineHeight: 1.20, weight: 600, fontSlot: 'body' },
};

/** SemanticRole keys to look up on the brand's presentation surface for each deck role. */
const BRAND_ROLE_KEY: Record<DeckTypeRole, SemanticRole> = {
  display: 'display',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body: 'body',
  caption: 'caption',
  label: 'label',
};

/* ── Lookup helpers ─────────────────────────────────────────────── */
function findStep(surface: ScaleSurface | undefined, role: SemanticRole): { sizePx: number; lineHeight: number; weight: number } | undefined {
  if (!surface) return undefined;
  const entry: SemanticEntry | undefined = surface.semantic[role];
  if (!entry) return undefined;
  const step = surface.steps.find((s) => s.id === entry.stepId);
  if (!step) return undefined;
  return {
    sizePx: step.sizePx,
    lineHeight: step.lineHeight,
    weight: entry.weight ?? step.weight,
  };
}

function fontFamily(ref: FontRef | undefined, fallback: string): string {
  if (!ref) return fallback;
  return `'${ref.family}', ${ref.fallback}`;
}

/* ── Public API ─────────────────────────────────────────────────── */

/**
 * Resolve the final value of a CSS-var bag for the given (brand, theme).
 *
 * Each typography role gets its own complete set of vars:
 *   --deck-font-{role} · --deck-text-{role} · --deck-leading-{role}
 *   --deck-weight-{role} · --deck-color-{role}
 *
 * Plus the alias group vars some legacy code still reads:
 *   --deck-font-heading / --deck-font-body
 *   --deck-weight-heading / --deck-weight-body
 *   --deck-text-heading (color alias) / --deck-color-body
 *   --deck-text-muted (alias for caption color)
 */
export function buildDeckCssVars(brand: Brand, theme: PresentationTheme): CSSProperties {
  // Defensive: a stale theme shape (legacy flat typography from before
  // the per-role rewrite) would crash on `theme.typography.roles[role]`.
  // Normalize once at the entry so the rest of the function is safe.
  const t = normalizeTheme(theme);
  const palette = buildBrandPalette(brand, 'light');
  const presentationSurface = brand.typescale?.surfaces.presentation;

  const brandHeadingFont = fontFamily(brand.typescale?.fonts.heading, "system-ui, sans-serif");
  const brandBodyFont    = fontFamily(brand.typescale?.fonts.body,    "system-ui, sans-serif");

  // Resolve each role to a final set of CSS values.
  const resolveRole = (role: DeckTypeRole) => {
    const override = t.typography.roles[role];
    const def = ROLE_DEFAULTS[role];
    const brandStep = findStep(presentationSurface, BRAND_ROLE_KEY[role]);
    const baseFont = def.fontSlot === 'heading' ? brandHeadingFont : brandBodyFont;
    const baseColor = def.fontSlot === 'heading' ? palette.text.heading : palette.text.body;
    return {
      font: override?.font ?? baseFont,
      sizePx: override?.sizePx ?? brandStep?.sizePx ?? def.sizePx,
      lineHeight: override?.lineHeight ?? brandStep?.lineHeight ?? def.lineHeight,
      weight: override?.weight ?? brandStep?.weight ?? def.weight,
      color: override?.color ?? (role === 'caption' || role === 'label' ? palette.text.muted : baseColor),
    };
  };

  const display = resolveRole('display');
  const h1 = resolveRole('h1');
  const h2 = resolveRole('h2');
  const h3 = resolveRole('h3');
  const h4 = resolveRole('h4');
  const body = resolveRole('body');
  const caption = resolveRole('caption');
  const label = resolveRole('label');

  /* Colors */
  const bgPage    = t.colors.bg     ?? palette.bg.page;
  const bgCard    = t.colors.cardBg ?? palette.bg.surface;
  const bgInverted = palette.bg.inverted;
  const accent    = t.colors.accent ?? palette.brand.accent;
  const borderSub = palette.border.subtle;

  /* Density */
  const dens = DENSITY[t.density];

  return {
    /* Per-role tokens — the new contract */
    '--deck-font-display':    display.font,
    '--deck-text-display':    `${display.sizePx}px`,
    '--deck-leading-display': String(display.lineHeight),
    '--deck-weight-display':  String(display.weight),
    '--deck-color-display':   display.color,

    '--deck-font-h1':    h1.font,
    '--deck-text-h1':    `${h1.sizePx}px`,
    '--deck-leading-h1': String(h1.lineHeight),
    '--deck-weight-h1':  String(h1.weight),
    '--deck-color-h1':   h1.color,

    '--deck-font-h2':    h2.font,
    '--deck-text-h2':    `${h2.sizePx}px`,
    '--deck-leading-h2': String(h2.lineHeight),
    '--deck-weight-h2':  String(h2.weight),
    '--deck-color-h2':   h2.color,

    '--deck-font-h3':    h3.font,
    '--deck-text-h3':    `${h3.sizePx}px`,
    '--deck-leading-h3': String(h3.lineHeight),
    '--deck-weight-h3':  String(h3.weight),
    '--deck-color-h3':   h3.color,

    '--deck-font-h4':    h4.font,
    '--deck-text-h4':    `${h4.sizePx}px`,
    '--deck-leading-h4': String(h4.lineHeight),
    '--deck-weight-h4':  String(h4.weight),
    '--deck-color-h4':   h4.color,

    '--deck-font-body':    body.font,
    '--deck-text-body':    `${body.sizePx}px`,
    '--deck-leading-body': String(body.lineHeight),
    '--deck-weight-body':  String(body.weight),
    '--deck-color-body':   body.color,

    '--deck-font-caption':    caption.font,
    '--deck-text-caption':    `${caption.sizePx}px`,
    '--deck-leading-caption': String(caption.lineHeight),
    '--deck-weight-caption':  String(caption.weight),
    '--deck-color-caption':   caption.color,

    '--deck-font-label':    label.font,
    '--deck-text-label':    `${label.sizePx}px`,
    '--deck-leading-label': String(label.lineHeight),
    '--deck-weight-label':  String(label.weight),
    '--deck-color-label':   label.color,

    /* Alias group vars — kept so legacy variant code that reads
     * --deck-font-heading or --deck-text-heading still works.
     * "Heading" group resolves to h1 (the most common heading role). */
    '--deck-font-heading':   h1.font,
    '--deck-weight-heading': String(h1.weight),
    '--deck-text-heading':   h1.color,           // historical: this var was COLOR
    '--deck-text-muted':     caption.color,       // alias used by .deck-caption legacy

    /* Surfaces */
    '--deck-bg-page':       bgPage,
    '--deck-bg-card':       bgCard,
    '--deck-bg-inverted':   bgInverted,
    '--deck-accent':        accent,
    '--deck-border-subtle': borderSub,

    /* Density */
    '--deck-pad-x': `${dens.padX}px`,
    '--deck-pad-y': `${dens.padY}px`,
    '--deck-gap':   `${dens.gap}px`,
    '--deck-chrome-pad-x': `${dens.chromePadX}px`,
    '--deck-chrome-pad-y': `${dens.chromePadY}px`,

    /* Style */
    '--deck-radius': RADIUS[t.style.borderRadius],
    '--deck-shadow': SHADOW[t.style.shadow],
  } as CSSProperties;
}
