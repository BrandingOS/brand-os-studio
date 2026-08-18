/**
 * The document model, and the one rule in it that can lose user data silently.
 */
import { describe, expect, it } from 'vitest';
import {
  buildDefaultDocument, chapterTitleFor, clampIndex, createPage,
  newPageId, pageDisplayName, sectionIndexes, DEFAULT_PAGE_COUNT,
} from '../model/document';
import { getPageType, PAGE_TYPES } from '../model/pageLibrary';
import type { Brand } from '@/shared/types/brand';

const brand = {
  id: 'b1', slug: 'acme', name: 'Acme',
  primaryColor: '#123456', fonts: { primary: 'Inter' },
  tone: '', audience: '', assets: [],
  createdAt: new Date(), updatedAt: new Date(),
} as unknown as Brand;

const NOW = '2026-08-19T00:00:00.000Z';

describe('the default document', () => {
  it('is what the page count promises', () => {
    expect(buildDefaultDocument(brand, NOW).pages).toHaveLength(DEFAULT_PAGE_COUNT);
  });

  it('only uses page types that exist in the library', () => {
    for (const page of buildDefaultDocument(brand, NOW).pages) {
      expect(getPageType(page.type), `unknown type ${page.type}`).toBeDefined();
    }
  });

  it('gives every page a unique id', () => {
    const pages = buildDefaultDocument(brand, NOW).pages;
    expect(new Set(pages.map((p) => p.id)).size).toBe(pages.length);
  });

  it('keeps the historical slide ids, so edits made before the builder still load', () => {
    // Edits live in IndexedDB under `${editorKey}::${pageId}`. These ids are
    // the slide ids the pre-builder deck used; changing one does not throw, it
    // silently shows the user the untouched template again.
    const ids = new Set(buildDefaultDocument(brand, NOW).pages.map((p) => p.id));
    for (const legacy of [
      'cover', 'overview', 'intro', 'values', 'purpose', 'archetype',
      'logo-section', 'logo-grid', 'color-section', 'color-ratio', 'gradients',
      'dark-mode', 'patterns', 'typo-section', 'type-specimen', 'voice-section',
      'voice-dna', 'manifesto', 'icon-grid', 'photo-mood', 'universe', 'motion',
      'touchpoints', 'stationery', 'digital', 'colophon', 'closing',
    ]) {
      expect(ids.has(legacy), `lost the historical id "${legacy}"`).toBe(true);
    }
  });

  it('does not share page objects between two builds', () => {
    const a = buildDefaultDocument(brand, NOW);
    const b = buildDefaultDocument(brand, NOW);
    a.pages[0].title = 'Changed';
    expect(b.pages[0].title).not.toBe('Changed');
  });
});

describe('page ids', () => {
  it('gives the first instance of a type the bare type id', () => {
    expect(newPageId('logo-grid', new Set())).toBe('logo-grid');
  });

  it('suffixes later instances', () => {
    expect(newPageId('logo-grid', new Set(['logo-grid']))).toBe('logo-grid-2');
    expect(newPageId('logo-grid', new Set(['logo-grid', 'logo-grid-2']))).toBe('logo-grid-3');
  });

  it('never collides with an unrelated id that already looks suffixed', () => {
    const taken = new Set(['section', 'section-2', 'section-3']);
    expect(taken.has(newPageId('section', taken))).toBe(false);
  });

  it('seeds a new page with its type default title', () => {
    expect(createPage('section', new Set()).title).toBe('New chapter');
  });
});

describe('chapter numbering', () => {
  it('is derived from order, so moving a chapter renumbers it', () => {
    const pages = [
      { id: 'a', type: 'section', title: 'One' },
      { id: 'b', type: 'intro' },
      { id: 'c', type: 'section', title: 'Two' },
    ];
    expect(sectionIndexes(pages)).toEqual({ a: 1, c: 2 });
    const swapped = [pages[2], pages[1], pages[0]];
    expect(sectionIndexes(swapped)).toEqual({ c: 1, a: 2 });
  });

  it('reports the chapter a page sits under', () => {
    const pages = [
      { id: 'a', type: 'section', title: 'Logo' },
      { id: 'b', type: 'logo-grid' },
    ];
    expect(chapterTitleFor(pages, 'b')).toBe('Logo');
    // A page above the first divider belongs to no chapter.
    expect(chapterTitleFor([{ id: 'cover', type: 'cover' }], 'cover')).toBeUndefined();
  });
});

describe('display helpers', () => {
  it('falls back to the type name when the user has typed nothing', () => {
    expect(pageDisplayName({ id: 'x', type: 'logo-grid' })).toBe('Logo construction');
    expect(pageDisplayName({ id: 'x', type: 'logo-grid', title: '   ' })).toBe('Logo construction');
    expect(pageDisplayName({ id: 'x', type: 'logo-grid', title: 'Our mark' })).toBe('Our mark');
  });

  it('clamps an insertion index into the list', () => {
    expect(clampIndex(-4, 3)).toBe(0);
    expect(clampIndex(99, 3)).toBe(3);
    expect(clampIndex(Number.NaN, 3)).toBe(3);
  });
});

describe('the page library', () => {
  it('has unique ids', () => {
    expect(new Set(PAGE_TYPES.map((t) => t.id)).size).toBe(PAGE_TYPES.length);
  });
});
