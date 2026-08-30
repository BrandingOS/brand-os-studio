/**
 * The ONE place a Brand Kit renderer gets its styling from.
 *
 * Before this module existed, every renderer answered "what typeface does
 * this brand use?" and "what colour does this surface take?" for itself —
 * `.audit/CODE.md` §7 counted zero renderers reading `brand.typography`,
 * eleven hardcoding `fontFamily: 'Caveat, cursive'`, ~1,140 hex literals
 * and exactly one WCAG-aware check across 31 files. The brand only
 * appeared on screen at all because the editor injected a global
 * `!important` font override, which is why exports came out in the wrong
 * typeface: an export has no editor around it.
 *
 * Every function here is PURE and total. A renderer may call them during
 * render, inside an offscreen export, or from a test, and gets the same
 * answer. Nothing here reads the DOM, a store, or a service.
 *
 * ## What a renderer is handed
 *
 * `renderCosmosTemplate(template, brand, mockBrand, content)` passes a
 * canonical `Brand` and — for brand-asset families — a `MockBrand` (the
 * Setup-shaped projection). Either is a valid source here:
 *
 *   • A canonical `Brand` is the full answer. `surface()` goes through
 *     `buildBrandPalette` / `pickSurfaceTokens`, and `logoOn()` through
 *     `pickLogoOnBackground`.
 *   • A `MockBrand` carries colours and typefaces but NO asset library,
 *     so it is projected onto a minimal canonical shape (`core[0]` →
 *     primary, `core[1]` → secondary, `accent[0]` → accent, `grey[]` →
 *     neutrals) and run through the same palette builder. That keeps ONE
 *     surface algorithm rather than a second one for Setup data. The one
 *     thing the projection cannot recover is the logo system: a MockBrand
 *     holds inline SVG strings, not `BrandAsset` records, so `logoOn()`
 *     answers `undefined` for a MockBrand-only call and the caller draws
 *     its letter mark — the documented last resort, never an earlier one.
 *
 * ## The rules this module exists to keep
 *
 *   • Never write `bg.luminance > 0.5 ? black : white`. Use `fgOn`.
 *   • Never pick a logo by tone. Use `logoOn`.
 *   • Never hardcode a font family in a renderer. Use `fontStack`.
 *   • Never hand-pair a background and a text colour. Use `surface`.
 *
 * Pure white and pure black remain legitimate in a renderer ONLY as the
 * output of `fgOn` — i.e. chosen for contrast, not typed in.
 */
import type { Brand } from '@/shared/types/brand';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { ResolvedLogo } from '@/shared/hooks/useBrandLogo';
import {
  surfacePalette,
  type SurfaceKind,
  type SurfaceTokens,
} from '@/shared/brand/brandPalette';
import {
  contrastRatio,
  pickFgOnBackground,
  pickLogoOnBackground,
} from '@/shared/brand/logoOnBackground';

export type { SurfaceKind, SurfaceTokens };

/** Anything a renderer is actually handed. */
export type BrandStyleSource = Brand | MockBrand | null | undefined;

/** The three jobs type does on a deliverable. */
export type FontRole = 'heading' | 'body' | 'mono';

/** The brand's colours, normalised — see `brandColors`. */
export type BrandColors = {
  primary: string;
  secondary: string;
  accent: string[];
  neutrals: string[];
};

/* ── Hex normalisation ────────────────────────────────────────────── */

/**
 * `#rgb` / `RRGGBB` / `#RRGGBB` → lowercase `#rrggbb`, or `undefined`.
 *
 * Every colour that leaves this module is normalised, because the WCAG
 * helpers in `logoOnBackground` only parse the six-digit form — a `#fff`
 * read straight off a brand record scores as BLACK there, which silently
 * inverts every contrast decision made from it.
 */
export function normalizeHex(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.toLowerCase().split('').map((c) => c + c).join('')}`;
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`;
  return undefined;
}

function hexOr(value: string | null | undefined, fallback: string): string {
  return normalizeHex(value) ?? fallback;
}

