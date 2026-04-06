/**
 * Persisted store of "logo presentation documents" per brand.
 *
 * Each document is an independent saved instance with its own concepts,
 * brief, template choice, and slide overrides. Editing a document does
 * NOT affect the brand or any other document. Picking a template creates
 * a NEW document — never edits the original.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LogoConcept, PresentationTemplate } from './types';

/** A user-added extra slide for a logo presentation doc */
export interface LogoExtraSlide {
  id: string;
  layout: 'cover' | 'section' | 'two-col' | 'two-col-reverse' | 'full-bleed' | 'three-col' | 'quote' | 'stats' | 'list' | 'closing';
  data: Record<string, any>;
}

export interface LogoPresentationDoc {
  id: string;
  brandId: string;
  name: string;
  concepts: LogoConcept[];
  brief: string;
  personality: string;
  clientName: string;
  template: PresentationTemplate;
  /** Per-slide field overrides applied on top of the rendered slides */
  slideOverrides: Record<string, Record<string, any>>;
  /** User-added extra slides appended after the auto-generated ones */
  extraSlides: LogoExtraSlide[];
  /** Auto-generated slide ids the user has hidden */
  hiddenSlideIds: string[];
  createdAt: number;
  updatedAt: number;
}

/** In-progress setup draft (before user clicks Generate) */
export interface LogoSetupDraft {
  concepts: LogoConcept[];
  brief: string;
  personality: string;
  clientName: string;
  template: PresentationTemplate;
}

interface LogoDocsState {
  /** brandId → docs */
  docs: Record<string, LogoPresentationDoc[]>;
  /** brandId → currently active doc id */
  activeDocId: Record<string, string | null>;
  /** brandId → in-progress setup draft (for ?new=1 view) */
  setupDrafts: Record<string, LogoSetupDraft>;

  listForBrand: (brandId: string) => LogoPresentationDoc[];
  get: (brandId: string, docId: string) => LogoPresentationDoc | undefined;
  create: (brandId: string, draft: Omit<LogoPresentationDoc, 'id' | 'brandId' | 'createdAt' | 'updatedAt' | 'slideOverrides'>) => LogoPresentationDoc;
  update: (brandId: string, docId: string, patch: Partial<LogoPresentationDoc>) => void;
  rename: (brandId: string, docId: string, name: string) => void;
  remove: (brandId: string, docId: string) => void;
  updateConcept: (brandId: string, docId: string, index: number, concept: LogoConcept) => void;
  addConcept: (brandId: string, docId: string, concept: LogoConcept) => void;
  removeConcept: (brandId: string, docId: string, index: number) => void;
  setSlideOverride: (brandId: string, docId: string, slideId: string, override: Record<string, any>) => void;
  addExtraSlide: (brandId: string, docId: string, layout: LogoExtraSlide['layout']) => LogoExtraSlide;
  removeExtraSlide: (brandId: string, docId: string, slideId: string) => void;
  hideSlide: (brandId: string, docId: string, slideId: string) => void;
  unhideSlide: (brandId: string, docId: string, slideId: string) => void;
  setActive: (brandId: string, docId: string | null) => void;
  duplicate: (brandId: string, docId: string) => LogoPresentationDoc | null;

  /** Setup draft methods (in-progress new presentation) */
  getSetupDraft: (brandId: string) => LogoSetupDraft | undefined;
  setSetupDraft: (brandId: string, draft: LogoSetupDraft) => void;
  clearSetupDraft: (brandId: string) => void;
}

function makeId(): string {
  return `logodoc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useLogoPresentationDocsStore = create<LogoDocsState>()(
  persist(
    (set, get) => ({
      docs: {},
      activeDocId: {},
      setupDrafts: {},

      getSetupDraft: (brandId) => get().setupDrafts[brandId],

      setSetupDraft: (brandId, draft) =>
        set((state) => ({
          setupDrafts: { ...state.setupDrafts, [brandId]: draft },
        })),

      clearSetupDraft: (brandId) =>
        set((state) => {
          const { [brandId]: _, ...rest } = state.setupDrafts;
          return { setupDrafts: rest };
        }),

      listForBrand: (brandId) => get().docs[brandId] || [],

      get: (brandId, docId) =>
        (get().docs[brandId] || []).find((d) => d.id === docId),

      create: (brandId, draft) => {
        const doc: LogoPresentationDoc = {
          id: makeId(),
          brandId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          slideOverrides: {},
          extraSlides: [],
          hiddenSlideIds: [],
          ...draft,
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

      update: (brandId, docId, patch) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) =>
              d.id === docId ? { ...d, ...patch, updatedAt: Date.now() } : d
            ),
          },
        })),

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
            activeDocId: wasActive ? { ...state.activeDocId, [brandId]: null } : state.activeDocId,
          };
        }),

      updateConcept: (brandId, docId, index, concept) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) => {
              if (d.id !== docId) return d;
              const concepts = d.concepts.map((c, i) => (i === index ? concept : c));
              return { ...d, concepts, updatedAt: Date.now() };
            }),
          },
        })),

      addConcept: (brandId, docId, concept) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) =>
              d.id === docId
                ? { ...d, concepts: [...d.concepts, concept], updatedAt: Date.now() }
                : d
            ),
          },
        })),

      removeConcept: (brandId, docId, index) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) =>
              d.id === docId
                ? { ...d, concepts: d.concepts.filter((_, i) => i !== index), updatedAt: Date.now() }
                : d
            ),
          },
        })),

      setSlideOverride: (brandId, docId, slideId, override) =>
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: (state.docs[brandId] || []).map((d) => {
              if (d.id !== docId) return d;
              return {
                ...d,
                slideOverrides: {
                  ...d.slideOverrides,
                  [slideId]: { ...(d.slideOverrides[slideId] || {}), ...override },
                },
                updatedAt: Date.now(),
              };
            }),
          },
        })),

      addExtraSlide: (brandId, docId, layout) => {
        const newSlide: LogoExtraSlide = {
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

      duplicate: (brandId, docId) => {
        const doc = get().get(brandId, docId);
        if (!doc) return null;
        const dup: LogoPresentationDoc = {
          ...doc,
          id: makeId(),
          name: `${doc.name} (copy)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          docs: {
            ...state.docs,
            [brandId]: [...(state.docs[brandId] || []), dup],
          },
        }));
        return dup;
      },
    }),
    {
      name: 'logo-presentation-docs',
    },
  ),
);
