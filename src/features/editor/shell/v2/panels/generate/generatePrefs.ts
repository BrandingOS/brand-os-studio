// Feature-local persisted preferences for the Generate panel.
// localStorage key: `brandos:ai-image:prefs`.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PromptReviewMode = 'review' | 'auto';

interface GeneratePrefs {
  /** 'review' shows the compiled prompt and waits; 'auto' generates
   *  right after compiling (the compiled prompt still shows). */
  review: PromptReviewMode;
  /** Brand-aware compiler on/off. */
  brandAware: boolean;
  /** Last picked model / count so the panel reopens as left. */
  model: string;
  count: number;
  setReview: (r: PromptReviewMode) => void;
  setBrandAware: (b: boolean) => void;
  setModel: (m: string) => void;
  setCount: (n: number) => void;
}

export const useGeneratePrefs = create<GeneratePrefs>()(
  persist(
    (set) => ({
      review: 'review',
      brandAware: true,
      model: 'auto',
      count: 1,
      setReview: (review) => set({ review }),
      setBrandAware: (brandAware) => set({ brandAware }),
      setModel: (model) => set({ model }),
      setCount: (count) => set({ count: Math.min(4, Math.max(1, Math.trunc(count) || 1)) }),
    }),
    { name: 'brandos:ai-image:prefs' },
  ),
);
