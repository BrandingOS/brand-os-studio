// Unit tests for brandkit template seeds.
//
// Each family seed must produce a document that:
//   1. parses cleanly against BrandOSDocumentSchema (structural)
//   2. references a registered ContentTypeConfig (route-mount safety)
//   3. uses brand-bound SlotRefs for at least one color and one font
//      (the entire point of the migration — without slot binding the
//      seeds would just be hardcoded designs that ignore the brand)
//   4. carries the brand id through to the document
//
// Plus a couple of dispatcher-level sanity tests.

import { describe, expect, it } from 'vitest';
import {
  TEMPLATE_SEEDS,
  getTemplateSeed,
  validateSeed,
} from './templateSeeds';
import { CONTENT_TYPES } from '@/features/editor/content-types';
import type { Brand } from '@/shared/types/brand';
import type { ResolvedValue } from '@/features/editor/schema';

function mockBrand(): Brand {
  return {
    id: 'brand-mock-uuid',
    slug: 'mock',
    name: 'Mock Brand',
    primaryColor: '#3b82f6',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const FAMILY_IDS = Object.keys(TEMPLATE_SEEDS).sort();

function isSlotRef(value: ResolvedValue | null | undefined): boolean {
  return !!value && typeof value !== 'string' && typeof value !== 'number';
}

function collectColorAndFontValues(
  doc: ReturnType<typeof TEMPLATE_SEEDS[string]>,
): { colors: ResolvedValue[]; fonts: ResolvedValue[] } {
  const colors: ResolvedValue[] = [];
  const fonts: ResolvedValue[] = [];
  for (const page of doc.pages) {
    if (page.background !== undefined) colors.push(page.background);
    for (const layer of page.layers) {
      if (layer.kind === 'text') {
        colors.push(layer.color);
        fonts.push(layer.fontFamily);
      } else if (layer.kind === 'shape') {
        if (layer.fill !== null) colors.push(layer.fill);
        if (layer.stroke !== null) colors.push(layer.stroke);
      }
    }
  }
  return { colors, fonts };
}

describe('brandkit template seeds — structural validity', () => {
  it.each(FAMILY_IDS)('seed for "%s" parses against BrandOSDocumentSchema', (familyId) => {
    const seed = TEMPLATE_SEEDS[familyId];
    const doc = seed(mockBrand());
    expect(() => validateSeed(doc)).not.toThrow();
  });

  it.each(FAMILY_IDS)('seed for "%s" targets a registered ContentTypeConfig', (familyId) => {
    const seed = TEMPLATE_SEEDS[familyId];
    const doc = seed(mockBrand());
    expect(CONTENT_TYPES[doc.contentType], `unknown contentType: ${doc.contentType}`).toBeDefined();
  });

  it.each(FAMILY_IDS)('seed for "%s" carries the brand id', (familyId) => {
    const brand = mockBrand();
    const seed = TEMPLATE_SEEDS[familyId];
    const doc = seed(brand);
    expect(doc.brandId).toBe(brand.id);
  });

  it.each(FAMILY_IDS)('seed for "%s" emits at least one brand-bound color SlotRef', (familyId) => {
    const seed = TEMPLATE_SEEDS[familyId];
    const doc = seed(mockBrand());
    const { colors } = collectColorAndFontValues(doc);
    const slotColors = colors.filter(isSlotRef);
    expect(
      slotColors.length,
      `${familyId}: no SlotRef colors — every seed must be brand-aware`,
    ).toBeGreaterThan(0);
  });

  it.each(FAMILY_IDS)('seed for "%s" uses a brand-bound font SlotRef on at least one text layer', (familyId) => {
    const seed = TEMPLATE_SEEDS[familyId];
    const doc = seed(mockBrand());
    const { fonts } = collectColorAndFontValues(doc);
    if (fonts.length === 0) {
      // profile-icons has no text layers — that's allowed.
      expect(familyId).toBe('profile-icons');
      return;
    }
    const slotFonts = fonts.filter(isSlotRef);
    expect(
      slotFonts.length,
      `${familyId}: no SlotRef fonts — typography must be brand-bound`,
    ).toBeGreaterThan(0);
  });
});

describe('TEMPLATE_SEEDS dispatcher', () => {
  it('exposes exactly the eight migrated families (mockups deliberately absent)', () => {
    expect(FAMILY_IDS).toEqual([
      'brand-guides',
      'business-cards',
      'facebook-covers',
      'instagram-posts',
      'instagram-stories',
      'invoices',
      'presentations',
      'profile-icons',
    ]);
  });

  it('does NOT include mockups (deferred per Step 9.3a + vision doc Phase 3.5 absorption note)', () => {
    expect(TEMPLATE_SEEDS).not.toHaveProperty('mockups');
  });

  it('getTemplateSeed throws on unknown family with a helpful message', () => {
    expect(() => getTemplateSeed('mockups')).toThrow(/Mockups intentionally absent/);
    expect(() => getTemplateSeed('not-a-family')).toThrow(/Unknown brandkit template family/);
  });

  it('layer ids are unique within a single seeded document (no id collisions)', () => {
    for (const familyId of FAMILY_IDS) {
      const doc = TEMPLATE_SEEDS[familyId](mockBrand());
      const ids: string[] = [];
      for (const page of doc.pages) {
        ids.push(page.id);
        for (const layer of page.layers) ids.push(layer.id);
      }
      const unique = new Set(ids);
      expect(unique.size, `${familyId}: id collision`).toBe(ids.length);
    }
  });

  it('two calls to the same seed produce documents with different ids (fresh uuids)', () => {
    for (const familyId of FAMILY_IDS) {
      const a = TEMPLATE_SEEDS[familyId](mockBrand());
      const b = TEMPLATE_SEEDS[familyId](mockBrand());
      expect(a.id).not.toBe(b.id);
      expect(a.pages[0].id).not.toBe(b.pages[0].id);
    }
  });
});
