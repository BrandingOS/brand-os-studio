// src/shared/presentation/theme/types.ts

export type DeckKind = 'pitch-deck' | 'case-study' | 'logo-presentation';

export type DeckDensity = 'compact' | 'comfortable' | 'spacious';

export type DeckBgKind = 'solid' | 'gradient' | 'pattern';

export type DeckRadiusKind = 'sharp' | 'soft' | 'pill';

export type DeckShadowKind = 'none' | 'soft' | 'lifted';

export type DeckLogoPlacement = 'tl' | 'tr' | 'bl' | 'br' | 'hidden';

/**
 * Typography roles exposed in the deck Customize sidebar. One row per
 * role; each row is independently editable. Order matches how the
 * Master slide renders the specimen list.
 */
export type DeckTypeRole =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'caption'
  | 'label';

export const DECK_TYPE_ROLES: readonly DeckTypeRole[] = [
  'display',
  'h1',
  'h2',
  'h3',
  'h4',
  'body',
  'caption',
  'label',
] as const;

export const ROLE_LABEL: Record<DeckTypeRole, string> = {
  display: 'Display',
  h1: 'H1 — page title',
  h2: 'H2 — section title',
  h3: 'H3 — subhead',
  h4: 'H4 — small title',
  body: 'Body — paragraph',
  caption: 'Caption — small text',
  label: 'Label — overline / tag',
};

/**
 * Override for a single typography role. Every field is optional —
 * an undefined field falls back to the brand typescale value, or to
 * the deck's built-in role default if the brand doesn't define one.
 */
export interface RoleStyle {
  /** CSS font-family string. Undefined → inherit brand. */
  font?: string;
  /** Explicit pixel size. Undefined → use brand size for role. */
  sizePx?: number;
  /** Numeric weight (300–800). */
  weight?: number;
  /** Unitless line-height multiplier. */
  lineHeight?: number;
  /** Hex color. */
  color?: string;
}

export interface PresentationTheme {
  typography: {
    /** Per-role overrides. Each row in the Customize sidebar writes here. */
    roles: Partial<Record<DeckTypeRole, RoleStyle>>;
  };
  colors: {
    /** Page background. */
    bg?: string;
    /** Card / surface background. */
    cardBg?: string;
    /** Brand accent / CTA. */
    accent?: string;
  };
  density: DeckDensity;
  style: {
    bgKind: DeckBgKind;
    borderRadius: DeckRadiusKind;
    shadow: DeckShadowKind;
    logoPlacement: DeckLogoPlacement;
  };
}

export const EMPTY_THEME: PresentationTheme = {
  typography: { roles: {} },
  colors: {},
  density: 'comfortable',
  style: {
    bgKind: 'solid',
    borderRadius: 'soft',
    shadow: 'soft',
    logoPlacement: 'tl',
  },
};

/**
 * Coerces any object (including the legacy flat-typography shape that
 * pre-existing brands may have saved in `brand.presentationThemes`)
 * into the current `PresentationTheme` shape. Always returns a value
 * with `typography.roles` present so consumers can safely read it.
 */
export function normalizeTheme(input: unknown): PresentationTheme {
  if (!input || typeof input !== 'object') return EMPTY_THEME;
  const raw = input as Record<string, unknown>;
  const typoIn = (raw.typography ?? {}) as Record<string, unknown>;
  const colorsIn = (raw.colors ?? {}) as Record<string, unknown>;
  const styleIn = (raw.style ?? {}) as Record<string, unknown>;

  // Drop legacy color text fields (heading/body moved into per-role
  // typography). Drop unknown keys silently.
  const colors: PresentationTheme['colors'] = {};
  if (typeof colorsIn.bg === 'string')     colors.bg = colorsIn.bg;
  if (typeof colorsIn.cardBg === 'string') colors.cardBg = colorsIn.cardBg;
  if (typeof colorsIn.accent === 'string') colors.accent = colorsIn.accent;

  const allowedDensity: PresentationTheme['density'][] = ['compact', 'comfortable', 'spacious'];

  return {
    typography: {
      roles: (typoIn.roles && typeof typoIn.roles === 'object')
        ? (typoIn.roles as PresentationTheme['typography']['roles'])
        : {},
    },
    colors,
    density: allowedDensity.includes(raw.density as PresentationTheme['density'])
      ? (raw.density as PresentationTheme['density'])
      : 'comfortable',
    style: {
      bgKind: (styleIn.bgKind as PresentationTheme['style']['bgKind']) ?? 'solid',
      borderRadius: (styleIn.borderRadius as PresentationTheme['style']['borderRadius']) ?? 'soft',
      shadow: (styleIn.shadow as PresentationTheme['style']['shadow']) ?? 'soft',
      logoPlacement: (styleIn.logoPlacement as PresentationTheme['style']['logoPlacement']) ?? 'tl',
    },
  };
}
