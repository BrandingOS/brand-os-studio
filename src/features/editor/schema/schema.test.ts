import { describe, it, expect } from 'vitest';
import { BrandOSDocumentSchema, SlotRefSchema } from './index';
import socialPostFixture from './__fixtures__/social-post.sample.json';
import { defaultContentFor } from '@/features/brandkit/content';

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

describe('BaseLayer._lockedBindings (Phase 3 step 4c.1)', () => {
  it('passes parse when omitted (default state for non-locked layers)', () => {
    const parsed = BrandOSDocumentSchema.parse(socialPostFixture);
    for (const layer of parsed.pages[0].layers) {
      expect(layer._lockedBindings).toBeUndefined();
    }
  });

  it('round-trips a layer carrying _lockedBindings on multiple property paths', () => {
    const fixture = JSON.parse(JSON.stringify(socialPostFixture));
    fixture.pages[0].layers[0]._lockedBindings = {
      color: { type: 'brand.color.primary' },
      fontFamily: { type: 'brand.font.heading' },
    };
    const parsed = BrandOSDocumentSchema.parse(fixture);
    expect(parsed.pages[0].layers[0]._lockedBindings).toEqual({
      color: { type: 'brand.color.primary' },
      fontFamily: { type: 'brand.font.heading' },
    });
    // And the reverse parse is stable.
    expect(BrandOSDocumentSchema.parse(parsed)).toEqual(parsed);
  });

  it('accepts a neutral SlotRef with neutralIndex', () => {
    const fixture = JSON.parse(JSON.stringify(socialPostFixture));
    fixture.pages[0].layers[0]._lockedBindings = {
      color: { type: 'brand.color.neutral', neutralIndex: 3 },
    };
    expect(() => BrandOSDocumentSchema.parse(fixture)).not.toThrow();
  });

  it("accepts dotted property paths for SvgLayer.fillOverrides", () => {
    const fixture = JSON.parse(JSON.stringify(socialPostFixture));
    fixture.pages[0].layers[0]._lockedBindings = {
      'fillOverrides.#path-1': { type: 'brand.color.accent' },
    };
    expect(() => BrandOSDocumentSchema.parse(fixture)).not.toThrow();
  });

  it('rejects non-SlotRef values in the binding map', () => {
    const fixture = JSON.parse(JSON.stringify(socialPostFixture));
    fixture.pages[0].layers[0]._lockedBindings = {
      color: '#3366ff', // literal, not a SlotRef — must fail parse
    };
    expect(() => BrandOSDocumentSchema.parse(fixture)).toThrow();
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

const page = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Page 1',
  width: 1240,
  height: 1754,
  background: '#ffffff',
  masterPageId: null,
  layers: [],
};

const base = {
  schemaVersion: 1 as const,
  id: '22222222-2222-4222-8222-222222222222',
  contentType: 'invoice',
  brandId: 'skam',
  masterPages: [],
  pages: [page],
  metadata: {},
};

describe('template-instance document body', () => {
  it('parses a document carrying a template-instance body', () => {
    const doc = BrandOSDocumentSchema.parse({
      ...base,
      body: {
        kind: 'template-instance',
        templateId: 'invoices-ext-4',
        content: defaultContentFor('invoice', { name: 'SKAM' }),
        design: { primaryColor: '#E5322D' },
      },
    });
    expect(doc.body?.kind).toBe('template-instance');
    if (doc.body?.kind !== 'template-instance') throw new Error('narrowing failed');
    expect(doc.body.templateId).toBe('invoices-ext-4');
    expect(doc.body.content.kind).toBe('invoice');
  });

  it('leaves a layer document unchanged — body is absent, not null', () => {
    const doc = BrandOSDocumentSchema.parse(base);
    expect(doc.body).toBeUndefined();
    expect('body' in JSON.parse(JSON.stringify(doc))).toBe(false);
  });

  it('rejects a body whose content does not match the union', () => {
    expect(() =>
      BrandOSDocumentSchema.parse({
        ...base,
        body: { kind: 'template-instance', templateId: 'x', content: { kind: 'nope' }, design: {} },
      }),
    ).toThrow();
  });
});
