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
// Generates a tiny SVG that visually approximates the template's
// first page — background fill + one or two stylized blocks for
// layers. Cheap (~500 bytes per thumbnail) and brand-agnostic
// because SlotRefs render as a generic stand-in color in the
// thumbnail (the live editor resolves them on open).

export function thumbnail(args: {
  width: number;
  height: number;
  bgFill: string; // hex; SlotRef bgs use the THUMB_PRIMARY stand-in
  accent?: string;
}): string {
  const { width, height, bgFill, accent } = args;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' preserveAspectRatio='xMidYMid slice'>
    <rect width='100%' height='100%' fill='${escapeAttr(bgFill)}'/>
    <rect x='${width * 0.08}' y='${height * 0.42}' width='${width * 0.55}' height='${height * 0.08}' rx='4' fill='${escapeAttr(accent ?? '#ffffff66')}'/>
    <rect x='${width * 0.08}' y='${height * 0.55}' width='${width * 0.7}' height='${height * 0.04}' rx='3' fill='${escapeAttr(accent ?? '#ffffff44')}'/>
    <rect x='${width * 0.08}' y='${height * 0.62}' width='${width * 0.4}' height='${height * 0.04}' rx='3' fill='${escapeAttr(accent ?? '#ffffff44')}'/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeAttr(s: string): string {
  return s.replace(/'/g, '&apos;').replace(/"/g, '&quot;');
}

/** Pick a thumbnail bg from a mood-themed BrandOSDocument page. */
export function thumbBgForMood(m: TemplateMood): string {
  // Stand-in colors used only in thumbnails (real render uses SlotRefs).
  switch (m) {
    case 'professional': return '#3b82f6';
    case 'bold': return '#1a1a2e';
    case 'minimal': return '#ffffff';
    case 'elegant': return '#0a0a0a';
    case 'playful': return '#f97316';
    case 'modern': return '#6366f1';
    case 'vintage': return '#c2410c';
    case 'natural': return '#16a34a';
    case 'tech': return '#0f172a';
    case 'maximalist': return '#ec4899';
  }
}

// Re-export for runtime call sites that need fresh ids on template
// open (the seed phase uses deterministic ids; the editor swaps in
// fresh uuids when applyBrandToDocument or duplicate flows run).
export { freshId };
