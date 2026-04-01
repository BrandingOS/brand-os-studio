import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Add feature IDs here when launching new features.
 * Remove them when they're no longer "new" (e.g., after a few weeks).
 */
const NEW_FEATURES = [
  'wcag-colors',
  'ai-assistant',
  'pdf-export',
  'brand-apps',
  'team-panel',
  'dark-mode',
  'font-editor',
  'brand-strategy',
  'guidelines-templates',
];

interface FeatureIndicatorStore {
  seenFeatures: string[];
  markSeen: (id: string) => void;
  isNew: (id: string) => boolean;
  getNewFeatures: () => string[];
  resetAll: () => void;
}

export const useFeatureIndicatorStore = create<FeatureIndicatorStore>()(
  devtools(
    persist(
      (set, get) => ({
        seenFeatures: [],

        markSeen: (id: string) => {
          const current = get().seenFeatures;
          if (!current.includes(id)) {
            set({ seenFeatures: [...current, id] }, false, 'markSeen');
          }
        },

        isNew: (id: string) => {
          return NEW_FEATURES.includes(id) && !get().seenFeatures.includes(id);
        },

        getNewFeatures: () => {
          const seen = get().seenFeatures;
          return NEW_FEATURES.filter(id => !seen.includes(id));
        },

        resetAll: () => {
          set({ seenFeatures: [] }, false, 'resetAll');
        },
      }),
      { name: 'feature-indicators' }
    ),
    { name: 'feature-indicator-store' }
  )
);
