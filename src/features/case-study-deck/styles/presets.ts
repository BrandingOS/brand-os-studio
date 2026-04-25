/**
 * The 10 deck-wide style presets — the MVP "templates".
 *
 * Each preset is a complete token bundle. Pick one in the topbar; every
 * archetype slide reads it and adapts. The choice persists per deck.
 *
 * Adding a new template later = add an entry here + extend the per-style
 * branches in archetype renderers (or the new entry inherits the closest
 * style's defaults via STYLES_BY_CATEGORY).
 */

import type { DeckStyle, DeckStyleId } from './types';

const SANS_STACK = `'Inter', 'Helvetica Neue', Arial, sans-serif`;
const SERIF_STACK = `'Instrument Serif', 'Cormorant Garamond', 'Playfair Display', Georgia, serif`;
const MONO_STACK = `'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', ui-monospace, monospace`;

/** Resolve the abstract family token to a concrete CSS font-family stack. */
export function fontStackFor(token: 'brand' | 'sans' | 'serif' | 'mono', brandFamily: string): string {
  if (token === 'brand') return `'${brandFamily}', ${SANS_STACK}`;
  if (token === 'serif') return SERIF_STACK;
  if (token === 'mono') return MONO_STACK;
  return SANS_STACK;
}

export const STYLES: Record<DeckStyleId, DeckStyle> = {
  /* ─────────────────────────  1. BOLD  ─────────────────────────── */
  bold: {
    id: 'bold',
    name: 'Bold',
    description: 'High-impact, full-flood. Heavy display, oversized numerals, brand color dominates.',
    category: 'expressive',
    tag: 'BOLD',
    typography: {
      headingFamily: 'brand',
      bodyFamily: 'brand',
      headingWeight: 900,
      bodyWeight: 500,
      eyebrowWeight: 700,
      headingTracking: '-0.045em',
      bodyTracking: '0.005em',
      eyebrowTracking: '0.28em',
      eyebrowTransform: 'uppercase',
      headingScale: 1.15,
      bodyScale: 1.0,
    },
    spacing: { pad: 96, blockGap: 36, columnGap: 80, rule: 2 },
    color: { bgRole: 'brand', accentUsage: 'flood', tint: -0.05, mutedOpacity: 0.7 },
    chrome: {
      topBar: 'minimal',
      bottomBar: 'meta',
      cornerNumeral: 'oversized',
      pageRule: 'none',
      eyebrowCase: 'upper',
    },
    layout: { columns: 1, cardCorner: 16, bordering: 'none', proportions: 'asymmetric-left' },
    effect: { background: 'gradient', shadow: 'soft' },
  },

  /* ─────────────────────────  2. EDITORIAL  ─────────────────────── */
  editorial: {
    id: 'editorial',
    name: 'Editorial',
    description: 'Magazine, slow read. Serif headings, paper bg, generous whitespace, marginalia.',
    category: 'editorial',
    tag: 'EDITORIAL',
    typography: {
      headingFamily: 'serif',
      bodyFamily: 'sans',
      headingWeight: 500,
      bodyWeight: 400,
      eyebrowWeight: 600,
      headingTracking: '-0.015em',
      bodyTracking: '0.01em',
      eyebrowTracking: '0.22em',
      eyebrowTransform: 'uppercase',
      headingScale: 1.0,
      bodyScale: 1.0,
    },
    spacing: { pad: 120, blockGap: 48, columnGap: 96, rule: 1 },
    color: { bgRole: 'paper', accentUsage: 'sparingly', tint: 0, mutedOpacity: 0.55 },
    chrome: {
      topBar: 'tabular',
      bottomBar: 'meta',
      cornerNumeral: 'thin',
      pageRule: 'top-bottom',
      eyebrowCase: 'upper',
    },
    layout: { columns: 2, cardCorner: 0, bordering: 'inset', proportions: 'asymmetric-right' },
    effect: { background: 'flat', shadow: 'none' },
  },

  /* ─────────────────────────  3. MINIMAL  ───────────────────────── */
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Quiet luxury. Light weights, thin rules, single accent line, paper-on-paper.',
    category: 'editorial',
    tag: 'MINIMAL',
    typography: {
      headingFamily: 'sans',
      bodyFamily: 'sans',
      headingWeight: 300,
      bodyWeight: 300,
      eyebrowWeight: 500,
      headingTracking: '-0.02em',
      bodyTracking: '0.012em',
      eyebrowTracking: '0.32em',
      eyebrowTransform: 'uppercase',
      headingScale: 0.85,
      bodyScale: 0.95,
    },
    spacing: { pad: 160, blockGap: 56, columnGap: 120, rule: 1 },
    color: { bgRole: 'paper', accentUsage: 'sparingly', tint: 0.04, mutedOpacity: 0.4 },
    chrome: {
      topBar: 'minimal',
      bottomBar: 'page-num',
      cornerNumeral: 'thin',
      pageRule: 'top',
      eyebrowCase: 'upper',
    },
    layout: { columns: 1, cardCorner: 0, bordering: 'none', proportions: 'symmetric' },
    effect: { background: 'flat', shadow: 'none' },
  },

  /* ─────────────────────────  4. SWISS  ─────────────────────────── */
  swiss: {
    id: 'swiss',
    name: 'Swiss',
    description: 'Grid-locked, precise. Helvetica-style sans, baseline grid, small caps, exact alignment.',
    category: 'editorial',
    tag: 'SWISS GRID',
    typography: {
      headingFamily: 'sans',
      bodyFamily: 'sans',
      headingWeight: 700,
      bodyWeight: 500,
      eyebrowWeight: 700,
      headingTracking: '-0.03em',
      bodyTracking: '0',
      eyebrowTracking: '0.18em',
      eyebrowTransform: 'uppercase',
      headingScale: 1.0,
      bodyScale: 0.95,
    },
    spacing: { pad: 80, blockGap: 32, columnGap: 64, rule: 1 },
    color: { bgRole: 'paper', accentUsage: 'border', tint: 0, mutedOpacity: 0.6 },
    chrome: {
      topBar: 'tabular',
      bottomBar: 'meta',
      cornerNumeral: 'tabular',
      pageRule: 'top-bottom',
      eyebrowCase: 'upper',
    },
    layout: { columns: 3, cardCorner: 0, bordering: 'frame', proportions: 'symmetric' },
    effect: { background: 'grid', shadow: 'none' },
  },

  /* ─────────────────────────  5. BRUTALIST  ─────────────────────── */
  brutalist: {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Raw, anti-design. Mono fonts, hard borders, all-caps blocks, zero gradients.',
    category: 'expressive',
    tag: 'BRUT.',
    typography: {
      headingFamily: 'mono',
      bodyFamily: 'mono',
      headingWeight: 700,
      bodyWeight: 400,
      eyebrowWeight: 700,
      headingTransform: 'uppercase',
      headingTracking: '-0.02em',
      bodyTracking: '0',
      eyebrowTracking: '0.12em',
      eyebrowTransform: 'uppercase',
      headingScale: 0.92,
      bodyScale: 0.95,
    },
    spacing: { pad: 64, blockGap: 24, columnGap: 48, rule: 3 },
    color: { bgRole: 'paper', accentUsage: 'stripe', tint: 0, mutedOpacity: 0.7 },
    chrome: {
      topBar: 'numbered',
      bottomBar: 'meta',
      cornerNumeral: 'tabular',
      pageRule: 'top-bottom',
      eyebrowCase: 'upper',
    },
    layout: { columns: 2, cardCorner: 0, bordering: 'frame', proportions: 'symmetric' },
    effect: { background: 'flat', shadow: 'none' },
  },

  /* ─────────────────────────  6. MONOLITH  ──────────────────────── */
  monolith: {
    id: 'monolith',
    name: 'Monolith',
    description: 'Cinematic, dark. Black-dominant, single dramatic accent, oversized text, slow pace.',
    category: 'expressive',
    tag: 'MONOLITH',
    typography: {
      headingFamily: 'brand',
      bodyFamily: 'sans',
      headingWeight: 800,
      bodyWeight: 400,
      eyebrowWeight: 600,
      headingTracking: '-0.04em',
      bodyTracking: '0.012em',
      eyebrowTracking: '0.32em',
      eyebrowTransform: 'uppercase',
      headingScale: 1.25,
      bodyScale: 1.0,
    },
    spacing: { pad: 120, blockGap: 48, columnGap: 96, rule: 1 },
    color: { bgRole: 'ink', accentUsage: 'sparingly', tint: 0, mutedOpacity: 0.6 },
    chrome: {
      topBar: 'minimal',
      bottomBar: 'tagline',
      cornerNumeral: 'thin',
      pageRule: 'none',
      eyebrowCase: 'upper',
    },
    layout: { columns: 1, cardCorner: 0, bordering: 'none', proportions: 'symmetric' },
    effect: { background: 'gradient', shadow: 'soft' },
  },

  /* ─────────────────────────  7. TECHNICAL  ─────────────────────── */
  technical: {
    id: 'technical',
    name: 'Technical',
    description: 'Data-room, schematic. Mono labels, grid overlays, tabular numbers, annotations.',
    category: 'technical',
    tag: 'TECH·DOC',
    typography: {
      headingFamily: 'sans',
      bodyFamily: 'mono',
      headingWeight: 600,
      bodyWeight: 400,
      eyebrowWeight: 600,
      headingTracking: '-0.025em',
      bodyTracking: '0',
      eyebrowTracking: '0.16em',
      eyebrowTransform: 'uppercase',
      headingScale: 0.95,
      bodyScale: 0.9,
    },
    spacing: { pad: 80, blockGap: 28, columnGap: 60, rule: 1 },
    color: { bgRole: 'tinted-ink', accentUsage: 'border', tint: 0.04, mutedOpacity: 0.55 },
    chrome: {
      topBar: 'tabular',
      bottomBar: 'meta',
      cornerNumeral: 'tabular',
      pageRule: 'top-bottom',
      eyebrowCase: 'upper',
    },
    layout: { columns: 2, cardCorner: 4, bordering: 'frame', proportions: 'asymmetric-left' },
    effect: { background: 'grid', shadow: 'none' },
  },

  /* ─────────────────────────  8. MAGAZINE  ──────────────────────── */
  magazine: {
    id: 'magazine',
    name: 'Magazine',
    description: 'Mixed type, image-led. Serif + sans pairing, marginalia, photographic emphasis.',
    category: 'editorial',
    tag: 'ISSUE 01',
    typography: {
      headingFamily: 'serif',
      bodyFamily: 'sans',
      headingWeight: 700,
      bodyWeight: 400,
      eyebrowWeight: 700,
      headingTracking: '-0.02em',
      bodyTracking: '0.005em',
      eyebrowTracking: '0.2em',
      eyebrowTransform: 'uppercase',
      headingScale: 1.1,
      bodyScale: 0.95,
    },
    spacing: { pad: 96, blockGap: 40, columnGap: 80, rule: 2 },
    color: { bgRole: 'paper', accentUsage: 'flood', tint: 0, mutedOpacity: 0.55 },
    chrome: {
      topBar: 'tabular',
      bottomBar: 'tagline',
      cornerNumeral: 'oversized',
      pageRule: 'top-bottom',
      eyebrowCase: 'upper',
    },
    layout: { columns: 2, cardCorner: 0, bordering: 'inset', proportions: 'asymmetric-right' },
    effect: { background: 'flat', shadow: 'sharp' },
  },

  /* ─────────────────────────  9. PLAYFUL  ───────────────────────── */
  playful: {
    id: 'playful',
    name: 'Playful',
    description: 'Energetic, friendly. Rounded display, vibrant secondary, tilted compositions.',
    category: 'expressive',
    tag: 'HELLO!',
    typography: {
      headingFamily: 'brand',
      bodyFamily: 'brand',
      headingWeight: 800,
      bodyWeight: 500,
      eyebrowWeight: 700,
      headingTracking: '-0.025em',
      bodyTracking: '0.005em',
      eyebrowTracking: '0.18em',
      eyebrowTransform: 'uppercase',
      headingScale: 1.05,
      bodyScale: 1.0,
    },
    spacing: { pad: 96, blockGap: 32, columnGap: 64, rule: 2 },
    color: { bgRole: 'tinted-paper', accentUsage: 'flood', tint: 0.06, mutedOpacity: 0.65 },
    chrome: {
      topBar: 'minimal',
      bottomBar: 'tagline',
      cornerNumeral: 'oversized',
      pageRule: 'none',
      eyebrowCase: 'upper',
    },
    layout: { columns: 2, cardCorner: 28, bordering: 'none', proportions: 'asymmetric-left' },
    effect: { background: 'pattern', shadow: 'soft' },
  },

  /* ─────────────────────────  10. MODERN  ───────────────────────── */
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Clean SaaS. Inter sans, micro-spacing, flat surfaces, designed-for-screen.',
    category: 'modern',
    tag: 'MODERN',
    typography: {
      headingFamily: 'sans',
      bodyFamily: 'sans',
      headingWeight: 600,
      bodyWeight: 400,
      eyebrowWeight: 500,
      headingTracking: '-0.025em',
      bodyTracking: '0',
      eyebrowTracking: '0.14em',
      eyebrowTransform: 'uppercase',
      headingScale: 0.95,
      bodyScale: 0.95,
    },
    spacing: { pad: 96, blockGap: 32, columnGap: 64, rule: 1 },
    color: { bgRole: 'paper', accentUsage: 'border', tint: 0.02, mutedOpacity: 0.55 },
    chrome: {
      topBar: 'minimal',
      bottomBar: 'page-num',
      cornerNumeral: 'thin',
      pageRule: 'none',
      eyebrowCase: 'upper',
    },
    layout: { columns: 2, cardCorner: 16, bordering: 'inset', proportions: 'symmetric' },
    effect: { background: 'flat', shadow: 'soft' },
  },
};

export const STYLE_ORDER: DeckStyleId[] = [
  'bold',
  'editorial',
  'minimal',
  'swiss',
  'brutalist',
  'monolith',
  'technical',
  'magazine',
  'playful',
  'modern',
];

export const ALL_STYLES: DeckStyle[] = STYLE_ORDER.map((id) => STYLES[id]);

/** Pick a default style for a brand mode. */
export function defaultStyleForMode(
  mode: 'bold' | 'editorial' | 'technical' | 'elegant' | 'playful',
): DeckStyleId {
  switch (mode) {
    case 'bold':
      return 'bold';
    case 'editorial':
      return 'editorial';
    case 'technical':
      return 'technical';
    case 'elegant':
      return 'minimal';
    case 'playful':
      return 'playful';
  }
}
