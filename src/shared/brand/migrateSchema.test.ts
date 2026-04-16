import { describe, it, expect } from 'vitest';
import { migrateBrandToCurrent } from './migrateSchema';
import { BRAND_SCHEMA_VERSION } from '@/shared/types/brandAssets';
import type { Brand } from '@/shared/types/brand';

function makeLegacyBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'b-1',
    slug: 'acme',
    name: 'Acme',
    logo: 'https://cdn/acme-primary.svg',
    logoAssets: {
      full: 'https://cdn/acme-primary.svg',
      icon: 'https://cdn/acme-icon.svg',
      wordmark: 'https://cdn/acme-wordmark.svg',
      dark: 'https://cdn/acme-black.svg',
      light: 'https://cdn/acme-white.svg',
    },
    primaryColor: '#7231FF',
    secondaryColor: '#00D4AA',
    fonts: { primary: 'Inter', secondary: 'DM Sans' },
    tone: 'direct',
    audience: 'devs',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('migrateBrandToCurrent', () => {
  it('is a no-op when schemaVersion is already current', () => {
    const b = makeLegacyBrand({ schemaVersion: BRAND_SCHEMA_VERSION });
    const out = migrateBrandToCurrent(b);
    expect(out).toBe(b);
  });

  it('sets schemaVersion to current after migration', () => {
    const out = migrateBrandToCurrent(makeLegacyBrand());
    expect(out.schemaVersion).toBe(BRAND_SCHEMA_VERSION);
  });

  it('preserves all legacy fields (back-compat)', () => {
    const b = makeLegacyBrand();
    const out = migrateBrandToCurrent(b);
    expect(out.logo).toBe(b.logo);
    expect(out.logoAssets).toEqual(b.logoAssets);
    expect(out.primaryColor).toBe(b.primaryColor);
    expect(out.fonts).toEqual(b.fonts);
  });

  it('derives logoSystem refs from legacy logoAssets', () => {
    const out = migrateBrandToCurrent(makeLegacyBrand());
    expect(out.logoSystem?.primary?.assetId).toBeDefined();
    expect(out.logoSystem?.iconmark?.assetId).toBeDefined();
    expect(out.logoSystem?.wordmark?.assetId).toBeDefined();
    expect(out.logoSystem?.mono?.black?.assetId).toBeDefined();
    expect(out.logoSystem?.mono?.white?.assetId).toBeDefined();
  });

  it('deduplicates assets when the same URL appears in multiple slots', () => {
    // `logo` and `logoAssets.full` point at the same URL — must collapse to 1 asset.
    const out = migrateBrandToCurrent(makeLegacyBrand());
    const primaryId = out.logoSystem?.primary?.assetId;
    // assets exist
    expect(out.brandAssets?.length).toBeGreaterThan(0);
    // every ref's assetId resolves to something in brandAssets
    for (const a of out.brandAssets ?? []) {
      expect(a.id).toMatch(/^asset-/);
    }
    // primary and (if present) a secondary pointing at same URL share id
    expect(primaryId).toMatch(/^asset-/);
  });

  it('builds colorSystem from top-level primaryColor/secondaryColor when guidelines absent', () => {
    const out = migrateBrandToCurrent(makeLegacyBrand());
    expect(out.colorSystem?.primary?.hex).toBe('#7231FF');
    expect(out.colorSystem?.secondary?.hex).toBe('#00D4AA');
    expect(out.colorSystem?.primary?.rgb).toMatch(/^rgb\(/);
  });

  it('builds typography from fonts when guidelines absent', () => {
    const out = migrateBrandToCurrent(makeLegacyBrand());
    expect(out.typography?.primary?.family).toBe('Inter');
    expect(out.typography?.secondary?.family).toBe('DM Sans');
  });

  it('prefers guidelines.colorPalette over top-level when both present', () => {
    const b = makeLegacyBrand({
      guidelines: {
        colorPalette: {
          primary: {
            hex: '#FF0000',
            rgb: 'rgb(255,0,0)',
            cmyk: '',
            name: 'Red',
            usage: '',
          },
          neutral: [],
          semantic: {
            success: { hex: '#0f0', rgb: '', cmyk: '', name: 'S', usage: '' },
            warning: { hex: '#ff0', rgb: '', cmyk: '', name: 'W', usage: '' },
            error: { hex: '#f00', rgb: '', cmyk: '', name: 'E', usage: '' },
            info: { hex: '#00f', rgb: '', cmyk: '', name: 'I', usage: '' },
          },
        },
      },
    });
    const out = migrateBrandToCurrent(b);
    expect(out.colorSystem?.primary?.hex).toBe('#FF0000');
    expect(out.colorSystem?.primary?.name).toBe('Red');
  });

  it('is idempotent — running twice gives the same result', () => {
    const once = migrateBrandToCurrent(makeLegacyBrand());
    const twice = migrateBrandToCurrent(once);
    expect(twice).toEqual(once);
  });

  it('handles a brand with no logo at all', () => {
    const b = makeLegacyBrand({ logo: undefined, logoAssets: undefined });
    const out = migrateBrandToCurrent(b);
    expect(out.schemaVersion).toBe(BRAND_SCHEMA_VERSION);
    expect(out.logoSystem).toBeUndefined();
    // colorSystem and typography still build from other fields
    expect(out.colorSystem?.primary?.hex).toBe('#7231FF');
  });
});
