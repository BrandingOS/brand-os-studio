// Phase 4.1 — composable layer/page builders for template seeds.
//
// Every template seed file imports these helpers; they enforce the
// SlotRef-for-brand-bound rule from Phase 3 (any color or font that
// the user expects to track the brand kit goes through `PRIMARY` /
// `HEADING_FONT` / etc., never an inlined hex).
//
// Mood variants are parameterized — same base layout produces a
// `professional` and a `bold` variant by swapping a few decisions
// (font weight, accent color choice, decorative shape opacity).

import type {
  BrandOSDocument,
  Layer,
  LogoLayer,
  Page,
  ResolvedValue,
  ShapeLayer,
  SlotRef,
  TextLayer,
} from '@/features/editor/schema';
import type { TemplateMood } from '../types';

// ─── SlotRef shorthands ────────────────────────────────────────────────

export const PRIMARY: SlotRef = { type: 'brand.color.primary' };
export const SECONDARY: SlotRef = { type: 'brand.color.secondary' };
export const ACCENT: SlotRef = { type: 'brand.color.accent' };
export const HEADING_FONT: SlotRef = { type: 'brand.font.heading' };
export const BODY_FONT: SlotRef = { type: 'brand.font.body' };
export const N_LIGHT: SlotRef = { type: 'brand.color.neutral', neutralIndex: 0 };
export const N_LIGHT_2: SlotRef = { type: 'brand.color.neutral', neutralIndex: 1 };
export const N_MID: SlotRef = { type: 'brand.color.neutral', neutralIndex: 3 };
export const N_DARK: SlotRef = { type: 'brand.color.neutral', neutralIndex: 5 };

// ─── Layer constructors ────────────────────────────────────────────────

interface BaseOpts {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
}

let __id = 0;
function newId(): string {
  // Deterministic-ish id for seeds (no randomness in build output).
  __id += 1;
  const n = __id.toString(16).padStart(12, '0');
  return `00000000-0000-0000-0000-${n}`;
}
function freshId(): string {
  // For runtime callers (when the template is opened) — uuid.
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : newId();
}

function base(opts: BaseOpts) {
  return {
    id: newId(),
    name: opts.name,
    transform: {
      x: opts.x, y: opts.y, width: opts.w, height: opts.h,
      rotation: opts.rotation ?? 0, scaleX: 1, scaleY: 1,
    },
    opacity: 1, visible: true, locked: false, brandLocked: false,
  };
}

export interface TextOpts extends BaseOpts {
  text: string;
  fontSize: number;
  fontWeight?: number;
  color?: ResolvedValue;
  fontFamily?: ResolvedValue;
  align?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  direction?: 'ltr' | 'rtl' | 'auto';
}
export function text(opts: TextOpts): TextLayer {
  return {
    ...base(opts),
    kind: 'text',
    text: opts.text,
    fontFamily: opts.fontFamily ?? BODY_FONT,
    fontSize: opts.fontSize,
    fontWeight: opts.fontWeight ?? 400,
    lineHeight: opts.lineHeight ?? 1.2,
    letterSpacing: opts.letterSpacing ?? 0,
    textAlign: opts.align ?? 'left',
    direction: opts.direction ?? 'ltr',
    color: opts.color ?? N_DARK,
  };
}

export interface RectOpts extends BaseOpts {
  fill?: ResolvedValue | null;
  stroke?: ResolvedValue | null;
  strokeWidth?: number;
  cornerRadius?: number;
  opacity?: number;
}
export function rect(opts: RectOpts): ShapeLayer {
  return {
    ...base(opts),
    opacity: opts.opacity ?? 1,
    kind: 'shape',
    shape: 'rectangle',
    fill: opts.fill ?? null,
    stroke: opts.stroke ?? null,
    strokeWidth: opts.strokeWidth ?? 0,
    cornerRadius: opts.cornerRadius ?? 0,
  };
}

export interface EllipseOpts extends BaseOpts {
  fill?: ResolvedValue | null;
  opacity?: number;
}
export function ellipse(opts: EllipseOpts): ShapeLayer {
  return {
    ...base(opts),
    opacity: opts.opacity ?? 1,
    kind: 'shape',
    shape: 'ellipse',
    fill: opts.fill ?? null,
    stroke: null,
    strokeWidth: 0,
    cornerRadius: 0,
  };
}

