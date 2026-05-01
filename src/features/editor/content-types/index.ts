// Content-type registry. The single source of truth for which kinds
// of documents the editor supports and how each one is configured.
//
// Adding a new content type:
//   1. Create `<id>.config.ts` exporting a `ContentTypeConfig`.
//   2. Add it to `CONTENT_TYPES` below.
//   3. (Phase 4) Provide a default template + thumbnail.

import { ContentTypeConfigSchema, type ContentTypeConfig } from './types';
import { socialPostConfig } from './social-post.config';
import { presentationConfig } from './presentation.config';
import { businessCardConfig } from './business-card.config';
import { brandGuidelineSlideConfig } from './brand-guideline-slide.config';
import { bannerConfig } from './banner.config';
import { invoiceConfig } from './invoice.config';
import { profileIconConfig } from './profile-icon.config';

export const CONTENT_TYPES: Record<string, ContentTypeConfig> = {
  [socialPostConfig.id]: socialPostConfig,
  [presentationConfig.id]: presentationConfig,
  [businessCardConfig.id]: businessCardConfig,
  [brandGuidelineSlideConfig.id]: brandGuidelineSlideConfig,
  [bannerConfig.id]: bannerConfig,
  [invoiceConfig.id]: invoiceConfig,
  [profileIconConfig.id]: profileIconConfig,
};

/**
 * Look up a content-type config by id. Throws if the id isn't
 * registered — every config must be intentional.
 */
export function getContentTypeConfig(id: string): ContentTypeConfig {
  const cfg = CONTENT_TYPES[id];
  if (!cfg) {
    throw new Error(
      `Unknown content type: ${id}. Registered: ${Object.keys(CONTENT_TYPES).join(', ')}`,
    );
  }
  return cfg;
}

/** All registered configs as an array — useful for content-type pickers. */
export function listContentTypes(): ContentTypeConfig[] {
  return Object.values(CONTENT_TYPES);
}

/**
 * Validate every registered config at module load. Surfaces a
 * malformed config as an import error rather than at runtime.
 */
for (const cfg of Object.values(CONTENT_TYPES)) {
  ContentTypeConfigSchema.parse(cfg);
}

export type { ContentTypeConfig } from './types';
export {
  ContentTypeConfigSchema,
  type ExportFormat,
  type PageModel,
  type DimensionPreset,
  type PanelsConfig,
} from './types';
