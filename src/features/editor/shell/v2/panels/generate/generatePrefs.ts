// Feature-local persisted preferences for the Generate panel.
// localStorage key: `brandos:ai-image:prefs`.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GeneratePrefs {
  /** Brand-aware compiler on/off. */
  brandAware: boolean;
  /** Last picked model / count so the panel reopens as left. */
  model: string;
  count: number;
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
    { name: 'brandos:ai-image:prefs' },
  ),
);
