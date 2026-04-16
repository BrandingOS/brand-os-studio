import type { BrandContext } from '@/shared/services/mockup/registry';
import type { Brief } from '../state/types';

// Builds a minimal BrandContext from the store's Brief + edited SVG.
// In Phase 3 this will be enriched with AI-suggested palettes; in Phase 9 it
// will merge with the canonical Brand record from Supabase.

export interface PaletteSuggestion {
  primary: string;
  secondary: string;
  accents: string[];
  neutrals: {
    darkest: string;
    dark: string;
    mid: string;
    light: string;
    lightest: string;
  };
}

// Pragmatic default palette — modern, versatile, passes AA contrast in both
// directions. Replaced in Phase 3 by real AI suggestions.
export const DEFAULT_PALETTE: PaletteSuggestion = {
  primary: '#2563EB',
  secondary: '#0F172A',
  accents: ['#10B981', '#F59E0B'],
  neutrals: {
    darkest: '#0F172A',
    dark: '#334155',
    mid: '#64748B',
    light: '#CBD5E1',
    lightest: '#F8FAFC',
  },
};

export const DEFAULT_TYPOGRAPHY = {
  heading: { family: 'Space Grotesk, sans-serif', weights: [500, 700] },
  body: { family: 'Inter, sans-serif', weights: [400, 500, 700] },
  mono: { family: 'JetBrains Mono, monospace', weights: [400] },
};

export function buildContext(
  brief: Brief,
  editedSVG: string | null,
  palette: PaletteSuggestion = DEFAULT_PALETTE,
): BrandContext {
  return {
    brandName: brief.name || 'Your brand',
    tagline: brief.tagline || undefined,
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    accentColor: palette.accents[0],
    logoSVG: editedSVG,
    fontFamily: DEFAULT_TYPOGRAPHY.body.family,
    displayFontFamily: DEFAULT_TYPOGRAPHY.heading.family,
  };
}