export function line(opts: BaseOpts & { stroke: ResolvedValue; strokeWidth?: number }): ShapeLayer {
  return {
    ...base(opts),
    kind: 'shape',
    shape: 'line',
    fill: null,
    stroke: opts.stroke,
    strokeWidth: opts.strokeWidth ?? 2,
    cornerRadius: 0,
  };
}

export function logo(opts: BaseOpts & { variant?: LogoLayer['variant'] }): LogoLayer {
  return {
    ...base(opts),
    kind: 'logo',
    variant: opts.variant ?? 'auto',
  };
}

// ─── Page + document ───────────────────────────────────────────────────

export function page(args: {
  width: number;
  height: number;
  background?: ResolvedValue;
  layers: Layer[];
  name?: string;
}): Page {
  return {
    id: newId(),
    name: args.name ?? 'Page 1',
    width: args.width,
    height: args.height,
    background: args.background ?? '#ffffff',
    masterPageId: null,
    layers: args.layers,
  };
}

export function doc(args: {
  contentType: string;
  pages: Page[];
}): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: newId(),
    contentType: args.contentType,
    brandId: null, // unbound; resolves to active brand on open
    masterPages: [],
    pages: args.pages,
    metadata: {},
  };
}

// ─── Mood-aware decisions ──────────────────────────────────────────────

export interface MoodChoices {
  /** Background color slot for hero pages. */
  heroBg: ResolvedValue;
  /** Background for body pages (often inverted from hero). */
  bodyBg: ResolvedValue;
  /** Headline color (on heroBg). */
  headlineColor: ResolvedValue;
  /** Body text color. */
  bodyColor: ResolvedValue;
  /** Accent color (CTA, dividers). */
  accentColor: ResolvedValue;
  /** Headline weight. */
  headlineWeight: number;
  /** Body weight. */
  bodyWeight: number;
  /** Decorative shape opacity. */
  decorOpacity: number;
}

const MOOD_PALETTE: Record<TemplateMood, MoodChoices> = {
  professional: {
    heroBg: PRIMARY, bodyBg: '#ffffff',
    headlineColor: N_LIGHT, bodyColor: N_DARK,
    accentColor: ACCENT, headlineWeight: 600, bodyWeight: 400, decorOpacity: 0.1,
  },
  bold: {
    heroBg: PRIMARY, bodyBg: PRIMARY,
    headlineColor: N_LIGHT, bodyColor: N_LIGHT,
    accentColor: ACCENT, headlineWeight: 800, bodyWeight: 500, decorOpacity: 0.25,
  },
  minimal: {
    heroBg: '#ffffff', bodyBg: '#ffffff',
    headlineColor: N_DARK, bodyColor: N_MID,
    accentColor: PRIMARY, headlineWeight: 500, bodyWeight: 400, decorOpacity: 0.06,
  },
  elegant: {
    heroBg: N_DARK, bodyBg: '#ffffff',
    headlineColor: N_LIGHT, bodyColor: N_DARK,
    accentColor: SECONDARY, headlineWeight: 400, bodyWeight: 300, decorOpacity: 0.12,
  },
  playful: {
    heroBg: ACCENT, bodyBg: '#ffffff',
    headlineColor: N_LIGHT, bodyColor: N_DARK,
    accentColor: SECONDARY, headlineWeight: 700, bodyWeight: 500, decorOpacity: 0.3,
  },
  modern: {
    heroBg: PRIMARY, bodyBg: '#ffffff',
    headlineColor: N_LIGHT, bodyColor: N_DARK,
    accentColor: SECONDARY, headlineWeight: 600, bodyWeight: 400, decorOpacity: 0.15,
  },
  vintage: {
    heroBg: SECONDARY, bodyBg: '#fbf6e9',
    headlineColor: N_DARK, bodyColor: N_DARK,
    accentColor: PRIMARY, headlineWeight: 700, bodyWeight: 400, decorOpacity: 0.18,
  },
  natural: {
    heroBg: SECONDARY, bodyBg: '#f6f4ee',
    headlineColor: N_DARK, bodyColor: N_DARK,
    accentColor: PRIMARY, headlineWeight: 500, bodyWeight: 400, decorOpacity: 0.2,
  },
  tech: {
    heroBg: N_DARK, bodyBg: '#0e0e12',
    headlineColor: N_LIGHT, bodyColor: N_LIGHT_2,
    accentColor: ACCENT, headlineWeight: 700, bodyWeight: 400, decorOpacity: 0.2,
  },
  maximalist: {
    heroBg: PRIMARY, bodyBg: ACCENT,
    headlineColor: N_LIGHT, bodyColor: N_LIGHT,
    accentColor: SECONDARY, headlineWeight: 800, bodyWeight: 600, decorOpacity: 0.4,
  },
};

