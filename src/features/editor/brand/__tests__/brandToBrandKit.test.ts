// Unit tests for `brandToBrandKit` priority chains, slot resolution,
// and diagnostic warnings.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { brandToBrandKit } from '../brandToBrandKit';
import { BrandKitSchema } from '../BrandKit';
import type { Brand } from '@/shared/types/brand';

// ─── Fixture builder ────────────────────────────────────────────────────

/**
 * Minimum-required Brand for `brandToBrandKit`. Tests override
 * specific fields to exercise priority chains.
 */
function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'test-brand',
    slug: 'test',
    name: 'Test Brand',
    primaryColor: '#3366ff',
    fonts: { primary: 'Inter, sans-serif' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01'),
    ...overrides,
  };
}

// ─── Schema parse round-trip ────────────────────────────────────────────

describe('brandToBrandKit — schema parse', () => {
  it('produces a kit that round-trips through BrandKitSchema.parse', () => {
    const kit = brandToBrandKit(makeBrand());
    expect(() => BrandKitSchema.parse(kit)).not.toThrow();
    expect(BrandKitSchema.parse(kit)).toEqual(kit);
  });

  it('accepts seed brands whose logo URLs are root-relative paths', async () => {
    // Regression for a Step 5b issue: useBrandKit(raqmBrand) failed
    // at runtime because BrandKitSchema enforced z.string().url() on
    // logo URLs but the seed brands ship root-relative paths
    // (`/brands/raqm/logo.svg`). The renderer treats those as valid
    // (browser resolves against window.location.origin), so the
    // schema must too.
    const { raqmBrand } = await import('@/data/brands/raqm');
    expect(() => brandToBrandKit(raqmBrand)).not.toThrow();
    const kit = brandToBrandKit(raqmBrand);
    expect(() => BrandKitSchema.parse(kit)).not.toThrow();
    // Sanity: the primary logo URL is a root-relative path that
    // would have failed strict z.string().url() validation.
    expect(kit.logos.primary?.url.startsWith('/')).toBe(true);
  });
});

// ─── Color priority chains ──────────────────────────────────────────────

describe('brandToBrandKit — colors', () => {
  it('primary: colorSystem wins over legacy primaryColor', () => {
    const kit = brandToBrandKit(
      makeBrand({
        primaryColor: '#000000',
        colorSystem: { primary: { hex: '#ff0000' } },
      }),
    );
    expect(kit.colors.primary.hex).toBe('#ff0000');
  });

  it('primary: falls back to legacy primaryColor when colorSystem is absent', () => {
    const kit = brandToBrandKit(makeBrand({ primaryColor: '#abcdef' }));
    expect(kit.colors.primary.hex).toBe('#abcdef');
  });

  it('secondary: optional, set from colorSystem when present', () => {
    const kit = brandToBrandKit(
      makeBrand({
        colorSystem: {
          primary: { hex: '#000' + '000' },
          secondary: { hex: '#abcdef' },
        },
      }),
    );
    expect(kit.colors.secondary?.hex).toBe('#abcdef');
  });

  it('secondary: falls back to legacy secondaryColor', () => {
    const kit = brandToBrandKit(makeBrand({ secondaryColor: '#deadbe' }));
    expect(kit.colors.secondary?.hex).toBe('#deadbe');
  });

  it('accent: priority chain matches secondary', () => {
    const kit = brandToBrandKit(makeBrand({ accentColor: '#aabbcc' }));
    expect(kit.colors.accent?.hex).toBe('#aabbcc');
  });

  it('neutrals: prefers v3 colorSystem.neutrals (ColorToken[])', () => {
    const kit = brandToBrandKit(
      makeBrand({
        colorSystem: {
          primary: { hex: '#3366ff' },
          neutrals: [
            { hex: '#fafafa' },
            { hex: '#dddddd' },
            { hex: '#aaaaaa' },
            { hex: '#777777' },
            { hex: '#444444' },
            { hex: '#111111' },
          ],
        },
      }),
    );
    expect(kit.colors.neutrals).toEqual([
      '#fafafa',
      '#dddddd',
      '#aaaaaa',
      '#777777',
      '#444444',
      '#111111',
    ]);
  });

  it('neutrals: falls back to legacy brand.neutrals (string[]) when colorSystem.neutrals is absent', () => {
    const kit = brandToBrandKit(
      makeBrand({
        neutrals: ['#fafafa', '#dddddd', '#aaaaaa', '#777777', '#444444', '#111111'],
      }),
    );
    expect(kit.colors.neutrals).toHaveLength(6);
    expect(kit.colors.neutrals[0]).toBe('#fafafa');
  });

  it('neutrals: short legacy source is normalized to 6 via interpolation', () => {
    const kit = brandToBrandKit(
      makeBrand({ neutrals: ['#ffffff', '#000000'] }),
    );
    expect(kit.colors.neutrals).toHaveLength(6);
  });

  it('neutrals: with no source at all, generates from primary hue and emits a warning', () => {
    const kit = brandToBrandKit(makeBrand({ primaryColor: '#3366ff' }));
    expect(kit.colors.neutrals).toHaveLength(6);
    expect(kit._diagnostics.warnings).toContain(
      'Brand has no neutrals defined; generating ramp from primary hue.',
    );
  });
});

