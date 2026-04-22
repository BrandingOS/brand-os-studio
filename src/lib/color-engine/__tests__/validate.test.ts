import { describe, it, expect } from 'vitest';
import { generateShades } from '../generateShades';
import { suggestNeutralScale, generateSemanticTokens } from '../roles';
import { suggestSemanticSeed } from '../semantic';
import { validatePalette } from '../validate';
import type { PaletteSystem, RolePaletteMap } from '../types';

function makePalette(primaryHex: string): PaletteSystem {
  const roles: RolePaletteMap = {
    primary: generateShades(primaryHex),
    secondary: null,
    tertiary: null,
    neutral: suggestNeutralScale(primaryHex),
    success: generateShades(suggestSemanticSeed(primaryHex, 'success')),
    warning: generateShades(suggestSemanticSeed(primaryHex, 'warning')),
    error: generateShades(suggestSemanticSeed(primaryHex, 'error')),
    info: generateShades(suggestSemanticSeed(primaryHex, 'info')),
  };
  return {
    id: 'test',
    name: 'Test palette',
    ownerId: null,
    brandId: null,
    visibility: 'private',
    sourceType: 'manual',
    seedColor: primaryHex,
    roles,
    semanticTokens: generateSemanticTokens(roles, 'light'),
    settings: {
      contrastStandard: 'WCAG',
      colorSpace: 'HEX',
      lockedShade: null,
      generationMode: 'auto',
    },
    chartColors: [],
    gradients: [],
    tags: [],
    publicSlug: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('validate', () => {
  it('reports no errors for a well-generated palette', () => {
    const palette = makePalette('#0ea5e9');
    const findings = validatePalette(palette);
    const errors = findings.filter((f) => f.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('flags duplicate chart colors', () => {
    const palette = makePalette('#0ea5e9');
    palette.semanticTokens.chart1 = '#abcdef';
    palette.semanticTokens.chart2 = '#abcdef';
    const findings = validatePalette(palette);
    expect(findings.some((f) => f.code === 'chart-duplicate')).toBe(true);
  });

  it('flags low-contrast text on surface', () => {
    const palette = makePalette('#0ea5e9');
    palette.semanticTokens.textPrimary = '#eeeeee';
    palette.semanticTokens.surface = '#ffffff';
    const findings = validatePalette(palette);
    expect(findings.some((f) => f.code.startsWith('contrast-fail'))).toBe(true);
  });

  it('flags low-visibility border', () => {
    const palette = makePalette('#0ea5e9');
    palette.semanticTokens.border = '#fefefe';
    palette.semanticTokens.surface = '#ffffff';
    const findings = validatePalette(palette);
    expect(findings.some((f) => f.code === 'border-low-contrast')).toBe(true);
  });
});