/** Neutral last resorts. Only ever reached by a brand with no colour at all. */
const FALLBACK_PRIMARY = '#111113';
const FALLBACK_SECONDARY = '#5b5b62';

/* ── Which shape is this? ─────────────────────────────────────────── */

/**
 * A MockBrand is recognised by its `colors: { core, accent, grey }` —
 * the one field whose SHAPE differs from the canonical brand, where
 * colour lives under `colorSystem`.
 */
export function isMockBrand(source: BrandStyleSource): source is MockBrand {
  if (!source) return false;
  const colors = (source as MockBrand).colors;
  return Boolean(colors && Array.isArray(colors.core));
}

/**
 * Project a MockBrand onto the minimal canonical shape the shared brand
 * helpers read, so both sources go through ONE palette algorithm.
 *
 * Deliberately partial: `buildBrandPalette` reads only `colorSystem`,
 * `primaryColor` and `secondaryColor`, and the projection supplies all
 * three. It supplies no `logoSystem` / `brandAssets`, which is what makes
 * `logoOn` honestly answer `undefined` rather than guess.
 */
function asCanonicalBrand(source: BrandStyleSource): Brand | undefined {
  if (!source) return undefined;
  if (!isMockBrand(source)) return source;
  const c = brandColors(source);
  return {
    id: 'mock',
    slug: 'mock',
    name: source.name,
    primaryColor: c.primary,
    secondaryColor: c.secondary,
    colorSystem: {
      primary: { hex: c.primary },
      secondary: { hex: c.secondary },
      ...(c.accent[0] ? { accent: { hex: c.accent[0] } } : {}),
      neutrals: c.neutrals.map((hex) => ({ hex })),
    },
    fonts: { primary: fontFamilyFor(source, 'heading') ?? 'Inter' },
    assets: [],
  } as unknown as Brand;
}

/* ── Colours ──────────────────────────────────────────────────────── */

/**
 * The brand's own colours, normalised and de-duplicated.
 *
 * `accent` and `neutrals` are ARRAYS because a brand has as many as it
 * has — a renderer that wants "the second accent" must be able to ask,
 * rather than reaching into `colorSystem` and coping with the four places
 * a colour can live (canonical system, legacy scalars, `brand.neutrals`,
 * MockBrand's three buckets).
 *
 * A MockBrand's `core` is ordered primary · secondary · everything else,
 * which is the order Setup writes it in.
 */
export function brandColors(source: BrandStyleSource): BrandColors {
  if (!source) {
    return { primary: FALLBACK_PRIMARY, secondary: FALLBACK_SECONDARY, accent: [], neutrals: [] };
  }

  if (isMockBrand(source)) {
    const core = source.colors.core.map((c) => normalizeHex(c.hex)).filter(isHex);
    const accent = source.colors.accent.map((c) => normalizeHex(c.hex)).filter(isHex);
    const grey = source.colors.grey.map((c) => normalizeHex(c.hex)).filter(isHex);
    return {
      primary: core[0] ?? FALLBACK_PRIMARY,
      secondary: core[1] ?? FALLBACK_SECONDARY,
      accent: unique([...core.slice(2), ...accent]),
      neutrals: unique(grey),
    };
  }

  const cs = source.colorSystem;
  const primary = hexOr(cs?.primary?.hex ?? source.primaryColor, FALLBACK_PRIMARY);
  const secondary = hexOr(cs?.secondary?.hex ?? source.secondaryColor, FALLBACK_SECONDARY);
  const accent = unique(
    [cs?.accent?.hex, source.accentColor].map(normalizeHex).filter(isHex),
  );
  const neutrals = unique(
    [
      ...(cs?.neutrals ?? []).map((n) => n?.hex),
      ...(source.neutrals ?? []),
    ]
      .map(normalizeHex)
      .filter(isHex),
  );
  return { primary, secondary, accent, neutrals };
}

