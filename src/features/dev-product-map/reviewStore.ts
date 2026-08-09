/**
 * Owner review decisions for the Product Surface Explorer.
 * Persisted LOCALLY only (localStorage) — marking REMOVE changes no product code;
 * it is an inventory/review layer the owner exports and acts on later.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReviewDecision } from './types';

interface ReviewState {
  decisions: Record<string, ReviewDecision>;
  setDecision: (id: string, d: ReviewDecision) => void;
  decisionFor: (id: string) => ReviewDecision;
  clearAll: () => void;
}

export const useSurfaceReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      decisions: {},
      setDecision: (id, d) =>
        set((s) => {
          const next = { ...s.decisions };
          if (d === 'undecided') delete next[id];
          else next[id] = d;
          return { decisions: next };
        }),
      decisionFor: (id) => get().decisions[id] ?? 'undecided',
      clearAll: () => set({ decisions: {} }),
    }),
    { name: 'brandos:dev:product-map-review' },
  ),
);
