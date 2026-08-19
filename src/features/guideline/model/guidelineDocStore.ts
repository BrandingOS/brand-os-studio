/**
 * Where a brand's guideline document lives.
 *
 * localStorage, per brand, under one key. Two reasons it is not IndexedDB like
 * the slide snapshots: the document is a page list and four optional strings —
 * kilobytes, not megabytes — and it must be readable SYNCHRONOUSLY on first
 * paint, because "has this brand got a guideline yet?" decides whether the
 * route shows the empty state or the builder, and an async answer would flash
 * the wrong one.
 *
 * A server-backed implementation swaps in behind the same actions when a
 * `guideline_documents` table exists. Nothing above this file reads storage.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Brand } from '@/shared/types/brand';
import {
  buildDefaultDocument, clampIndex, createPage,
  type GuidelineDoc, type GuidelineOverrides, type GuidelinePage,
} from './document';

export const GUIDELINE_DOCS_KEY = 'brandos:guideline:docs';

/**
 * The editor key slide snapshots are stored under.
 *
 * `brand-guides` is load-bearing and must not change: it is the prefix the
 * pre-builder deck used, and every edit anyone has already made is filed under
 * it. Renaming it would not throw — it would silently show everyone the
 * untouched template again.
 */
export function guidelineEditorKey(brandId: string): string {
  return `brand-guides-${brandId}`;
}

interface GuidelineDocState {
  docs: Record<string, GuidelineDoc>;
  hasHydrated: boolean;

  get: (brandId: string) => GuidelineDoc | undefined;
  build: (brand: Brand) => GuidelineDoc;
  discard: (brandId: string) => void;
  /**
   * Put a whole document back. This is the undo/redo write path — it restores
   * a snapshot verbatim, so unlike every other action here it must NOT stamp
   * `updatedAt`, or replaying a snapshot would change it.
   */
  replace: (brandId: string, doc: GuidelineDoc) => void;

  insertPage: (brandId: string, type: string, index: number) => GuidelinePage | undefined;
  duplicatePage: (brandId: string, pageId: string) => GuidelinePage | undefined;
  removePage: (brandId: string, pageId: string) => void;
  movePage: (brandId: string, pageId: string, delta: number) => void;
  updatePage: (brandId: string, pageId: string, patch: Partial<Omit<GuidelinePage, 'id' | 'type'>>) => void;
  setOverride: (brandId: string, key: keyof GuidelineOverrides, value: string | undefined) => void;

  _setHasHydrated: (v: boolean) => void;
}

/**
 * `Date.now()` is called here rather than passed in because these are user
 * actions in a browser, not workflow steps — but `buildDefaultDocument` takes
 * the timestamp so it stays a pure function the tests can pin.
 */
function stamp(): string {
  return new Date().toISOString();
}

/**
 * Copy-on-write for one brand's document.
 *
 * `fn` mutates a shallow draft rather than returning a new object: every action
 * here is a small edit to a list, and threading an immutable update through
 * each one buys nothing. Returning `null` when the brand has no document keeps
 * every action a no-op instead of creating one by accident.
 */
function mutate(
  state: GuidelineDocState,
  brandId: string,
  fn: (doc: GuidelineDoc) => void,
): Partial<GuidelineDocState> | null {
  const current = state.docs[brandId];
  if (!current) return null;
  const draft: GuidelineDoc = { ...current, pages: current.pages.map((p) => ({ ...p })) };
  fn(draft);
  draft.updatedAt = stamp();
  return { docs: { ...state.docs, [brandId]: draft } };
}

export const useGuidelineDocStore = create<GuidelineDocState>()(
  persist(
    (set, get) => ({
      docs: {},
      hasHydrated: false,

      get: (brandId) => get().docs[brandId],

      build: (brand) => {
        const doc = buildDefaultDocument(brand, stamp());
        set((state) => ({ docs: { ...state.docs, [brand.id]: doc } }));
        return doc;
      },

      replace: (brandId, doc) =>
        set((state) => ({ docs: { ...state.docs, [brandId]: doc } })),

      discard: (brandId) =>
        set((state) => {
          const next = { ...state.docs };
          delete next[brandId];
          return { docs: next };
        }),

      insertPage: (brandId, type, index) => {
        const doc = get().docs[brandId];
        if (!doc) return undefined;
        const page = createPage(type, new Set(doc.pages.map((p) => p.id)));
        set((state) => mutate(state, brandId, (d) => {
          d.pages.splice(clampIndex(index, d.pages.length), 0, page);
        }) ?? {});
        return page;
      },

      duplicatePage: (brandId, pageId) => {
        const doc = get().docs[brandId];
        if (!doc) return undefined;
        const at = doc.pages.findIndex((p) => p.id === pageId);
        if (at < 0) return undefined;
        const source = doc.pages[at];
        const copy: GuidelinePage = {
          ...source,
          id: createPage(source.type, new Set(doc.pages.map((p) => p.id))).id,
        };
        set((state) => mutate(state, brandId, (d) => {
          d.pages.splice(at + 1, 0, copy);
        }) ?? {});
        return copy;
      },

      removePage: (brandId, pageId) =>
        set((state) => mutate(state, brandId, (d) => {
          d.pages = d.pages.filter((p) => p.id !== pageId);
        }) ?? {}),

      movePage: (brandId, pageId, delta) =>
        set((state) => mutate(state, brandId, (d) => {
          const from = d.pages.findIndex((p) => p.id === pageId);
          if (from < 0) return;
          const to = from + delta;
          if (to < 0 || to >= d.pages.length) return;
          const [page] = d.pages.splice(from, 1);
          d.pages.splice(to, 0, page);
        }) ?? {}),

      updatePage: (brandId, pageId, patch) =>
        set((state) => mutate(state, brandId, (d) => {
          d.pages = d.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p));
        }) ?? {}),

      setOverride: (brandId, key, value) =>
        set((state) => mutate(state, brandId, (d) => {
          const overrides = { ...d.overrides };
          // An empty override is not an override — deleting the key keeps
          // `hasOverrides` honest and stops "differs from brand" chips from
          // appearing next to a value that matches the brand exactly.
          if (value === undefined || value === '') delete overrides[key];
          else overrides[key] = value;
          d.overrides = overrides;
        }) ?? {}),

      _setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: GUIDELINE_DOCS_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ docs: s.docs } as any),
      onRehydrateStorage: () => (state) => state?._setHasHydrated(true),
    },
  ),
);
