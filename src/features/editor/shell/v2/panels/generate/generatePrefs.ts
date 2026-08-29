// Feature-local persisted preferences for the Generate panel.
// localStorage key: `brandos:ai-image:prefs`.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AUTO_MODEL_ID, isTestModel } from '@/features/editor/ai/imageModels';
import { ALL_BRAND_INCLUDED, type BrandInclusions } from '@/features/editor/ai/imagePrompt/artDirection';

interface GeneratePrefs {
  /**
   * Which parts of the brand may enter the frame.
   *
   * Replaces the old `brandAware` boolean. That switch asked the wrong
   * question — Raw meant "forget the brand entirely", so wanting your own
   * colours on one poster also cost you the logo and the typography.
   */
  include: BrandInclusions;
  /** Last picked model / count so the panel reopens as left. */
  model: string;
  count: number;
  setInclude: (patch: Partial<BrandInclusions>) => void;
  setModel: (m: string) => void;
  /** Accepts an updater so rapid clicks cannot compute from a stale value. */
  setCount: (n: number | ((cur: number) => number)) => void;
}

export const useGeneratePrefs = create<GeneratePrefs>()(
  persist(
    (set) => ({
      include: { ...ALL_BRAND_INCLUDED },
      model: AUTO_MODEL_ID,
      count: 1,
      setInclude: (patch) => set((s) => ({ include: { ...s.include, ...patch } })),
      setModel: (model) => set({ model }),
      setCount: (next) => set((s) => {
        const raw = typeof next === 'function' ? next(s.count) : next;
        return { count: Math.min(4, Math.max(1, Math.trunc(raw) || 1)) };
      }),
    }),
    {
      name: 'brandos:ai-image:prefs',
      version: 3,
      /**
       * v2: a free test model, once picked, used to stick forever — every later
       * generation quietly came out soft and typeless, and nothing in the UI
       * connected the two. Trying one out is not a standing instruction to use
       * it for all future brand work, so a persisted test model is returned to
       * Auto once. An explicit re-pick still persists.
       *
       * v3: `brandAware` became four independent inclusions. Anyone who had
       * turned Raw on was asking for ONE of those four, and we cannot tell
       * which — so everyone starts from everything included, which is the
       * answer that loses no brand information.
       */
      migrate: (persisted, version) => {
        const p = persisted as (Partial<GeneratePrefs> & { brandAware?: boolean }) | undefined;
        if (!p) return p as GeneratePrefs;
        const next: Partial<GeneratePrefs> = { ...p };
        if (version < 2 && isTestModel(p.model)) next.model = AUTO_MODEL_ID;
        if (version < 3) {
          delete (next as { brandAware?: boolean }).brandAware;
          next.include = { ...ALL_BRAND_INCLUDED };
        }
        // A hand-edited or partial bag must still be a complete answer.
        next.include = { ...ALL_BRAND_INCLUDED, ...(next.include ?? {}) };
        return next as GeneratePrefs;
      },
    },
  ),
);
