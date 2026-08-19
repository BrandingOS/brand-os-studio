// Feature-local persisted preferences for the Generate panel.
// localStorage key: `brandos:ai-image:prefs`.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AUTO_MODEL_ID, isTestModel } from '@/features/editor/ai/imageModels';

interface GeneratePrefs {
  /** Brand-aware compiler on/off. */
  brandAware: boolean;
  /** Last picked model / count so the panel reopens as left. */
  model: string;
  count: number;
  /** Exact words to set. Not persisted — copy belongs to one design. */
  setBrandAware: (b: boolean) => void;
  setModel: (m: string) => void;
  setCount: (n: number) => void;
}

export const useGeneratePrefs = create<GeneratePrefs>()(
  persist(
    (set) => ({
      brandAware: true,
      model: 'auto',
      count: 1,
      setBrandAware: (brandAware) => set({ brandAware }),
      setModel: (model) => set({ model }),
      setCount: (count) => set({ count: Math.min(4, Math.max(1, Math.trunc(count) || 1)) }),
    }),
    {
      name: 'brandos:ai-image:prefs',
      version: 2,
      /**
       * A free test model, once picked, used to stick forever — every later
       * generation quietly came out soft and typeless, and nothing in the UI
       * connected the two. Trying one out is not a standing instruction to use
       * it for all future brand work, so a persisted test model is returned to
       * Auto once. An explicit re-pick still persists.
       */
      migrate: (persisted, version) => {
        const p = persisted as Partial<GeneratePrefs> | undefined;
        if (!p) return p as GeneratePrefs;
        if (version < 2 && isTestModel(p.model)) return { ...p, model: AUTO_MODEL_ID } as GeneratePrefs;
        return p as GeneratePrefs;
      },
    },
  ),
);
