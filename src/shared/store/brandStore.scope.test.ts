import { describe, it, expect, vi, beforeEach } from 'vitest';

// The store reaches the brands service through the DI container; swap the
// container for a controllable fake so each test decides what `list()` returns
// and WHEN it resolves.
const H = vi.hoisted(() => {
  const list = vi.fn(async (): Promise<unknown[]> => []);
  return {
    list,
    container: {
      get: (key: string) =>
        key === 'brands'
          ? { list }
          : { listLibrary: async () => [], listLibraryForBrands: async () => new Map() },
    },
  };
});
vi.mock('@/core/container/ServiceContainer', () => ({ container: H.container }));
vi.mock('@/core/types/services', () => ({ SERVICE_KEYS: { BRANDS: 'brands', ASSETS: 'assets', BRAND_REPOSITORY: 'repo' } }));
vi.mock('@/shared/brand/libraryProjection', () => ({ projectLibraryOntoBrand: (b: unknown) => b }));
vi.mock('@/shared/design-system/fonts', () => ({ loadBrandFonts: () => {} }));
vi.mock('@/shared/design-system/PresentationStyleAdapter', () => ({ applyBrandTokens: () => {} }));

import { useBrandStore } from './brandStore';

const brand = (id: string) => ({ id, name: id, slug: id }) as never;
const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

beforeEach(() => {
  H.list.mockReset();
  H.list.mockImplementation(async () => []);
  useBrandStore.getState().resetScope();
});

describe('brandStore — data scope', () => {
  it('starts unconfirmed: an empty list is "not loaded", not "no brands"', () => {
    const s = useBrandStore.getState();
    expect(s.list).toEqual([]);
    expect(s.listReady).toBe(false);
  });

  it('a successful loadAll confirms the list, even when it is empty', async () => {
    await useBrandStore.getState().loadAll();
    expect(useBrandStore.getState().listReady).toBe(true);
    expect(useBrandStore.getState().list).toEqual([]);
  });

  it('a failed loadAll does NOT confirm the list', async () => {
    H.list.mockImplementation(async () => { throw new Error('offline'); });
    await useBrandStore.getState().loadAll();
    const s = useBrandStore.getState();
    expect(s.listReady).toBe(false);
    expect(s.error).toBe('offline');
  });

  it('resetScope drops the previous identity\'s brands immediately', async () => {
    H.list.mockImplementation(async () => [brand('theirs')]);
    await useBrandStore.getState().loadAll();
    expect(useBrandStore.getState().list).toHaveLength(1);
    useBrandStore.getState().resetScope();
    const s = useBrandStore.getState();
    expect(s.list).toEqual([]);
    expect(s.current).toBeUndefined();
    expect(s.listReady).toBe(false);
  });

  it('a load that started under the previous scope can never land in the new one', async () => {
    const slow = deferred<unknown[]>();
    H.list.mockImplementationOnce(() => slow.promise); // old scope (e.g. guest examples)
    const oldLoad = useBrandStore.getState().loadAll();

    useBrandStore.getState().resetScope(); // user signs in
    H.list.mockImplementationOnce(async () => [brand('mine')]);
    await useBrandStore.getState().loadAll();
    expect(useBrandStore.getState().list.map((b) => b.id)).toEqual(['mine']);

    slow.resolve([brand('demo-1'), brand('demo-2')]); // stale answer arrives late
    await oldLoad;
    expect(useBrandStore.getState().list.map((b) => b.id)).toEqual(['mine']);
    expect(useBrandStore.getState().listReady).toBe(true);
  });

  it('concurrent loadAll calls in one scope share a single request', async () => {
    const d = deferred<unknown[]>();
    H.list.mockImplementation(() => d.promise);
    const a = useBrandStore.getState().loadAll();
    const b = useBrandStore.getState().loadAll();
    expect(a).toBe(b);
    expect(H.list).toHaveBeenCalledTimes(1);
    d.resolve([brand('x')]);
    await a;
    // Once settled, a new call fetches again.
    await useBrandStore.getState().loadAll();
    expect(H.list).toHaveBeenCalledTimes(2);
  });
});
