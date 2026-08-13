/**
 * The legacy boundary must carry the new Core subsystems, the authority sidecar
 * and Business Info without losing anything — across all four coexisting legacy
 * shapes (bare scalars, v3 fields, the identity blob, the guidelines mirror).
 *
 * It must also stay INVISIBLE to brands that have none of it: an untouched
 * brand has to convert exactly as it did before this feature, or "preserve
 * existing behavior" is not true.
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import {
  fromLegacyBrand,
  toLegacyBrandPatch,
  validateCanonicalBrand,
  coreValueMeta,
} from '@/domain/brand';

function makeLegacy(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'b1',
    slug: 'acme',
    name: 'Acme',
    primaryColor: '#111111',
    fonts: { primary: 'Inter' },
    tone: 'friendly',
    audience: 'builders',
    assets: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  } as Brand;
}

const META = {
  'colors.primary': {
    authority: 'confirmed',
    provenance: 'ai-suggested',
    setBy: 'u1',
    setAt: '2026-08-13T00:00:00.000Z',
    promotedBy: 'u1',
    promotedAt: '2026-08-13T01:00:00.000Z',
  },
};

describe('legacy boundary — no behavior change for untouched brands', () => {
  it('a brand with no new data converts without the new keys', () => {
    const c = fromLegacyBrand(makeLegacy());
    expect(c.identityMeta).toBeUndefined();
    expect(c.businessInfo).toBeUndefined();
    expect(c.identity.visualStyle).toBeUndefined();
    expect(c.identity.rules).toBeUndefined();
    expect(validateCanonicalBrand(c).ok).toBe(true);
  });

  it('its legacy patch carries no new keys either', () => {
    const patch = toLegacyBrandPatch(fromLegacyBrand(makeLegacy()));
    expect('identityMeta' in patch).toBe(false);
    expect('businessInfo' in patch).toBe(false);
  });
});

describe('authority sidecar round-trip', () => {
  it('survives legacy → canonical → legacy', () => {
    const c = fromLegacyBrand(makeLegacy({ identityMeta: META } as Partial<Brand>));
    expect(coreValueMeta(c.identityMeta, 'colors.primary')).toMatchObject({
      authority: 'confirmed',
      provenance: 'ai-suggested',
      promotedBy: 'u1',
    });

    const patch = toLegacyBrandPatch(c);
    const back = fromLegacyBrand(makeLegacy(patch as Partial<Brand>));
    expect(coreValueMeta(back.identityMeta, 'colors.primary').authority).toBe('confirmed');
    expect(coreValueMeta(back.identityMeta, 'colors.primary').provenance).toBe('ai-suggested');
  });

  it('drops metadata for unregistered paths on read, keeping the rest', () => {
    const c = fromLegacyBrand(
      makeLegacy({
        identityMeta: { ...META, 'colors.tertiary': META['colors.primary'] },
      } as Partial<Brand>),
    );
    expect(Object.keys(c.identityMeta ?? {})).toEqual(['colors.primary']);
  });
});

describe('Business Info round-trip', () => {
  it('survives legacy → canonical → legacy', () => {
    const businessInfo = {
      legalName: 'Acme Ltd',
      contact: { email: 'hi@acme.test' },
      links: [{ kind: 'website' as const, url: 'https://acme.test' }],
    };
    const c = fromLegacyBrand(makeLegacy({ businessInfo } as Partial<Brand>));
    expect(c.businessInfo).toEqual(businessInfo);
    expect(validateCanonicalBrand(c).ok).toBe(true);

    const back = fromLegacyBrand(makeLegacy(toLegacyBrandPatch(c) as Partial<Brand>));
    expect(back.businessInfo).toEqual(businessInfo);
  });

  it('does not alias the mutable legacy input', () => {
    const businessInfo = { legalName: 'Acme Ltd' };
    const legacy = makeLegacy({ businessInfo } as Partial<Brand>);
    const c = fromLegacyBrand(legacy);
    (c.businessInfo as { legalName?: string }).legalName = 'Mutated';
    expect(businessInfo.legalName).toBe('Acme Ltd');
  });
});

describe('visual style — migrated from the legacy uiStyle', () => {
  it('maps borderRadius / spacing / shadow onto the canonical enums', () => {
    const c = fromLegacyBrand(
      makeLegacy({
        uiStyle: {
          borderRadius: 16,
          shadowIntensity: 'bold',
          spacing: 'compact',
          weight: 'regular',
        },
      }),
    );
    expect(c.identity.visualStyle).toEqual({
      cornerStyle: 'rounded',
      density: 'tight',
      contrast: 'high',
    });
    expect(validateCanonicalBrand(c).ok).toBe(true);
  });

  it('a stored canonical visualStyle wins over the legacy uiStyle', () => {
    const c = fromLegacyBrand(
      makeLegacy({
        uiStyle: { borderRadius: 0, shadowIntensity: 'none', spacing: 'spacious', weight: 'light' },
        identity: {
          colors: { primary: { hex: '#111111' } },
          logos: {},
          typography: { primary: { family: 'Inter' } },
          strategy: { values: [], personality: [], aboutSections: [] },
          voice: { personality: [], doList: [], dontList: [], examples: [] },
          visualStyle: { cornerStyle: 'pill', density: 'airy' },
        },
      } as Partial<Brand>),
    );
    expect(c.identity.visualStyle).toEqual({ cornerStyle: 'pill', density: 'airy' });
  });
});

describe('positioning — migrated from strategy sentences', () => {
  it('derives structured positioning from the legacy strategy mirror', () => {
    const c = fromLegacyBrand(
      makeLegacy({
        guidelines: {
          strategy: {
            mission: 'm',
            vision: 'v',
            values: [],
            positioning: 'The fastest option',
            personality: [],
            targetAudience: 'Independent designers',
          },
        },
      } as Partial<Brand>),
    );
    expect(c.identity.positioning).toEqual({
      differentiator: 'The fastest option',
      audiences: [{ label: 'Independent designers', priority: 'primary' }],
    });
  });

  it('structures the legacy `audience` scalar as a primary audience', () => {
    // The fixture carries `audience: 'builders'`, which IS audience data — so
    // migrating it into the structured shape is correct, not over-eager.
    const c = fromLegacyBrand(makeLegacy());
    expect(c.identity.positioning).toEqual({
      audiences: [{ label: 'builders', priority: 'primary' }],
    });
  });

  it('omits positioning entirely when the brand has neither sentence', () => {
    const c = fromLegacyBrand(makeLegacy({ audience: '', tone: '' }));
    expect(c.identity.positioning).toBeUndefined();
  });
});

describe('all four legacy shapes carry the sidecar identically', () => {
  const shapes: Array<[string, Partial<Brand>]> = [
    ['bare scalars', {}],
    ['v3 fields', { colorSystem: { primary: { hex: '#222222' } } } as Partial<Brand>],
    [
      'identity blob',
      {
        identity: {
          colors: { primary: { hex: '#333333' } },
          logos: {},
          typography: { primary: { family: 'Inter' } },
          strategy: { values: [], personality: [], aboutSections: [] },
          voice: { personality: [], doList: [], dontList: [], examples: [] },
        },
      } as Partial<Brand>,
    ],
    [
      'guidelines mirror',
      { guidelines: { colorPalette: { primary: { hex: '#444444', name: 'P' } } } } as Partial<Brand>,
    ],
  ];

  it.each(shapes)('%s', (_label, overrides) => {
    const c = fromLegacyBrand(makeLegacy({ ...overrides, identityMeta: META } as Partial<Brand>));
    expect(coreValueMeta(c.identityMeta, 'colors.primary').authority).toBe('confirmed');
    expect(validateCanonicalBrand(c).ok).toBe(true);
    // The value itself still resolves through the existing precedence rules.
    expect(c.identity.colors.primary.hex).toBeTruthy();
  });
});
