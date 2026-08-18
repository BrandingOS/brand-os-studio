/**
 * The store — page CRUD, guideline-scoped overrides, and the persistence key.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { guidelineEditorKey, useGuidelineDocStore } from '../model/guidelineDocStore';
import type { Brand } from '@/shared/types/brand';

const brand = {
  id: 'b1', slug: 'acme', name: 'Acme',
  primaryColor: '#123456', fonts: { primary: 'Inter' },
  tone: '', audience: '', assets: [],
  createdAt: new Date(), updatedAt: new Date(),
} as unknown as Brand;

const ids = () => useGuidelineDocStore.getState().get(brand.id)!.pages.map((p) => p.id);

beforeEach(() => {
  useGuidelineDocStore.setState({ docs: {} });
});

describe('the editor key', () => {
  it('is still brand-guides-<id>', () => {
    // Pinned deliberately. Slide edits are filed under this prefix, including
    // every edit made at the retired /b/:slug/brand-guides. A rename here is
    // not an error anyone sees — it is everyone's work quietly disappearing.
    expect(guidelineEditorKey('b1')).toBe('brand-guides-b1');
  });
});

describe('building', () => {
  it('creates a document for the brand and only that brand', () => {
    useGuidelineDocStore.getState().build(brand);
    expect(useGuidelineDocStore.getState().get('b1')).toBeDefined();
    expect(useGuidelineDocStore.getState().get('other')).toBeUndefined();
  });

  it('discards on request', () => {
    useGuidelineDocStore.getState().build(brand);
    useGuidelineDocStore.getState().discard('b1');
    expect(useGuidelineDocStore.getState().get('b1')).toBeUndefined();
  });
});

describe('pages', () => {
  beforeEach(() => { useGuidelineDocStore.getState().build(brand); });

  it('inserts at an index', () => {
    const page = useGuidelineDocStore.getState().insertPage('b1', 'motion', 1);
    expect(page).toBeDefined();
    expect(ids()[1]).toBe(page!.id);
  });

  it('gives a second instance of a type its own id', () => {
    // 'motion' already exists in the default document, so the new page must
    // not reuse that id — the id IS the edit's storage key.
    const page = useGuidelineDocStore.getState().insertPage('b1', 'motion', 0)!;
    expect(page.id).toBe('motion-2');
    expect(new Set(ids()).size).toBe(ids().length);
  });

  it('appends when the index is past the end', () => {
    const page = useGuidelineDocStore.getState().insertPage('b1', 'motion', 9999)!;
    expect(ids()[ids().length - 1]).toBe(page.id);
  });

  it('duplicates a page directly after it, carrying its title', () => {
    useGuidelineDocStore.getState().updatePage('b1', 'cover', { title: 'Front' });
    const copy = useGuidelineDocStore.getState().duplicatePage('b1', 'cover')!;
    expect(copy.title).toBe('Front');
    expect(ids()[1]).toBe(copy.id);
    expect(copy.id).not.toBe('cover');
  });

  it('removes and moves', () => {
    useGuidelineDocStore.getState().removePage('b1', 'cover');
    expect(ids()).not.toContain('cover');

    const before = ids();
    useGuidelineDocStore.getState().movePage('b1', before[2], -1);
    expect(ids()[1]).toBe(before[2]);
  });

  it('refuses to move a page off either end', () => {
    const before = ids();
    useGuidelineDocStore.getState().movePage('b1', before[0], -1);
    useGuidelineDocStore.getState().movePage('b1', before[before.length - 1], 1);
    expect(ids()).toEqual(before);
  });

  it('ignores actions for a brand with no document', () => {
    expect(useGuidelineDocStore.getState().insertPage('nope', 'motion', 0)).toBeUndefined();
    expect(() => useGuidelineDocStore.getState().removePage('nope', 'cover')).not.toThrow();
  });
});

describe('overrides', () => {
  beforeEach(() => { useGuidelineDocStore.getState().build(brand); });

  it('stores a guideline-scoped value', () => {
    useGuidelineDocStore.getState().setOverride('b1', 'primaryColor', '#ff0000');
    expect(useGuidelineDocStore.getState().get('b1')!.overrides.primaryColor).toBe('#ff0000');
  });

  it('deletes the key when cleared, rather than storing an empty string', () => {
    // An empty override would keep reading as "differs from brand" forever.
    useGuidelineDocStore.getState().setOverride('b1', 'primaryColor', '#ff0000');
    useGuidelineDocStore.getState().setOverride('b1', 'primaryColor', undefined);
    expect('primaryColor' in useGuidelineDocStore.getState().get('b1')!.overrides).toBe(false);

    useGuidelineDocStore.getState().setOverride('b1', 'headingFont', '');
    expect('headingFont' in useGuidelineDocStore.getState().get('b1')!.overrides).toBe(false);
  });

  it('never touches the brand record', () => {
    useGuidelineDocStore.getState().setOverride('b1', 'primaryColor', '#ff0000');
    expect(brand.primaryColor).toBe('#123456');
  });
});
