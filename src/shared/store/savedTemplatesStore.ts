/**
 * Saved Templates store — tracks templates saved/favorited per brand.
 *
 * localStorage-backed. Will be upgraded to Supabase when the
 * saved_templates table is created.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface SavedTemplate {
  id: string;
  brandId: string;
  templateId: string;
  moduleId: string;
  name: string;
  category: string;
  savedAt: number;
  /** Optional custom overrides the user applied before saving */
  customizations?: Record<string, unknown>;
}

interface SavedTemplatesStore {
  items: Record<string, SavedTemplate>;
  forBrand: (brandId: string) => SavedTemplate[];
  isSaved: (brandId: string, templateId: string) => boolean;
  save: (input: Omit<SavedTemplate, 'id' | 'savedAt'>) => SavedTemplate;
  unsave: (brandId: string, templateId: string) => void;
  count: (brandId: string) => number;
}

export const useSavedTemplatesStore = create<SavedTemplatesStore>()(
  devtools(
    persist(
      (set, get) => ({
        items: {},

        forBrand: (brandId) =>
          Object.values(get().items)
            .filter((t) => t.brandId === brandId)
            .sort((a, b) => b.savedAt - a.savedAt),

        isSaved: (brandId, templateId) =>
          Object.values(get().items).some(
            (t) => t.brandId === brandId && t.templateId === templateId,
          ),

        save: (input) => {
          const item: SavedTemplate = {
            id: crypto.randomUUID(),
            savedAt: Date.now(),
            ...input,
          };
          set(
            (state) => ({ items: { ...state.items, [item.id]: item } }),
            false,
            'savedTemplates/save',
          );
          return item;
        },

        unsave: (brandId, templateId) => {
          set(
            (state) => {
              const next = { ...state.items };
              for (const [key, val] of Object.entries(next)) {
                if (val.brandId === brandId && val.templateId === templateId) {
                  delete next[key];
                }
              }
              return { items: next };
            },
            false,
            'savedTemplates/unsave',
          );
        },

        count: (brandId) =>
          Object.values(get().items).filter((t) => t.brandId === brandId).length,
      }),
      { name: 'brandos-saved-templates' },
    ),
    { name: 'saved-templates-store' },
  ),
);