function isHex(v: string | undefined): v is string {
  return typeof v === 'string';
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

/* ── Surfaces ─────────────────────────────────────────────────────── */

/**
 * The guaranteed-readable `{ bg, text, textMuted, border, accent }` bundle
 * for one surface of a deliverable.
 *
 * This is `surfacePalette` — the project-wide role system — with the
 * MockBrand projection in front of it, so a renderer never has to know
 * which shape it was handed. Ask by KIND ('card', 'brand', 'inverted'…),
 * never by colour.
 */
export function surface(
  source: BrandStyleSource,
  kind: SurfaceKind,
  mode: 'light' | 'dark' = 'light',
): SurfaceTokens {
  const tokens = surfacePalette(asCanonicalBrand(source), kind, mode);
  // Normalised on the way out. The 'brand' surfaces hand back the brand's
  // OWN hex verbatim, so a record holding `#FFF` would arrive here in the
  // three-digit form — and a three-digit hex scores as BLACK in
  // `contrastRatio`. A renderer measuring its own surface must not be
  // handed a value that measures wrong.
  return {
    bg: normalizeHex(tokens.bg) ?? tokens.bg,
    text: normalizeHex(tokens.text) ?? tokens.text,
    textMuted: normalizeHex(tokens.textMuted) ?? tokens.textMuted,
    border: normalizeHex(tokens.border) ?? tokens.border,
    accent: normalizeHex(tokens.accent) ?? tokens.accent,
  };
}

/* ── Foreground / logo on a background ────────────────────────────── */

/**
 * The most readable foreground for a background.
 *
 * Defaults to black-or-white, which is what a renderer nearly always
 * wants; pass `candidates` to restrict it to colours the brand owns.
 * A background that does not parse falls back to black, because an
 * unreadable answer is worse than a conservative one.
 */
export function fgOn(bgHex: string, candidates: string[] = ['#ffffff', '#000000']): string {
  const bg = normalizeHex(bgHex);
  if (!bg) return '#000000';
  const usable = candidates.map(normalizeHex).filter(isHex);
  return pickFgOnBackground(bg, usable.length > 0 ? usable : ['#ffffff', '#000000']);
}

/**
 * The logo variant that READS on this background — never the one whose
 * tone merely matches.
 *
 * `undefined` means the brand has no variant that clears the readability
 * floor on this ground (or the source is a MockBrand, which carries no
 * asset library). The caller draws a letter mark; it must not fall back
 * to "the primary anyway", which is the invisible-logo bug this whole
 * module exists to stop.
 */
export function logoOn(source: BrandStyleSource, bgHex: string): ResolvedLogo | undefined {
  if (!source || isMockBrand(source)) return undefined;
  const bg = normalizeHex(bgHex);
  if (!bg) return undefined;
  return pickLogoOnBackground(source, bg);
}

/* ── Contrast ─────────────────────────────────────────────────────── */

/**
 * WCAG AA: 4.5:1 for body text, 3:1 for large text (≥ 24px, or ≥ 18.66px
 * bold). The guard sweep in `__guards__/contrast.ts` uses the same
 * thresholds, so a renderer that checks with this cannot fail there.
 */
export function contrastOk(fgHex: string, bgHex: string, large = false): boolean {
  const fg = normalizeHex(fgHex);
  const bg = normalizeHex(bgHex);
  if (!fg || !bg) return false;
  return contrastRatio(fg, bg) >= (large ? 3 : 4.5);
}

/** The raw ratio, for a renderer that needs to RANK rather than gate. */
export function contrastOf(fgHex: string, bgHex: string): number {
  const fg = normalizeHex(fgHex);
  const bg = normalizeHex(bgHex);
  if (!fg || !bg) return 1;
  return contrastRatio(fg, bg);
}

/* ── Typefaces ────────────────────────────────────────────────────── */

/**
 * Generic ladders. These are the LAST entries of a stack — the browser's
 * own fallback when neither an uploaded file nor Google Fonts resolved.
 * They are not a brand decision and never appear alone unless the brand
 * genuinely names no typeface.
 */
const GENERIC: Record<'sans' | 'serif' | 'mono' | 'cursive', string> = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
  cursive: 'cursive',
};

/**
 * Which generic ladder a family belongs to, by NAME.
 *
 * A family name is the only signal available offline — `fonts.ts` loads
 * files and `googleFonts.ts` is a flat name list with no category column —
 * and the order of these tests is load-bearing: "Sans" must be decided
 * before "Serif", or every `… Sans Serif` family lands on Georgia.
 */
