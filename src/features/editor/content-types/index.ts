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
import { letterheadConfig } from './letterhead.config';
import { brochureConfig } from './brochure.config';
import { posterConfig } from './poster.config';
import { emailSignatureConfig } from './email-signature.config';
import { BRAND_KIT_CONTENT_TYPES } from './brandKit.configs';

export const CONTENT_TYPES: Record<string, ContentTypeConfig> = {
  [socialPostConfig.id]: socialPostConfig,
  [presentationConfig.id]: presentationConfig,
  [businessCardConfig.id]: businessCardConfig,
  [brandGuidelineSlideConfig.id]: brandGuidelineSlideConfig,
  [bannerConfig.id]: bannerConfig,
  [invoiceConfig.id]: invoiceConfig,
  [profileIconConfig.id]: profileIconConfig,
  [letterheadConfig.id]: letterheadConfig,
  [brochureConfig.id]: brochureConfig,
  [posterConfig.id]: posterConfig,
  [emailSignatureConfig.id]: emailSignatureConfig,
  // The Brand Kit deliverables. They all name the `template-instance`
  // renderer and are deliberately distinct ids from the Fabric types
  // above — see `brandKit.configs.ts` for why.
  ...BRAND_KIT_CONTENT_TYPES,
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
 * malformed config as an import error rather than at runtime. Apply
 * schema defaults (like renderer: 'fabric') to existing configs.
 */
for (const key in CONTENT_TYPES) {
  CONTENT_TYPES[key] = ContentTypeConfigSchema.parse(CONTENT_TYPES[key]);
}

export { BRAND_KIT_CONTENT_TYPE_IDS } from './brandKit.configs';
export type { ContentTypeConfig } from './types';
export {
  ContentTypeConfigSchema,
  DesignRendererIdSchema,
  type DesignRendererId,
  type ExportFormat,
  type PageModel,
  type DimensionPreset,
  type PanelsConfig,
} from './types';
