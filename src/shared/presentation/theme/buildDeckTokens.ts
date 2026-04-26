// src/shared/presentation/theme/buildDeckTokens.ts

import type { CSSProperties } from 'react';
import type { Brand } from '@/shared/types/brand';
import { buildBrandPalette } from '@/shared/brand/brandPalette';
import type { SemanticRole, SemanticEntry, ScaleSurface, FontRef } from '@/shared/types/typescale';
import type { PresentationTheme, DeckDensity, DeckRadiusKind, DeckShadowKind } from './types';

/* ── Density ─────────────────────────────────────────────────────── */
// `pad`/`gap` are the small-component tokens (cards, callouts).
// `chromePadX`/`chromePadY` are the SLIDE-CHROME tokens (the 1920×1080
// canvas's outer margins where PageChrome lives). The slide canvas
// is huge, so chrome padding is a much bigger scale than the
// component padding.
const DENSITY: Record<DeckDensity, {
  padX: number; padY: number; gap: number;
  chromePadX: number; chromePadY: number;
}> = {
  compact:     { padX: 32, padY: 24, gap: 16, chromePadX:  56, chromePadY: 36 },
  comfortable: { padX: 56, padY: 40, gap: 24, chromePadX:  96, chromePadY: 64 },
  spacious:    { padX: 88, padY: 64, gap: 32, chromePadX: 144, chromePadY: 96 },
};

/* ── Radius ─────────────────────────────────────────────────────── */
const RADIUS: Record<DeckRadiusKind, string> = {
  sharp: '0px',
  soft:  '12px',
  pill:  '999px',
};

/* ── Shadow ─────────────────────────────────────────────────────── */
const SHADOW: Record<DeckShadowKind, string> = {
  none:    'none',
  soft:    '0 4px 12px rgba(13,13,13,0.06), 0 1px 2px rgba(13,13,13,0.04)',
  lifted:  '0 24px 48px -12px rgba(13,13,13,0.14), 0 8px 20px -8px rgba(13,13,13,0.10)',
};

/* ── Defaults when brand.typescale is missing ───────────────────── */
const DEFAULT_SIZE_BY_ROLE: Record<SemanticRole, number> = {
  display: 96,
  h1: 64,
  h2: 48,
  h3: 32,
  h4: 24,
  h5: 20,
  h6: 18,
  bodyLg: 22,
  body: 18,
  bodySm: 16,
  caption: 14,
  overline: 12,
  label: 13,
  button: 14,
  code: 14,
};

const DEFAULT_LEADING = 1.4;
const DEFAULT_LEADING_HEADING = 1.15;

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

export function buildDeckCssVars(brand: Brand, theme: PresentationTheme): CSSProperties {
  const palette = buildBrandPalette(brand, 'light');
  const presentationSurface = brand.typescale?.surfaces.presentation;

  /* fonts */
  const headingFont = theme.typography.headingFont ?? fontFamily(brand.typescale?.fonts.heading, "system-ui, sans-serif");
  const bodyFont    = theme.typography.bodyFont    ?? fontFamily(brand.typescale?.fonts.body,    "system-ui, sans-serif");

  /* size + leading per role */
  const scale = theme.typography.scaleMultiplier;
  const lead  = theme.typography.leadingMultiplier;

  const role = (
    r: SemanticRole,
    fallbackSize = DEFAULT_SIZE_BY_ROLE[r],
    fallbackLead = r === 'body' || r === 'caption' || r === 'bodyLg' || r === 'bodySm' ? DEFAULT_LEADING : DEFAULT_LEADING_HEADING,
  ) => {
    const entry = findStep(presentationSurface, r);
    return {
      sizePx: (entry?.sizePx ?? fallbackSize) * scale,
      leading: (entry?.lineHeight ?? fallbackLead) * lead,
      weight: entry?.weight ?? 400,
    };
  };

  const display = role('display');
  const h1      = role('h1');
  const h2      = role('h2');
  const h3      = role('h3');
  const body    = role('body');
  const caption = role('caption');
  const label   = role('label');

  /* weights */
  const headingWeight = theme.typography.headingWeight ?? h1.weight ?? 700;
  const bodyWeight    = theme.typography.bodyWeight    ?? body.weight ?? 400;

  /* colors */
  const bgPage    = theme.colors.bg       ?? palette.bg.page;
  const bgCard    = theme.colors.cardBg   ?? palette.bg.surface;
  const bgInverted= palette.bg.inverted;
  const textHead  = theme.colors.heading  ?? palette.text.heading;
  const textBody  = theme.colors.body     ?? palette.text.body;
  const textMuted = palette.text.muted;
  const accent    = theme.colors.accent   ?? palette.brand.accent;
  const borderSub = palette.border.subtle;

  /* density */
  const dens = DENSITY[theme.density];

  return {
    '--deck-font-heading': headingFont,
    '--deck-font-body': bodyFont,
    '--deck-weight-heading': String(headingWeight),
    '--deck-weight-body': String(bodyWeight),

    '--deck-text-display':  `${display.sizePx}px`,
    '--deck-leading-display': String(display.leading),
    '--deck-text-h1':       `${h1.sizePx}px`,
    '--deck-leading-h1':    String(h1.leading),
    '--deck-text-h2':       `${h2.sizePx}px`,
    '--deck-leading-h2':    String(h2.leading),
    '--deck-text-h3':       `${h3.sizePx}px`,
    '--deck-leading-h3':    String(h3.leading),
    '--deck-text-body':     `${body.sizePx}px`,
    '--deck-leading-body':  String(body.leading),
    '--deck-text-caption':  `${caption.sizePx}px`,
    '--deck-leading-caption': String(caption.leading),
    '--deck-text-label':    `${label.sizePx}px`,

    '--deck-bg-page': bgPage,
    '--deck-bg-card': bgCard,
    '--deck-bg-inverted': bgInverted,
    '--deck-text-heading': textHead,
    // NOTE: `--deck-text-body` above is the body font-size (px). The body
    // text color uses a separate var `--deck-color-body` to avoid the
    // naming collision the plan's first draft had.
    '--deck-color-body': textBody,
    '--deck-text-muted': textMuted,
    '--deck-accent': accent,
    '--deck-border-subtle': borderSub,

    '--deck-pad-x': `${dens.padX}px`,
    '--deck-pad-y': `${dens.padY}px`,
    '--deck-gap':   `${dens.gap}px`,

    // Slide chrome (the page edges where PageChrome lives) — bigger
    // numbers than --deck-pad-x/y because the slide canvas is large.
    '--deck-chrome-pad-x': `${dens.chromePadX}px`,
    '--deck-chrome-pad-y': `${dens.chromePadY}px`,

    '--deck-radius': RADIUS[theme.style.borderRadius],
    '--deck-shadow': SHADOW[theme.style.shadow],
  } as CSSProperties;
}
