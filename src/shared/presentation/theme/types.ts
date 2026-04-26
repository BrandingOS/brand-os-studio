// src/shared/presentation/theme/types.ts

export type DeckKind = 'pitch-deck' | 'case-study' | 'logo-presentation';

export type DeckDensity = 'compact' | 'comfortable' | 'spacious';

export type DeckBgKind = 'solid' | 'gradient' | 'pattern';

export type DeckRadiusKind = 'sharp' | 'soft' | 'pill';

export type DeckShadowKind = 'none' | 'soft' | 'lifted';

export type DeckLogoPlacement = 'tl' | 'tr' | 'bl' | 'br' | 'hidden';

export interface PresentationTheme {
  typography: {
    headingFont?: string;        // CSS font-family string. undefined → fall back to brand.typescale.fonts.heading
    bodyFont?: string;
    scaleMultiplier: number;     // 1.0 default; clamped [0.85 .. 1.25]
    leadingMultiplier: number;   // 1.0 default; clamped [0.90 .. 1.20]
    headingWeight?: number;      // 300 | 400 | 500 | 600 | 700 | 800
    bodyWeight?: number;
  };
  colors: {
    bg?: string;
    heading?: string;
    body?: string;
    accent?: string;
    cardBg?: string;
    gradientEnd?: string;        // only meaningful when style.bgKind === 'gradient'
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
  typography: { scaleMultiplier: 1, leadingMultiplier: 1 },
  colors: {},
  density: 'comfortable',
  style: {
    bgKind: 'solid',
    borderRadius: 'soft',
    shadow: 'soft',
    logoPlacement: 'tl',
  },
};
