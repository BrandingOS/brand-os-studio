import { describe, expect, it } from 'vitest';

import type { Brand } from '@/shared/types/brand';
import { brandToMockBrand, looksLikeAName } from './brandToMockBrand';

function brand(patch: Partial<Brand> = {}): Brand {
  return {
    id: 'b1',
    slug: 'acme',
    name: 'Acme',
    primaryColor: '#FF0000',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...patch,
  } as Brand;
}

const hexes = (list: Array<{ hex: string }>) => list.map((c) => c.hex);

describe('brandToMockBrand — colors', () => {
  it('carries the accent through from the canonical colorSystem.accent', () => {
    const mock = brandToMockBrand(
      brand({ colorSystem: { primary: { hex: '#FF0000' }, accent: { hex: '#00AAFF' } } as never }),
    );
    expect(hexes(mock.colors.accent)).toContain('#00AAFF');
  });

  it('carries the legacy accentColor field', () => {
    const mock = brandToMockBrand(brand({ accentColor: '#123456' } as never));
    expect(hexes(mock.colors.accent)).toContain('#123456');
  });

  it('puts extra uploaded swatches in Core, never in Accent', () => {
    const mock = brandToMockBrand(brand({ neutrals: ['#0A9F6E', '#F0A500'] } as never));
    expect(hexes(mock.colors.core)).toEqual(expect.arrayContaining(['#0A9F6E', '#F0A500']));
    expect(mock.colors.accent).toHaveLength(0);
  });

  it('hydrates extra swatches stored in colorSystem.neutrals (Supabase path)', () => {
    const mock = brandToMockBrand(
      brand({
        colorSystem: {
          primary: { hex: '#FF0000' },
          neutrals: [{ hex: '#0A9F6E' }],
        } as never,
      }),
    );
    expect(hexes(mock.colors.core)).toContain('#0A9F6E');
    expect(mock.colors.accent).toHaveLength(0);
  });

  it('keeps the Neutral ramp intact when the brand stores a whole grey ramp', () => {
    // Regression: a brand carrying 32 generated greys used to dump all of
    // them into Core and leave Neutral Colors empty.
    const ramp = Array.from({ length: 32 }, (_, i) => {
      const v = Math.round((i / 31) * 255).toString(16).padStart(2, '0').toUpperCase();
      return `#${v}${v}${v}`;
    });
    const mock = brandToMockBrand(brand({ neutrals: ramp } as never));
    expect(mock.colors.grey).toHaveLength(32);
    // Core stays a palette, not a gradient strip.
    expect(mock.colors.core.length).toBeLessThanOrEqual(9);
  });

  it('keeps ramp steps that collide with the brand’s own colors', () => {
    const mock = brandToMockBrand(brand({ primaryColor: '#000000', secondaryColor: '#FFFFFF' }));
    expect(mock.colors.grey.map((c) => c.hex)).toEqual(
      expect.arrayContaining(['#000000', '#FFFFFF']),
    );
  });

  it('shows an accent only once the user assigns one', () => {
    const none = brandToMockBrand(brand({ neutrals: ['#0A9F6E'] } as never));
    expect(none.colors.accent).toHaveLength(0);
    const assigned = brandToMockBrand(brand({ accentColor: '#123456' } as never));
    expect(hexes(assigned.colors.accent)).toEqual(['#123456']);
  });

  it('keeps primary and secondary in core', () => {
    const mock = brandToMockBrand(brand({ secondaryColor: '#00FF00' }));
    expect(hexes(mock.colors.core)).toEqual(expect.arrayContaining(['#FF0000', '#00FF00']));
  });
});

describe('brandToMockBrand — about', () => {
  it('renders stored aboutSections', () => {
    const mock = brandToMockBrand(
      brand({
        guidelines: {
          aboutSections: [
            { id: 's1', title: 'Mission', content: 'Ship it' },
            { id: 's2', title: 'Brand Promise', content: 'Always on' },
          ],
        } as never,
      }),
    );
    expect(mock.about.map((a) => a.title)).toEqual(['Mission', 'Brand Promise']);
    expect(mock.about[1].content).toBe('Always on');
  });
});

describe('brandToMockBrand — logos', () => {
  it('uses the uploaded primary logo instead of the text placeholder', () => {
    const mock = brandToMockBrand(brand({ logo: 'data:image/png;base64,AAA' }));
    expect(mock.logos[0].id).toBe('primary');
    expect(mock.logos[0].svg).toContain('data:image/png;base64,AAA');
  });

  it('maps every uploaded slot', () => {
    const mock = brandToMockBrand(
      brand({
        logoAssets: {
          full: 'u-full',
          icon: 'u-icon',
          wordmark: 'u-word',
          light: 'u-light',
          dark: 'u-dark',
        },
      }),
    );
    expect(mock.logos.map((l) => l.id)).toEqual(
      expect.arrayContaining(['primary', 'mark', 'wordmark', 'on-dark', 'on-light']),
    );
  });
});

describe('looksLikeAName — a description is not always a name', () => {
  // Onboarding writes a PARAGRAPH into `LogoRef.description`. Used verbatim as
  // the variant label it became the tile caption, the export filename and a
  // 600px column in the logo picker.
  it('accepts a short label', () => {
    expect(looksLikeAName('Primary')).toBe(true);
    expect(looksLikeAName('Holiday edition')).toBe(true);
    expect(looksLikeAName('Mark — reversed')).toBe(true);
  });
  it('refuses prose', () => {
    expect(
      looksLikeAName(
        'The RAQM wordmark features bold geometric letterforms with angular cuts and rectangular counters.',
      ),
    ).toBe(false);
    expect(looksLikeAName('Reversed white version for dark backgrounds and photography overlays.')).toBe(false);
    expect(looksLikeAName('Single-color black (#0A0A0F) version')).toBe(false);
    expect(looksLikeAName('')).toBe(false);
  });
});
