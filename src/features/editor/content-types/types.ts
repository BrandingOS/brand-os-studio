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
});
export type ContentTypeConfig = z.infer<typeof ContentTypeConfigSchema>;