// ─── Typography priority chains ─────────────────────────────────────────

describe('brandToBrandKit — typography', () => {
  it('heading: typescale → typography → fonts.primary', () => {
    // Typescale wins.
    expect(
      brandToBrandKit(
        makeBrand({
          typescale: { fonts: { heading: { family: 'Helvetica' } } } as any,
          typography: { primary: { family: 'Georgia' } },
          fonts: { primary: 'Inter' },
        }),
      ).typography.heading.family,
    ).toBe('Helvetica');

    // No typescale → typography wins.
    expect(
      brandToBrandKit(
        makeBrand({
          typography: { primary: { family: 'Georgia' } },
          fonts: { primary: 'Inter' },
        }),
      ).typography.heading.family,
    ).toBe('Georgia');

    // Neither → legacy fonts.primary.
    expect(
      brandToBrandKit(makeBrand({ fonts: { primary: 'Inter' } })).typography.heading
        .family,
    ).toBe('Inter');
  });

  it('body: explicit body source wins over heading fallback', () => {
    expect(
      brandToBrandKit(
        makeBrand({
          typography: {
            primary: { family: 'Georgia' },
            secondary: { family: 'Helvetica' },
          },
        }),
      ).typography.body.family,
    ).toBe('Helvetica');
  });

  it('body: falls back through the long chain to fonts.primary', () => {
    expect(
      brandToBrandKit(makeBrand({ fonts: { primary: 'Inter' } })).typography.body
        .family,
    ).toBe('Inter');
  });

  it('body: when only a heading family exists, emits the documented warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const kit = brandToBrandKit(
      makeBrand({
        typography: { primary: { family: 'Georgia' } },
        fonts: { primary: 'Georgia' },
      }),
    );
    expect(kit.typography.body.family).toBe('Georgia');
    expect(kit._diagnostics.warnings.some((w) => /body font/.test(w))).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('typescale weights are forwarded when present', () => {
    const kit = brandToBrandKit(
      makeBrand({
        typescale: {
          fonts: {
            heading: { family: 'Inter', weights: [400, 700] },
            body: { family: 'Inter', weights: [300, 400] },
          },
        } as any,
      }),
    );
    expect(kit.typography.heading.weights).toEqual([400, 700]);
    expect(kit.typography.body.weights).toEqual([300, 400]);
  });
});

// ─── Logo resolution ────────────────────────────────────────────────────

describe('brandToBrandKit — logos', () => {
  it('logoSystem + brandAssets: resolves the highest-priority format', () => {
    const kit = brandToBrandKit(
      makeBrand({
        logoSystem: {
          primary: { assetId: 'asset-1' },
        },
        brandAssets: [
          {
            id: 'asset-1',
            kind: 'logo',
            name: 'Primary',
            formats: {
              png: { url: 'https://cdn.example.com/p.png', size: 100 },
              svg: { url: 'https://cdn.example.com/p.svg', size: 50 },
            },
            metadata: { createdAt: '2026-04-01', version: 1, width: 200, height: 100 },
          },
        ],
      }),
    );
    expect(kit.logos.primary?.url).toBe('https://cdn.example.com/p.svg');
    expect(kit.logos.primary?.format).toBe('svg');
    expect(kit.logos.primary?.aspectRatio).toBeCloseTo(2);
  });

  it('legacy fallback: resolves brand.logoAssets.full when logoSystem is absent', () => {
    const kit = brandToBrandKit(
      makeBrand({
        logoAssets: {
          full: 'https://cdn.example.com/legacy.png',
        },
      }),
    );
    expect(kit.logos.primary?.url).toBe('https://cdn.example.com/legacy.png');
    expect(kit.logos.primary?.format).toBe('png');
  });

  it('legacy fallback: each logo slot maps to its v2 logoAssets key', () => {
    const kit = brandToBrandKit(
      makeBrand({
        logoAssets: {
          full: 'https://cdn.example.com/full.svg',
          alternate: 'https://cdn.example.com/alt.svg',
          wordmark: 'https://cdn.example.com/word.svg',
          icon: 'https://cdn.example.com/icon.svg',
          dark: 'https://cdn.example.com/dark.svg',
          light: 'https://cdn.example.com/light.svg',
        },
      }),
    );
    expect(kit.logos.primary?.url).toContain('full.svg');
    expect(kit.logos.secondary?.url).toContain('alt.svg');
    expect(kit.logos.wordmark?.url).toContain('word.svg');
    expect(kit.logos.iconmark?.url).toContain('icon.svg');
    expect(kit.logos.mono.black?.url).toContain('dark.svg');
    expect(kit.logos.mono.white?.url).toContain('light.svg');
  });

  it('legacy: root-relative-path URL is preserved (renderer resolves against origin)', () => {
    // Earlier behavior was to drop relative paths because the schema
    // required absolute URLs. Step 5b loosened the schema to accept
    // root-/relative paths so seed brands like Raqm (which ship
    // `/brands/raqm/logo.svg`) survive the BrandKit parse and the
    // re-apply flow can read them.
    const kit = brandToBrandKit(
      makeBrand({ logoAssets: { full: '/assets/logo.png' } }),
    );
    expect(kit.logos.primary?.url).toBe('/assets/logo.png');
    expect(kit.logos.primary?.format).toBe('png');
  });

  it('legacy: bare unparseable strings (no scheme, no leading slash) are dropped', () => {
    // Sanity guard: a free-text "logo.png" without a leading slash
    // is not loadable by the renderer — keep dropping it.
    const kit = brandToBrandKit(
      makeBrand({ logoAssets: { full: 'logo.png' } }),
    );
    expect(kit.logos.primary).toBeUndefined();
  });

  it('logoSystem with missing brandAssets entry falls through to legacy', () => {
    const kit = brandToBrandKit(
      makeBrand({
        logoSystem: { primary: { assetId: 'missing' } },
        brandAssets: [],
        logoAssets: { full: 'https://cdn.example.com/legacy.png' },
      }),
    );
    expect(kit.logos.primary?.url).toBe('https://cdn.example.com/legacy.png');
  });
});

