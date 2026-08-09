import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import {
  fromLegacyBrand,
  toLegacyBrandPatch,
  validateCanonicalBrand,
  assertCanonicalBrand,
  CANONICAL_BRAND_SCHEMA_VERSION,
} from '@/domain/brand';

/** Minimal legacy Brand fixture; override only the fields under test. */
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

describe('canonical Brand — legacy→canonical conversion', () => {
  it('maps identifiers, visibility, and stamps the schema version', () => {
    const c = fromLegacyBrand(makeLegacy({ isPublic: true, publicUrl: 'https://x' }));
    expect(c.id).toBe('b1');
    expect(c.slug).toBe('acme');
    expect(c.name).toBe('Acme');
    expect(c.isPublic).toBe(true);
    expect(c.publicUrl).toBe('https://x');
    expect(c.identitySchemaVersion).toBe(CANONICAL_BRAND_SCHEMA_VERSION);
    expect(validateCanonicalBrand(c).ok).toBe(true);
  });
});

describe('canonical primary color — stale mirror cannot win', () => {
  it('prefers the fresh scalar primaryColor over a stale guidelines mirror', () => {
    // Simulates the 05/11 bug: Setup updated the scalar but not the mirror.
    const c = fromLegacyBrand(
      makeLegacy({
        primaryColor: '#111111', // fresh
        guidelines: {
          colorPalette: {
            primary: { hex: '#999999', rgb: '', cmyk: '', name: 'old', usage: '' },
            neutral: [],
            semantic: {
              success: { hex: '#0f0', rgb: '', cmyk: '', name: '', usage: '' },
              warning: { hex: '#ff0', rgb: '', cmyk: '', name: '', usage: '' },
              error: { hex: '#f00', rgb: '', cmyk: '', name: '', usage: '' },
              info: { hex: '#00f', rgb: '', cmyk: '', name: '', usage: '' },
            },
          },
        },
      }),
    );
    expect(c.identity.colors.primary.hex).toBe('#111111'); // NOT the stale #999999
  });

  it('enriches metadata from the mirror only when the hexes agree', () => {
    const c = fromLegacyBrand(
      makeLegacy({
        primaryColor: '#111111',
        guidelines: {
          colorPalette: {
            primary: { hex: '#111111', rgb: '17,17,17', cmyk: '', name: 'Ink', usage: 'brand' },
            neutral: [],
            semantic: {
              success: { hex: '#0f0', rgb: '', cmyk: '', name: '', usage: '' },
              warning: { hex: '#ff0', rgb: '', cmyk: '', name: '', usage: '' },
              error: { hex: '#f00', rgb: '', cmyk: '', name: '', usage: '' },
              info: { hex: '#00f', rgb: '', cmyk: '', name: '', usage: '' },
            },
          },
        },
      }),
    );
    expect(c.identity.colors.primary.hex).toBe('#111111');
    expect(c.identity.colors.primary.name).toBe('Ink'); // salvaged because hex matched
  });

  it('prefers the v3 colorSystem field when present', () => {
    const c = fromLegacyBrand(
      makeLegacy({
        primaryColor: '#111111',
        colorSystem: { primary: { hex: '#abcdef', name: 'v3' } },
      }),
    );
    expect(c.identity.colors.primary.hex).toBe('#abcdef');
  });
});

describe('logo variant relationships', () => {
  it('preserves v3 asset-ref slots exactly', () => {
    const c = fromLegacyBrand(
      makeLegacy({
        logoSystem: {
          primary: { assetId: 'a1' },
          iconmark: { assetId: 'a2' },
          mono: { black: { assetId: 'a3' } },
        } as Brand['logoSystem'],
      }),
    );
    expect(c.identity.logos.primary?.assetId).toBe('a1');
    expect(c.identity.logos.iconmark?.assetId).toBe('a2');
    expect(c.identity.logos.mono?.black?.assetId).toBe('a3');
  });

  it('maps flat legacy logoAssets urls into slots (transitional refs)', () => {
    const c = fromLegacyBrand(
      makeLegacy({
        logoAssets: { full: 'u-full', icon: 'u-icon', dark: 'u-dark' },
      }),
    );
    expect(c.identity.logos.primary?.assetId).toBe('legacy-url:u-full');
    expect(c.identity.logos.iconmark?.assetId).toBe('legacy-url:u-icon');
    expect(c.identity.logos.mono?.black?.assetId).toBe('legacy-url:u-dark');
  });
});

describe('typography representation', () => {
  it('coerces stringified weights to numbers', () => {
    const c = fromLegacyBrand(
      makeLegacy({
        typography: {
          primary: { family: 'Satoshi', weights: ['400', '700'] as unknown as number[] },
        } as Brand['typography'],
      }),
    );
    expect(c.identity.typography.primary.weights).toEqual([400, 700]);
    expect(validateCanonicalBrand(c).ok).toBe(true); // numeric weights pass the boundary
  });

  it('falls back to legacy scalar fonts', () => {
    const c = fromLegacyBrand(makeLegacy({ fonts: { primary: 'Georgia', secondary: 'Arial' } }));
    expect(c.identity.typography.primary.family).toBe('Georgia');
    expect(c.identity.typography.secondary?.family).toBe('Arial');
  });
});

