import { describe, it, expect } from 'vitest';
import { BrandOSDocumentSchema, SlotRefSchema } from './index';
import socialPostFixture from './__fixtures__/social-post.sample.json';

describe('BrandOSDocumentSchema', () => {
  it('round-trips the social-post fixture', () => {
    const parsed = BrandOSDocumentSchema.parse(socialPostFixture);
    // Re-parsing the parsed output must yield the same shape — the schema
    // applies defaults, but parse(parse(x)) === parse(x) for valid input.
    const reparsed = BrandOSDocumentSchema.parse(parsed);
    expect(reparsed).toEqual(parsed);
  });

  it('accepts a non-UUID brandId (slug-style legacy/seed brands)', () => {
    const parsed = BrandOSDocumentSchema.parse(socialPostFixture);
    expect(parsed.brandId).toBe('raqm');
  });

  it('accepts brandId: null (standalone-editor flow)', () => {
    const doc = { ...socialPostFixture, brandId: null };
    expect(() => BrandOSDocumentSchema.parse(doc)).not.toThrow();
  });

  it('rejects empty brandId', () => {
    const doc = { ...socialPostFixture, brandId: '' };
    expect(() => BrandOSDocumentSchema.parse(doc)).toThrow();
  });

  it('rejects schemaVersion other than 1', () => {
    const doc = { ...socialPostFixture, schemaVersion: 2 };
    expect(() => BrandOSDocumentSchema.parse(doc)).toThrow();
  });

  it('requires at least one page', () => {
    const doc = { ...socialPostFixture, pages: [] };
    expect(() => BrandOSDocumentSchema.parse(doc)).toThrow();
  });
});

describe('SlotRefSchema', () => {
  it('accepts every slot type the resolver contract names', () => {
    const types = [
      'brand.color.primary',
      'brand.color.secondary',
      'brand.color.accent',
      'brand.color.neutral',
      'brand.font.heading',
      'brand.font.body',
      'brand.logo.primary',
      'brand.logo.secondary',
      'brand.logo.wordmark',
      'brand.logo.iconmark',
      'brand.logo.mono.black',
      'brand.logo.mono.white',
      'brand.spacing.unit',
    ] as const;
    for (const t of types) {
      expect(() => SlotRefSchema.parse({ type: t })).not.toThrow();
    }
  });

  it('rejects an unknown slot type', () => {
    expect(() => SlotRefSchema.parse({ type: 'brand.color.neon' })).toThrow();
  });

  it('clamps neutralIndex to 0..5', () => {
    expect(() =>
      SlotRefSchema.parse({ type: 'brand.color.neutral', neutralIndex: 6 }),
    ).toThrow();
    expect(() =>
      SlotRefSchema.parse({ type: 'brand.color.neutral', neutralIndex: -1 }),
    ).toThrow();
    expect(() =>
      SlotRefSchema.parse({ type: 'brand.color.neutral', neutralIndex: 0 }),
    ).not.toThrow();
    expect(() =>
      SlotRefSchema.parse({ type: 'brand.color.neutral', neutralIndex: 5 }),
    ).not.toThrow();
  });
});
