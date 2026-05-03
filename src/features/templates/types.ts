// Phase 4 — Content Universe types.
//
// Mirror of supabase/migrations/20260504000000_009_templates_phase_4.sql
// shape. The LocalTemplatesService and the (future) Supabase-backed
// service both serialize against this contract.

import { z } from 'zod';
import { BrandOSDocumentSchema } from '@/features/editor/schema';

// ─── Source discriminator ──────────────────────────────────────────────

export const TemplateSourceSchema = z.enum([
  'curated',          // BrandOS team-designed
  'ai_editable',      // AI emitted a full BrandOSDocument
  'ai_rasterized',    // AI emitted a single image (PNG/SVG)
  'ai_prompt_preset', // pre-written prompt to seed an AI flow
  'user_uploaded',    // community submission
]);
export type TemplateSource = z.infer<typeof TemplateSourceSchema>;

export const TemplateUploadStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
]);
export type TemplateUploadStatus = z.infer<typeof TemplateUploadStatusSchema>;

export const TemplateVisibilitySchema = z.enum(['private', 'public']);
export type TemplateVisibility = z.infer<typeof TemplateVisibilitySchema>;

export const TemplateMoodSchema = z.enum([
  'professional',
  'playful',
  'minimal',
  'bold',
  'elegant',
  'modern',
  'vintage',
  'natural',
  'tech',
  'maximalist',
]);
export type TemplateMood = z.infer<typeof TemplateMoodSchema>;

// ─── Category ──────────────────────────────────────────────────────────

export const TemplateCategorySchema = z.object({
  id: z.string(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  iconName: z.string().nullable().optional(), // lucide icon name
  displayOrder: z.number().int().default(0),
  parentCategoryId: z.string().nullable().optional(),
  contentTypeConfigId: z.string().min(1), // matches ContentTypeConfig.id
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type TemplateCategory = z.infer<typeof TemplateCategorySchema>;

// ─── Template ──────────────────────────────────────────────────────────

export const TemplateSchema = z.object({
  id: z.string(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  source: TemplateSourceSchema,
  categoryId: z.string(),
  document: BrandOSDocumentSchema.nullable().optional(),
  thumbnailUrl: z.string().min(1), // data: URL ok in Phase 4
  previewImageUrl: z.string().nullable().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tags: z.array(z.string()).default([]),
  mood: TemplateMoodSchema.nullable().optional(),
  // AI-specific
  promptText: z.string().nullable().optional(),
  promptSystemHints: z.string().nullable().optional(),
  rasterImageUrl: z.string().nullable().optional(),
  // User-uploaded
  uploadedByUserId: z.string().nullable().optional(),
  uploadStatus: TemplateUploadStatusSchema.nullable().optional(),
  uploadedAt: z.string().nullable().optional(),
  approvedAt: z.string().nullable().optional(),
  approvedByUserId: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  // Visibility
  visibility: TemplateVisibilitySchema.default('public'),
  // Premium (forward-compat — no UI in Phase 4)
  isPremium: z.boolean().default(false),
  requiredPlan: z.string().nullable().optional(),
  // Stats
  useCount: z.number().int().default(0),
  // Timestamps
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Template = z.infer<typeof TemplateSchema>;

// ─── Filters / search ──────────────────────────────────────────────────

export interface TemplateListFilters {
  categoryId?: string;
  categorySlug?: string;
  source?: TemplateSource | TemplateSource[];
  mood?: TemplateMood | TemplateMood[];
  tags?: string[]; // AND match
  visibility?: TemplateVisibility;
  uploadStatus?: TemplateUploadStatus;
  uploadedByUserId?: string;
  /** Sort. Default 'useCount-desc'. */
  sort?: 'useCount-desc' | 'createdAt-desc' | 'name-asc';
  /** Pagination — if omitted, returns all matches. Use for the
   *  "load more" UX in the panel. */
  limit?: number;
  offset?: number;
}

export interface TemplateSearchParams extends TemplateListFilters {
  query: string; // matches name + description + tags (case-insensitive)
}