export function moodChoices(m: TemplateMood): MoodChoices {
  return MOOD_PALETTE[m];
}

// ─── Thumbnail generator (data URI) ────────────────────────────────────
//
// Renders the template's first page as an SVG by walking its layers.
// SlotRefs resolve to a per-mood STAND-IN palette so each variant
// looks visually distinct (the live editor resolves them to the real
// brand kit on open). Output is still small enough to embed inline
// (~1–3 KB per thumbnail) but now actually represents the design.

interface ThumbPalette {
  primary: string;
  secondary: string;
  accent: string;
  neutralLightest: string;
  neutralLight: string;
  neutralMid: string;
  neutralDark: string;
  neutralDarkest: string;
  headingFont: string;
  bodyFont: string;
  /** Solid color used for the LOGO placeholder badge. */
  logoBg: string;
  logoFg: string;
}

const STAND_IN_PALETTES: Record<TemplateMood, ThumbPalette> = {
  professional: {
    primary: '#1d4ed8', secondary: '#0ea5e9', accent: '#f59e0b',
    neutralLightest: '#ffffff', neutralLight: '#f5f5f4', neutralMid: '#a8a29e',
    neutralDark: '#1f2937', neutralDarkest: '#0f172a',
    headingFont: 'Georgia, serif', bodyFont: 'system-ui, sans-serif',
    logoBg: '#ffffff', logoFg: '#1d4ed8',
  },
  bold: {
    primary: '#1a1a2e', secondary: '#dc2626', accent: '#fbbf24',
    neutralLightest: '#ffffff', neutralLight: '#f5f5f4', neutralMid: '#a8a29e',
    neutralDark: '#27272a', neutralDarkest: '#0a0a0a',
    headingFont: '"Helvetica Neue", system-ui, sans-serif', bodyFont: 'system-ui, sans-serif',
    logoBg: '#fbbf24', logoFg: '#1a1a2e',
  },
  minimal: {
    primary: '#000000', secondary: '#525252', accent: '#171717',
    neutralLightest: '#ffffff', neutralLight: '#fafafa', neutralMid: '#a3a3a3',
    neutralDark: '#404040', neutralDarkest: '#0a0a0a',
    headingFont: '"Inter", system-ui, sans-serif', bodyFont: '"Inter", system-ui, sans-serif',
    logoBg: '#000000', logoFg: '#ffffff',
  },
  elegant: {
    primary: '#1c1917', secondary: '#a16207', accent: '#d97706',
    neutralLightest: '#fbf6e9', neutralLight: '#f5e9c9', neutralMid: '#a8a29e',
    neutralDark: '#44403c', neutralDarkest: '#1c1917',
    headingFont: 'Garamond, "Times New Roman", serif', bodyFont: 'Garamond, serif',
    logoBg: '#1c1917', logoFg: '#fbf6e9',
  },
  playful: {
    primary: '#f97316', secondary: '#ec4899', accent: '#fde047',
    neutralLightest: '#ffffff', neutralLight: '#fff7ed', neutralMid: '#fdba74',
    neutralDark: '#7c2d12', neutralDarkest: '#431407',
    headingFont: '"Comic Sans MS", "Trebuchet MS", sans-serif', bodyFont: 'system-ui, sans-serif',
    logoBg: '#fde047', logoFg: '#7c2d12',
  },
  modern: {
    primary: '#6366f1', secondary: '#06b6d4', accent: '#f43f5e',
    neutralLightest: '#ffffff', neutralLight: '#f4f4f5', neutralMid: '#a1a1aa',
    neutralDark: '#27272a', neutralDarkest: '#09090b',
    headingFont: '"Inter", system-ui, sans-serif', bodyFont: '"Inter", system-ui, sans-serif',
    logoBg: '#ffffff', logoFg: '#6366f1',
  },
  vintage: {
    primary: '#c2410c', secondary: '#ca8a04', accent: '#15803d',
    neutralLightest: '#fbf6e9', neutralLight: '#f5e9c9', neutralMid: '#92400e',
    neutralDark: '#7c2d12', neutralDarkest: '#431407',
    headingFont: '"Playfair Display", Georgia, serif', bodyFont: 'Georgia, serif',
    logoBg: '#fbf6e9', logoFg: '#7c2d12',
  },
  natural: {
    primary: '#15803d', secondary: '#a16207', accent: '#84cc16',
    neutralLightest: '#f6f4ee', neutralLight: '#e7e5e4', neutralMid: '#78716c',
    neutralDark: '#3f3f46', neutralDarkest: '#1c1917',
    headingFont: 'Georgia, serif', bodyFont: 'system-ui, sans-serif',
    logoBg: '#f6f4ee', logoFg: '#15803d',
  },
  tech: {
    primary: '#0f172a', secondary: '#1e40af', accent: '#22d3ee',
    neutralLightest: '#e2e8f0', neutralLight: '#cbd5e1', neutralMid: '#475569',
    neutralDark: '#1e293b', neutralDarkest: '#020617',
    headingFont: '"JetBrains Mono", "Courier New", monospace', bodyFont: '"JetBrains Mono", monospace',
    logoBg: '#22d3ee', logoFg: '#0f172a',
  },
  maximalist: {
    primary: '#ec4899', secondary: '#a855f7', accent: '#22d3ee',
    neutralLightest: '#ffffff', neutralLight: '#fdf4ff', neutralMid: '#f472b6',
    neutralDark: '#831843', neutralDarkest: '#500724',
    headingFont: '"Impact", "Helvetica Neue", sans-serif', bodyFont: 'system-ui, sans-serif',
    logoBg: '#22d3ee', logoFg: '#831843',
  },
};

