// ITemplatesService — Phase 4 Content Universe contract.
//
// The dev default is `LocalTemplatesService` (localStorage-backed,
// schema-mirroring the SQL in 20260504000000_009_templates_phase_4.sql).
// Production swaps to a Supabase-backed implementation in a follow-up
// commit once the migration is deployed.

import type {
  Template,
  TemplateCategory,
  TemplateListFilters,
  TemplateSearchParams,
} from '@/features/templates/types';

export interface ITemplatesService {
  // ─── Categories ──────────────────────────────────────────────────────
  listCategories(): Promise<TemplateCategory[]>;
  getCategory(idOrSlug: string): Promise<TemplateCategory | null>;

  // ─── Templates — read ────────────────────────────────────────────────
  listTemplates(filters?: TemplateListFilters): Promise<Template[]>;
  getTemplate(idOrSlug: string): Promise<Template | null>;
  searchTemplates(params: TemplateSearchParams): Promise<Template[]>;

  // ─── Templates — mutate ──────────────────────────────────────────────
  /** Atomic increment; safe to call without re-reading. */
  incrementUseCount(id: string): Promise<void>;
  /** Phase 4.2 + 4.4 — user / community uploads. */
  createTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'useCount'>): Promise<Template>;
  /** Phase 4.4 — admin approve/reject + uploader edit. */
  updateTemplate(id: string, patch: Partial<Template>): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
}
