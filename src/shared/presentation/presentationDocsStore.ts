/**
 * Persisted store of "presentation documents" per brand.
 *
 * Each document is a saved instance created from a (style, contentType)
 * template. Edits to a document do NOT affect the brand or the template —
 * they only affect this specific document. Each document has its own
 * settings, slide overrides, and timestamps.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContentType } from './templates';
import type { PresentationSettings } from './types';

/**
 * Per-slide content overrides. Each key is a slide id (e.g. 'cover',
 * 'mission', 'concept-1-title'), and the value is a partial set of
 * field overrides that get merged on top of the default props produced
 * by buildTemplateSlides.
 */
export interface SlideOverride {
  title?: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  logoUrl?: string;
  quote?: string;
  quoteAuthor?: string;
  sectionLabel?: string;
  sectionNumber?: string;
  items?: Array<{ title: string; description: string; icon?: string }>;
  columns?: Array<{ title: string; body: string; imageUrl?: string }>;
  stats?: Array<{ value: string; label: string }>;
  bgColor?: string;
}

/** A user-added extra slide. Layout id picks the page component. */
export interface ExtraSlide {
  id: string;
  layout: 'cover' | 'section' | 'two-col' | 'two-col-reverse' | 'full-bleed' | 'three-col' | 'quote' | 'stats' | 'list' | 'closing';
  data: SlideOverride;
}

export interface PresentationDocument {
  id: string;
  brandId: string;
  name: string;
  styleId: string;
  contentType: ContentType;
  settings?: Partial<PresentationSettings>;
  slideOverrides: Record<string, SlideOverride>;
  /**
   * Per-slide HTML snapshots — the latest cleaned innerHTML of each
   * `[data-slide-canvas]` after the user has edited it. Re-injected on
   * mount so edits survive reload. Keyed by slide id.
   */
  slideHTMLSnapshots?: Record<string, string>;
  /** User-added extra slides appended after the auto-generated ones */
  extraSlides: ExtraSlide[];
  /** Auto-generated slide ids the user has hidden */
  hiddenSlideIds: string[];
  createdAt: number;
  updatedAt: number;
}

interface PresentationDocsState {
  /** brandId → PresentationDocument[] */
  docs: Record<string, PresentationDocument[]>;
  /** brandId → currently active doc id (for reload restoration) */
  activeDocId: Record<string, string | null>;

  listForBrand: (brandId: string) => PresentationDocument[];
  get: (brandId: string, docId: string) => PresentationDocument | undefined;
  create: (brandId: string, styleId: string, contentType: ContentType, name?: string) => PresentationDocument;
  rename: (brandId: string, docId: string, name: string) => void;
  remove: (brandId: string, docId: string) => void;
  updateSettings: (brandId: string, docId: string, settings: Partial<PresentationSettings>) => void;
  updateStyle: (brandId: string, docId: string, styleId: string) => void;
  setSlideOverride: (brandId: string, docId: string, slideId: string, override: Partial<SlideOverride>) => void;
  setSlideHTMLSnapshot: (brandId: string, docId: string, slideId: string, html: string) => void;
  clearSlideHTMLSnapshot: (brandId: string, docId: string, slideId: string) => void;
  addExtraSlide: (brandId: string, docId: string, layout: ExtraSlide['layout']) => ExtraSlide;
  removeExtraSlide: (brandId: string, docId: string, slideId: string) => void;
  hideSlide: (brandId: string, docId: string, slideId: string) => void;
  unhideSlide: (brandId: string, docId: string, slideId: string) => void;
  setActive: (brandId: string, docId: string | null) => void;
  getActive: (brandId: string) => string | null;
}