/**
 * Render a Page as a small SVG data URI. Walks layers and emits
 * `<text>`, `<rect>`, `<ellipse>`, `<line>`, and a logo badge per
 * `kind`. SlotRefs and font slots resolve through the mood's
 * stand-in palette.
 */
export function thumbnail(args: { page: Page; mood: TemplateMood }): string {
  const { page: pg, mood } = args;
  const pal = STAND_IN_PALETTES[mood];
  const { width: w, height: h } = pg;
  const bg = resolveColor(pg.background, pal, pal.neutralLightest);

  const layerSvg = pg.layers
    .filter((l) => l.visible !== false)
    .map((l) => renderLayer(l, pal))
    .filter(Boolean)
    .join('');

  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='xMidYMid slice'>` +
    `<rect width='100%' height='100%' fill='${escapeAttr(bg)}'/>` +
    layerSvg +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function renderLayer(layer: Layer, pal: ThumbPalette): string {
  if (layer.opacity === 0 || layer.visible === false) return '';
  const t = layer.transform;
  const op = layer.opacity != null && layer.opacity < 1 ? ` opacity='${layer.opacity}'` : '';
  const rot = t.rotation
    ? ` transform='rotate(${t.rotation} ${t.x + t.width / 2} ${t.y + t.height / 2})'`
    : '';

  switch (layer.kind) {
    case 'shape': {
      const fill = layer.fill != null ? resolveColor(layer.fill, pal, 'transparent') : 'none';
      const stroke = layer.stroke != null ? resolveColor(layer.stroke, pal, 'none') : 'none';
      const sw = layer.strokeWidth ?? 0;
      if (layer.shape === 'ellipse') {
        const cx = t.x + t.width / 2;
        const cy = t.y + t.height / 2;
        return `<ellipse cx='${cx}' cy='${cy}' rx='${t.width / 2}' ry='${t.height / 2}' fill='${escapeAttr(fill)}' stroke='${escapeAttr(stroke)}' stroke-width='${sw}'${op}${rot}/>`;
      }
      if (layer.shape === 'line') {
        return `<line x1='${t.x}' y1='${t.y + t.height / 2}' x2='${t.x + t.width}' y2='${t.y + t.height / 2}' stroke='${escapeAttr(stroke)}' stroke-width='${sw || 2}'${op}${rot}/>`;
      }
      const r = layer.cornerRadius ?? 0;
      return `<rect x='${t.x}' y='${t.y}' width='${t.width}' height='${t.height}' rx='${r}' ry='${r}' fill='${escapeAttr(fill)}' stroke='${escapeAttr(stroke)}' stroke-width='${sw}'${op}${rot}/>`;
    }
    case 'text': {
      const fill = resolveColor(layer.color, pal, pal.neutralDark);
      const family = resolveFont(layer.fontFamily, pal);
      const anchor =
        layer.textAlign === 'center' ? 'middle' :
        layer.textAlign === 'right' ? 'end' : 'start';
      const xText =
        layer.textAlign === 'center' ? t.x + t.width / 2 :
        layer.textAlign === 'right' ? t.x + t.width : t.x;
      const lh = layer.lineHeight ?? 1.2;
      const lines = String(layer.text ?? '').split('\n');
      const fontSize = layer.fontSize;
      // Approx baseline so text sits within its box.
      const baselineOffset = fontSize * 0.85;
      const tspans = lines
        .map((ln, i) =>
          `<tspan x='${xText}' dy='${i === 0 ? 0 : fontSize * lh}'>${escapeText(ln)}</tspan>`,
        )
        .join('');
      const ls = layer.letterSpacing ? ` letter-spacing='${layer.letterSpacing * fontSize * 0.5}'` : '';
      return (
        `<text x='${xText}' y='${t.y + baselineOffset}' fill='${escapeAttr(fill)}' ` +
        `font-family='${escapeAttr(family)}' font-size='${fontSize}' font-weight='${layer.fontWeight ?? 400}' ` +
        `text-anchor='${anchor}'${ls}${op}${rot}>${tspans}</text>`
      );
    }
    case 'logo': {
      // Brand-agnostic placeholder: rounded square in the mood's
      // logoBg with "LOGO" wordmark in logoFg. Real editor swaps
      // in the actual logo on open.
      const bg = pal.logoBg;
      const fg = pal.logoFg;
      const r = Math.min(t.width, t.height) * 0.12;
      const fs = Math.min(t.width / 4.2, t.height * 0.45);
      return (
        `<g${op}${rot}>` +
        `<rect x='${t.x}' y='${t.y}' width='${t.width}' height='${t.height}' rx='${r}' ry='${r}' fill='${escapeAttr(bg)}'/>` +
        `<text x='${t.x + t.width / 2}' y='${t.y + t.height / 2 + fs * 0.32}' fill='${escapeAttr(fg)}' ` +
        `font-family='system-ui, sans-serif' font-size='${fs}' font-weight='800' text-anchor='middle' letter-spacing='${fs * 0.04}'>LOGO</text>` +
        `</g>`
      );
    }
    case 'image':
    case 'svg': {
      // Render as a neutral framed placeholder — no real image
      // resolution at thumbnail time.
      return `<rect x='${t.x}' y='${t.y}' width='${t.width}' height='${t.height}' fill='${escapeAttr(pal.neutralLight)}' stroke='${escapeAttr(pal.neutralMid)}' stroke-width='2'${op}${rot}/>`;
    }
    case 'group': {
      const inner = layer.children.map((c) => renderLayer(c, pal)).join('');
      return `<g${op}${rot}>${inner}</g>`;
    }
  }
  return '';
}

function resolveColor(v: ResolvedValue | null | undefined, pal: ThumbPalette, fallback: string): string {
  if (v == null) return fallback;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return fallback;
  // SlotRef
  switch (v.type) {
    case 'brand.color.primary': return pal.primary;
    case 'brand.color.secondary': return pal.secondary;
    case 'brand.color.accent': return pal.accent;
    case 'brand.color.neutral': {
      const idx = (v as { neutralIndex?: number }).neutralIndex ?? 0;
      if (idx <= 0) return pal.neutralLightest;
      if (idx === 1) return pal.neutralLight;
      if (idx <= 3) return pal.neutralMid;
      if (idx === 4) return pal.neutralDark;
      return pal.neutralDarkest;
    }
    default: return fallback;
  }
}

function resolveFont(v: ResolvedValue | null | undefined, pal: ThumbPalette): string {
  if (v == null) return pal.bodyFont;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return pal.bodyFont;
  if (v.type === 'brand.font.heading') return pal.headingFont;
  if (v.type === 'brand.font.body') return pal.bodyFont;
  return pal.bodyFont;
}

function escapeAttr(s: string): string {
  return s.replace(/'/g, '&apos;').replace(/"/g, '&quot;');
}
function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Pick a thumbnail bg from a mood-themed BrandOSDocument page. Kept
 * for back-compat callers that still use the legacy bgFill API
 * (currently only PROMPT_PRESET_TEMPLATES via its own gradient SVG).
 */
export function thumbBgForMood(m: TemplateMood): string {
  return STAND_IN_PALETTES[m].primary;
}

// Re-export for runtime call sites that need fresh ids on template
// open (the seed phase uses deterministic ids; the editor swaps in
// fresh uuids when applyBrandToDocument or duplicate flows run).
export { freshId };
