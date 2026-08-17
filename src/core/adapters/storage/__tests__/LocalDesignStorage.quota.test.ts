/**
 * LocalDesignStorage — big bodies (AI images as data URIs) overflow into
 * IndexedDB when localStorage throws QuotaExceededError; reads are
 * transparent; delete clears both.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const idb = new Map<string, string>();
vi.mock('@/shared/editor/idbStorage', () => ({
  idbStringStorage: {
    getItem: async (k: string) => idb.get(k) ?? null,
    setItem: async (k: string, v: string) => { idb.set(k, v); },
    removeItem: async (k: string) => { idb.delete(k); },
  },
}));

import { LocalDesignStorage } from '../LocalDesignStorage';

describe('LocalDesignStorage — quota overflow to IndexedDB', () => {
  beforeEach(() => { localStorage.clear(); idb.clear(); });

  it('falls back to IDB on QuotaExceededError and reads it back', async () => {
    const store = new LocalDesignStorage();
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k.startsWith('brandos:design:') && v.length > 100) {
        throw new DOMException('quota', 'QuotaExceededError');
      }
      return original.call(this, k, v);
    });
    try {
      const big = { pages: [{ src: 'x'.repeat(500) }] };
      await store.saveDesign('b', 'd', big, { name: 'Big' });
      expect(localStorage.getItem('brandos:design:b:d')).toBe('{"__idb":1}');
      expect(idb.has('brandos:design:b:d')).toBe(true);
      expect(await store.loadDesign('b', 'd')).toEqual(big);
      expect((await store.listDesigns('b')).find((s) => s.id === 'd')?.name).toBe('Big');
      await store.deleteDesign('b', 'd');
      expect(await store.loadDesign('b', 'd')).toBeNull();
      expect(idb.has('brandos:design:b:d')).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it('small bodies stay in localStorage', async () => {
    const store = new LocalDesignStorage();
    await store.saveDesign('b', 's', { a: 1 });
    expect(localStorage.getItem('brandos:design:b:s')).toBe('{"a":1}');
    expect(idb.size).toBe(0);
    expect(await store.loadDesign('b', 's')).toEqual({ a: 1 });
  });
});
