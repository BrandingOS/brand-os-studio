/**
 * Persisted store for Logo Presentation setup data.
 *
 * Stores concepts, brief, personality, client name, and template choice
 * per brand id so all changes persist across reloads. Each brand has its
 * own independent saved state in localStorage.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LogoConcept, PresentationTemplate } from './types';

export interface LogoPresentationDraft {
  concepts: LogoConcept[];
  brief: string;
  personality: string;
  clientName: string;
  template: PresentationTemplate;
}

interface LogoPresentationDataState {
  /** Map of brand id → draft data */
  drafts: Record<string, LogoPresentationDraft>;

  /** Get the draft for a brand (returns undefined if none saved) */
  getDraft: (brandId: string) => LogoPresentationDraft | undefined;

  /** Replace the entire draft for a brand */
  setDraft: (brandId: string, draft: LogoPresentationDraft) => void;

  /** Patch fields on the draft for a brand */
  updateDraft: (brandId: string, patch: Partial<LogoPresentationDraft>) => void;

  /** Update a single concept by index */
  updateConcept: (brandId: string, index: number, concept: LogoConcept) => void;

  /** Add a new concept */
  addConcept: (brandId: string, concept: LogoConcept) => void;

  /** Remove a concept by index */
  removeConcept: (brandId: string, index: number) => void;

  /** Clear the saved draft for a brand */
  clearDraft: (brandId: string) => void;
}

export const useLogoPresentationDataStore = create<LogoPresentationDataState>()(
  persist(
    (set, get) => ({
      drafts: {},

      getDraft: (brandId) => get().drafts[brandId],

      setDraft: (brandId, draft) =>
        set((state) => ({
          drafts: { ...state.drafts, [brandId]: draft },
        })),

      updateDraft: (brandId, patch) =>
        set((state) => {
          const existing = state.drafts[brandId];
          if (!existing) return state;
          return {
            drafts: { ...state.drafts, [brandId]: { ...existing, ...patch } },
          };
        }),

      updateConcept: (brandId, index, concept) =>
        set((state) => {
          const existing = state.drafts[brandId];
          if (!existing) return state;
          const concepts = existing.concepts.map((c, i) => (i === index ? concept : c));
          return {
            drafts: { ...state.drafts, [brandId]: { ...existing, concepts } },
          };
        }),

      addConcept: (brandId, concept) =>
        set((state) => {
          const existing = state.drafts[brandId];
          if (!existing) return state;
          return {
            drafts: {
              ...state.drafts,
              [brandId]: { ...existing, concepts: [...existing.concepts, concept] },
            },
          };
        }),

      removeConcept: (brandId, index) =>
        set((state) => {
          const existing = state.drafts[brandId];
          if (!existing) return state;
          return {
            drafts: {
              ...state.drafts,
              [brandId]: {
                ...existing,
                concepts: existing.concepts.filter((_, i) => i !== index),
              },
            },
          };
        }),

      clearDraft: (brandId) =>
        set((state) => {
          const { [brandId]: _, ...rest } = state.drafts;
          return { drafts: rest };
        }),
    }),
    {
      name: 'logo-presentation-data',
    },
  ),
);