describe('strategy & voice preservation (collapses legacy splits)', () => {
  it('preserves structured strategy + free-form about sections', () => {
    const c = fromLegacyBrand(
      makeLegacy({
        guidelines: {
          strategy: {
            mission: 'Empower makers',
            vision: 'A brand OS',
            values: ['clarity', 'speed'],
            positioning: 'premium',
            personality: ['bold'],
            targetAudience: 'founders',
          },
          aboutSections: [{ id: 's1', title: 'Promise', content: 'We ship.' }],
        },
      }),
    );
    expect(c.identity.strategy.mission).toBe('Empower makers');
    expect(c.identity.strategy.values).toEqual(['clarity', 'speed']);
    expect(c.identity.strategy.aboutSections[0].title).toBe('Promise');
  });

  it('unifies voice: fresh tone scalar wins; rich fields come from voiceAndTone', () => {
    const c = fromLegacyBrand(
      makeLegacy({
        tone: 'edited-tone', // a fresh edit — must win over the stale mirror
        guidelines: {
          voiceAndTone: {
            brandVoice: 'stale-mirror-voice',
            toneAttributes: ['warm', 'direct'],
            communicationStyle: 'clear',
            doAndDonts: { do: ['be clear'], dont: ['be vague'] },
            examples: [{ context: 'email', good: 'Hi there', bad: 'Greetings sir' }],
          },
        },
      }),
    );
    // A7 fix: scalar-first — the fresh tone edit is not reverted by the mirror.
    expect(c.identity.voice.tone).toBe('edited-tone');
    // Rich fields (no scalar equivalent) still come from voiceAndTone.
    expect(c.identity.voice.personality).toEqual(['warm', 'direct']);
    expect(c.identity.voice.doList).toEqual(['be clear']);
    expect(c.identity.voice.dontList).toEqual(['be vague']);
    expect(c.identity.voice.examples[0]).toEqual({ context: 'email', text: 'Hi there' });
  });

  it('falls back to the mirror brandVoice when the tone scalar is empty', () => {
    const c = fromLegacyBrand(
      makeLegacy({
        tone: '',
        guidelines: { voiceAndTone: { brandVoice: 'confident', toneAttributes: [], communicationStyle: '', doAndDonts: { do: [], dont: [] }, examples: [] } },
      }),
    );
    expect(c.identity.voice.tone).toBe('confident');
  });
});

describe('canonical object stability & validation', () => {
  it('is deterministic — same input yields deep-equal output', () => {
    const legacy = makeLegacy({ colorSystem: { primary: { hex: '#123456' } } });
    expect(fromLegacyBrand(legacy)).toEqual(fromLegacyBrand(legacy));
  });

  it('rejects an invalid canonical brand (bad hex)', () => {
    const c = fromLegacyBrand(makeLegacy());
    (c.identity.colors.primary as { hex: string }).hex = 'not-a-hex';
    const r = validateCanonicalBrand(c);
    expect(r.ok).toBe(false);
    expect(() => assertCanonicalBrand(c)).toThrow(/Invalid CanonicalBrand/);
  });
});

describe('canonical does not alias the legacy input (one authoritative copy)', () => {
  it('mutating the canonical result does not mutate the legacy source', () => {
    const legacy = makeLegacy({
      colorSystem: { primary: { hex: '#111111', name: 'Ink' } },
      logoSystem: { primary: { assetId: 'a1' } } as Brand['logoSystem'],
    });
    const c = fromLegacyBrand(legacy);
    (c.identity.colors.primary as { hex: string }).hex = '#000000';
    (c.identity.logos.primary as { assetId: string }).assetId = 'mutated';
    expect(legacy.colorSystem!.primary.hex).toBe('#111111'); // legacy untouched
    expect(legacy.logoSystem!.primary!.assetId).toBe('a1');
  });
});

describe('voice tone fallback', () => {
  it('falls back to the legacy tone scalar when voiceAndTone is absent', () => {
    const c = fromLegacyBrand(makeLegacy({ tone: 'playful' }));
    expect(c.identity.voice.tone).toBe('playful');
  });
});

describe('canonical → legacy patch (2B write path foundation)', () => {
  it('round-trips core identity meaning without loss', () => {
    const legacy = makeLegacy({
      primaryColor: '#111111',
      secondaryColor: '#222222',
      fonts: { primary: 'Inter', secondary: 'Georgia' },
      colorSystem: { primary: { hex: '#111111', name: 'Ink' }, secondary: { hex: '#222222' } },
    });
    const canonical = fromLegacyBrand(legacy);
    const patch = toLegacyBrandPatch(canonical);
    // Semantic equality of the round-tripped identity.
    expect(patch.primaryColor).toBe('#111111');
    expect(patch.secondaryColor).toBe('#222222');
    expect(patch.colorSystem?.primary.hex).toBe('#111111');
    expect(patch.fonts?.primary).toBe('Inter');
    expect(patch.fonts?.secondary).toBe('Georgia');
    expect(patch.name).toBe('Acme');
    // The guidelines mirror is intentionally NOT written (retired as SoT).
    expect(patch.guidelines).toBeUndefined();
  });

  it('writes the voice tone scalar (consistency across representations)', () => {
    const canonical = fromLegacyBrand(makeLegacy({ tone: 'confident' }));
    expect(toLegacyBrandPatch(canonical).tone).toBe('confident');
  });
});