function makeId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const usePresentationDocsStore = create<PresentationDocsState>()(
  persist(
    (set, get) => ({
      docs: {},
      activeDocId: {},

      listForBrand: (brandId) => get().docs[brandId] || [],

      get: (brandId, docId) => (get().docs[brandId] || []).find((d) => d.id === docId),

      create: (brandId, styleId, contentType, name) => {
        const doc: PresentationDocument = {
          id: makeId(),
          brandId,
          name: name || `${contentType.replace('-', ' ')} ${(get().docs[brandId]?.length || 0) + 1}`,
          styleId,
          contentType,
          slideOverrides: {},
          extraSlides: [],
          hiddenSlideIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: [...(state.docs[brandId] || []), doc],
          },
          activeDocId: { ...state.activeDocId, [brandId]: doc.id },
        }));
        return doc;
      },

      rename: (brandId, docId, name) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) =>
              d.id === docId ? { ...d, name, updatedAt: Date.now() } : d
            ),
          },
        })),

      remove: (brandId, docId) =>
        set((state) => {
          const next = (state.docs[brandId] || []).filter((d) => d.id !== docId);
          const wasActive = state.activeDocId[brandId] === docId;
          return {
            docs: { ...state.docs, [brandId]: next },
            activeDocId: wasActive
              ? { ...state.activeDocId, [brandId]: null }
              : state.activeDocId,
          };
        }),

      updateSettings: (brandId, docId, settings) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) =>
              d.id === docId
                ? { ...d, settings: { ...d.settings, ...settings }, updatedAt: Date.now() }
                : d
            ),
          },
        })),

      updateStyle: (brandId, docId, styleId) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) =>
              d.id === docId ? { ...d, styleId, updatedAt: Date.now() } : d
            ),
          },
        })),

      setSlideOverride: (brandId, docId, slideId, override) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) => {
              if (d.id !== docId) return d;
              const existing = d.slideOverrides[slideId] || {};
              return {
                ...d,
                slideOverrides: {
                  ...d.slideOverrides,
                  [slideId]: { ...existing, ...override },
                },
                updatedAt: Date.now(),
              };
            }),
          },
        })),

      setSlideHTMLSnapshot: (brandId, docId, slideId, html) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) =>
              d.id === docId
                ? {
                    ...d,
                    slideHTMLSnapshots: { ...(d.slideHTMLSnapshots || {}), [slideId]: html },
                    updatedAt: Date.now(),
                  }
                : d
            ),
          },
        })),

      clearSlideHTMLSnapshot: (brandId, docId, slideId) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) => {
              if (d.id !== docId) return d;
              const next = { ...(d.slideHTMLSnapshots || {}) };
              delete next[slideId];
              return { ...d, slideHTMLSnapshots: next, updatedAt: Date.now() };
            }),
          },
        })),

      addExtraSlide: (brandId, docId, layout) => {
        const newSlide: ExtraSlide = {
          id: `extra_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          layout,
          data: {},
        };
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) =>
              d.id === docId
                ? { ...d, extraSlides: [...(d.extraSlides || []), newSlide], updatedAt: Date.now() }
                : d
            ),
          },
        }));
        return newSlide;
      },

      removeExtraSlide: (brandId, docId, slideId) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) =>
              d.id === docId
                ? { ...d, extraSlides: (d.extraSlides || []).filter((s) => s.id !== slideId), updatedAt: Date.now() }
                : d
            ),
          },
        })),

      hideSlide: (brandId, docId, slideId) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) =>
              d.id === docId
                ? {
                    ...d,
                    hiddenSlideIds: Array.from(new Set([...(d.hiddenSlideIds || []), slideId])),
                    updatedAt: Date.now(),
                  }
                : d
            ),
          },
        })),

      unhideSlide: (brandId, docId, slideId) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) =>
              d.id === docId
                ? {
                    ...d,
                    hiddenSlideIds: (d.hiddenSlideIds || []).filter((id) => id !== slideId),
                    updatedAt: Date.now(),
                  }
                : d
            ),
          },
        })),

      setActive: (brandId, docId) =>
        set((state) => ({
          activeDocId: { ...state.activeDocId, [brandId]: docId },
        })),

      getActive: (brandId) => get().activeDocId[brandId] || null,
    }),
    {
      name: 'presentation-docs',
    },
  ),
);
