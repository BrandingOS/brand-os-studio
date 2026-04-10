/**
 * Template Store — manages variable-based template definitions.
 *
 * Holds built-in templates + user-created templates. localStorage-backed
 * with Supabase upgrade path.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { TemplateDefinition, TemplateType } from '../types';
import { BUSINESS_CARD_TEMPLATES } from '../data/business-cards';

// Built-in templates (shipped with the app)
const BUILT_IN: TemplateDefinition[] = [
  ...BUSINESS_CARD_TEMPLATES,
];

interface TemplateFilters {
  type?: TemplateType;
  category?: string;
  query?: string;
}

interface TemplateStore {
  /** User-created templates (persisted) */
  userTemplates: Record<string, TemplateDefinition>;

  /** Get all templates (built-in + user) */
  all: () => TemplateDefinition[];

  /** Filter templates */
  search: (filters: TemplateFilters) => TemplateDefinition[];

  /** Get by ID */
  getById: (id: string) => TemplateDefinition | undefined;

  /** Get by type */
  getByType: (type: TemplateType) => TemplateDefinition[];

  /** Save a user template */
  save: (template: TemplateDefinition) => void;

  /** Delete a user template */
  remove: (id: string) => void;

  /** Count templates by type */
  countByType: () => Record<string, number>;
}

export const useTemplateStore = create<TemplateStore>()(
  devtools(
    persist(
      (set, get) => ({
        userTemplates: {},

        all: () => {
          const user = Object.values(get().userTemplates);
          return [...BUILT_IN, ...user];
        },

        search: (filters) => {
          let results = get().all();
          if (filters.type) {
            results = results.filter((t) => t.meta.type === filters.type);
          }
          if (filters.category) {
            results = results.filter((t) => t.meta.category === filters.category);
          }
          if (filters.query) {
            const q = filters.query.toLowerCase();
            results = results.filter(
              (t) =>
                t.meta.name.toLowerCase().includes(q) ||
                t.meta.tags.some((tag) => tag.toLowerCase().includes(q)) ||
                t.meta.category.toLowerCase().includes(q),
            );
          }
          return results;
        },

        getById: (id) => {
          return BUILT_IN.find((t) => t.id === id) || get().userTemplates[id];
        },

        getByType: (type) => {
          return get().all().filter((t) => t.meta.type === type);
        },

        save: (template) => {
          set(
            (state) => ({
              userTemplates: { ...state.userTemplates, [template.id]: template },
            }),
            false,
            'templates/save',
          );
        },

        remove: (id) => {
          set(
            (state) => {
              const next = { ...state.userTemplates };
              delete next[id];
              return { userTemplates: next };
            },
            false,
            'templates/remove',
          );
        },

        countByType: () => {
          const all = get().all();
          const counts: Record<string, number> = {};
          for (const t of all) {
            counts[t.meta.type] = (counts[t.meta.type] || 0) + 1;
          }
          return counts;
        },
      }),
      { name: 'brandos-variable-templates' },
    ),
    { name: 'template-store' },
  ),
);
