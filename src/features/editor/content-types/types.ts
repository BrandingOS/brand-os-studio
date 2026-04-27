// ContentTypeConfig — what differs between a social post and a
// presentation is config, not code. The same `<Editor>` consumes any
// config and conditionally renders panels, picks default dimensions,
// and chooses export presets accordingly.
//
// Configs are pure data — no React, no Fabric, no Supabase. Anything
// that needs them imports the registry from `./index.ts`.

import { z } from 'zod';

export const ExportFormatSchema = z.enum(['png', 'jpg', 'pdf', 'svg']);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const PageModelSchema = z.enum(['single', 'multi']);
export type PageModel = z.infer<typeof PageModelSchema>;

/**
 * How a content type's documents reflow when their canvas dimensions
 * change (Phase 6 — Resize Variants). Single source of truth lives on
 * the ContentTypeConfig because resize semantics are stable across all
 * templates of a given type ("a business card is fixed; a presentation
 * needs AI reflow"). Templates can opt into a per-template override
 * via `metadata._dimensions.strategyOverride` for the rare case where
 * a single template within a type needs different semantics.
 *
 *   • 'fixed'         — refuses dimension changes (or warns hard).
 *                       Print stationery, ID badges, business cards.
 *   • 'reflowable'    — manual anchor-point translation. Layers snap
 *                       to new edges based on their anchor; no AI
 *                       intervention. Banners, web headers.
 *   • 'ai-reflowable' — calls the AI reflow pipeline for intelligent
 *                       redistribution. Presentations, multi-content
 *                       compositions, social variants.
 *
 * Phase 6's `generateResizeVariants(doc, targetSizes)` reads
 * `getContentTypeConfig(doc.contentType).resizeStrategy` (after
 * checking the per-template override) to pick the reflow pipeline.
 */
export const ResizeStrategySchema = z.enum(['fixed', 'reflowable', 'ai-reflowable']);
export type ResizeStrategy = z.infer<typeof ResizeStrategySchema>;

export const DimensionPresetSchema = z.object({
  label: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type DimensionPreset = z.infer<typeof DimensionPresetSchema>;

export const PanelsConfigSchema = z.object({
  layers: z.boolean(),
  properties: z.boolean(),
  pageNavigator: z.boolean(),
  assets: z.boolean(),
  masterPages: z.boolean(),
});
export type PanelsConfig = z.infer<typeof PanelsConfigSchema>;

export const ContentTypeConfigSchema = z.object({
  /** Stable id, e.g. 'social-post', 'presentation'. Matches `BrandOSDocument.contentType`. */
  id: z.string().min(1),
  label: z.string().min(1),
  /** lucide-react icon name. Resolved at render time via the icon module. */
  icon: z.string().min(1),
  pageModel: PageModelSchema,
  defaultDimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  dimensionPresets: z.array(DimensionPresetSchema).default([]),
  panels: PanelsConfigSchema,
  exportFormats: z.array(ExportFormatSchema).min(1),
  defaultExportFormat: ExportFormatSchema,
  supportsBrandKit: z.boolean(),
  supportsMasterPages: z.boolean(),
  /** Phase 6 — Resize Variants. See ResizeStrategySchema for semantics. */
  resizeStrategy: ResizeStrategySchema,
});
export type ContentTypeConfig = z.infer<typeof ContentTypeConfigSchema>;