function genericFor(family: string): keyof typeof GENERIC {
  const f = family.toLowerCase();
  if (/\b(mono|code|courier|consol)/.test(f)) return 'mono';
  if (/\bsans\b|sans-/.test(f)) return 'sans';
  if (/script|hand|caveat|brush|cursive|signature/.test(f)) return 'cursive';
  if (
    /serif|slab|garamond|georgia|times|playfair|baskerville|didot|bodoni|caslon|merriweather|lora|spectral|cormorant|freight|tiempos|canela|recoleta/.test(
      f,
    )
  ) {
    return 'serif';
  }
  return 'sans';
}

/** Quote a family only when CSS requires it. */
function cssFamily(family: string): string {
  const name = family.trim().replace(/^['"]|['"]$/g, '');
  return /^[A-Za-z][A-Za-z0-9-]*$/.test(name) ? name : `'${name}'`;
}

/** The family a role resolves to on this source, or undefined. */
function fontFamilyFor(source: BrandStyleSource, role: FontRole): string | undefined {
  if (!source) return undefined;

  if (isMockBrand(source)) {
    const byRole = (re: RegExp) =>
      source.fonts.find((f) => re.test(f.role ?? '') || re.test(f.family ?? ''));
    if (role === 'mono') return byRole(/mono|code/i)?.family;
    if (role === 'heading') {
      return (byRole(/display|head|title|primary/i) ?? source.fonts[0])?.family;
    }
    return (byRole(/text|body|para|secondary/i) ?? source.fonts[1] ?? source.fonts[0])?.family;
  }

  const t = source.typography;
  if (role === 'mono') {
    // No canonical mono slot exists. An `accent` face counts only when it
    // reads as one — inventing a mono from a display face is worse than
    // handing back the generic ladder.
    const accent = t?.accent?.family;
    return accent && genericFor(accent) === 'mono' ? accent : undefined;
  }
  if (role === 'heading') return t?.primary?.family ?? source.fonts?.primary ?? undefined;
  return (
    t?.secondary?.family ?? source.fonts?.secondary ?? t?.primary?.family ?? source.fonts?.primary
  );
}

/** Fallbacks the brand DECLARED for a role, ahead of the generic ladder. */
function declaredFallbacks(source: BrandStyleSource, role: FontRole): string[] {
  if (!source || role === 'mono') return [];
  if (isMockBrand(source)) {
    const family = fontFamilyFor(source, role);
    const font = source.fonts.find((f) => f.family === family);
    return font?.fallback ? [font.fallback] : [];
  }
  const t = source.typography;
  const token = role === 'heading' ? t?.primary : (t?.secondary ?? t?.primary);
  return token?.fallbacks ?? [];
}

/**
 * The brand's typeface for a role, as a complete CSS `font-family` value.
 *
 * ALWAYS use this in a renderer. A bare family name renders as the
 * browser default the moment the font has not loaded — which is every
 * offscreen export, and every first paint — and a hardcoded family
 * renders as somebody else's brand for ever.
 *
 *   fontStack(brand, 'heading') → "'Instrument Serif', Georgia, 'Times New Roman', Times, serif"
 *   fontStack(null, 'body')     → the generic sans ladder
 */
export function fontStack(source: BrandStyleSource, role: FontRole = 'body'): string {
  const family = fontFamilyFor(source, role);
  if (!family) return GENERIC[role === 'mono' ? 'mono' : 'sans'];
  const generic = role === 'mono' ? 'mono' : genericFor(family);
  const declared = declaredFallbacks(source, role)
    .map((f) => f.trim())
    .filter(Boolean)
    .map(cssFamily);
  return [cssFamily(family), ...declared, GENERIC[generic]].join(', ');
}

/** The bare family name for a role — for a label, never for `fontFamily`. */
export function fontFamily(source: BrandStyleSource, role: FontRole = 'body'): string | undefined {
  return fontFamilyFor(source, role);
}