// ─── Spacing tier mapping ───────────────────────────────────────────────

describe('brandToBrandKit — spacing', () => {
  it.each([
    ['compact', 4],
    ['comfortable', 8],
    ['spacious', 12],
  ])('uiStyle.spacing=%s maps to unit=%i', (tier, expected) => {
    const kit = brandToBrandKit(
      makeBrand({
        uiStyle: {
          borderRadius: 8,
          shadowIntensity: 'subtle',
          spacing: tier as 'compact' | 'comfortable' | 'spacious',
          weight: 'regular',
        },
      }),
    );
    expect(kit.spacing.unit).toBe(expected);
    expect(kit.spacing.cornerRadius).toBe(8);
  });

  it('defaults to comfortable (unit=8) when uiStyle is absent', () => {
    const kit = brandToBrandKit(makeBrand());
    expect(kit.spacing.unit).toBe(8);
    expect(kit.spacing.cornerRadius).toBe(4);
  });
});

// ─── Diagnostics warnings ───────────────────────────────────────────────

describe('brandToBrandKit — diagnostics', () => {
  it('a fully-defined brand emits no warnings', () => {
    const kit = brandToBrandKit(
      makeBrand({
        colorSystem: {
          primary: { hex: '#3366ff' },
          neutrals: [
            { hex: '#fafafa' },
            { hex: '#dddddd' },
            { hex: '#aaaaaa' },
            { hex: '#777777' },
            { hex: '#444444' },
            { hex: '#111111' },
          ],
        },
        typography: {
          primary: { family: 'Georgia' },
          secondary: { family: 'Helvetica' },
        },
      }),
    );
    expect(kit._diagnostics.warnings).toEqual([]);
  });

  it('missing primary color emits a warning and falls back to gray', () => {
    // Build a brand whose primaryColor is empty/invalid AND has no
    // colorSystem. Keep makeBrand's defaults but override primaryColor.
    const kit = brandToBrandKit(
      makeBrand({ primaryColor: '' as any }),
    );
    expect(kit.colors.primary.hex).toBe('#888888');
    expect(kit._diagnostics.warnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/no primary color/)]),
    );
  });
});

// ─── No-prod console.warn for body fallback ─────────────────────────────

describe('brandToBrandKit — body fallback observability', () => {
  const origNodeEnv = process.env.NODE_ENV;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    process.env.NODE_ENV = origNodeEnv;
    warnSpy.mockRestore();
  });

  it('fires console.warn in non-prod environments', () => {
    process.env.NODE_ENV = 'development';
    brandToBrandKit(makeBrand({ fonts: { primary: 'Inter' } }));
    expect(warnSpy).toHaveBeenCalled();
  });

  it('skips console.warn in production', () => {
    process.env.NODE_ENV = 'production';
    brandToBrandKit(makeBrand({ fonts: { primary: 'Inter' } }));
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('always populates the diagnostics warning regardless of environment', () => {
    process.env.NODE_ENV = 'production';
    const kit = brandToBrandKit(makeBrand({ fonts: { primary: 'Inter' } }));
    expect(kit._diagnostics.warnings.some((w) => /body font/.test(w))).toBe(true);
  });
});
