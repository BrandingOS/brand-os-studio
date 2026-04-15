/**
 * Output Spec Registry
 * ─────────────────────────────────────────────────────────────────────────
 * The single registry of what the Brand Consistency engine can produce.
 * Each entry declares strategy (template / hybrid), aspect ratio, the
 * required brand fields, and which renderer + prompt template to invoke.
 *
 * To add a new output type:
 *   1. Add an entry here.
 *   2. Add a renderer case in `OutputRenderer.tsx`.
 *   3. Add (optionally) a prompt blueprint in `promptComposer.ts`.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Instagram,
  Layers,
  Globe,
  LayoutGrid,
  BookOpen,
  Palette,
  Type,
  CreditCard,
  Presentation,
  Megaphone,
} from 'lucide-react';

export type OutputCategory =
  | 'social'
  | 'web'
  | 'guideline'
  | 'mockup'
  | 'presentation'
  | 'ad';

/**
 * `template`  → 100% deterministic from BrandTokens (no AI required)
 * `hybrid`    → templated layout, AI-generated copy
 * `ai`        → AI-generated visual (reserved for future image-gen support)
 */
export type GenerationStrategy = 'template' | 'hybrid' | 'ai';

export interface OutputSpec {
  id: OutputTypeId;
  label: string;
  description: string;
  category: OutputCategory;
  icon: LucideIcon;
  /** Aspect ratio in CSS form, e.g. "1 / 1", "16 / 9", "4 / 5". */
  aspect: string;
  /** Native pixel dimensions used for export at full quality. */
  width: number;
  height: number;
  strategy: GenerationStrategy;
  /** Brand fields that must be present for this output to be high quality. */
  requires: Array<'logo' | 'primaryColor' | 'fonts' | 'tone' | 'audience' | 'strategy'>;
  /** Token used by the prompt composer to pick the right blueprint. */
  promptKey: PromptKey;
}

export type OutputTypeId =
  | 'social_post_square'
  | 'social_post_portrait'
  | 'social_carousel_3'
  | 'website_hero'
  | 'website_features'
  | 'guideline_cover'
  | 'guideline_color_page'
  | 'guideline_typography_page'
  | 'mockup_business_card'
  | 'presentation_slide'
  | 'digital_ad';

export type PromptKey =
  | 'social_post'
  | 'social_carousel'
  | 'web_hero'
  | 'web_features'
  | 'guideline_intro'
  | 'business_card'
  | 'presentation'
  | 'digital_ad'
  | 'none';

export const OUTPUT_SPECS: Record<OutputTypeId, OutputSpec> = {
  social_post_square: {
    id: 'social_post_square',
    label: 'Square social post',
    description: 'Instagram / LinkedIn 1:1 post with branded headline + CTA.',
    category: 'social',
    icon: Instagram,
    aspect: '1 / 1',
    width: 1080,
    height: 1080,
    strategy: 'hybrid',
    requires: ['primaryColor', 'tone'],
    promptKey: 'social_post',
  },
  social_post_portrait: {
    id: 'social_post_portrait',
    label: 'Portrait social post',
    description: 'Story-format 4:5 post optimized for feed dwell.',
    category: 'social',
    icon: Instagram,
    aspect: '4 / 5',
    width: 1080,
    height: 1350,
    strategy: 'hybrid',
    requires: ['primaryColor', 'tone'],
    promptKey: 'social_post',
  },
  social_carousel_3: {
    id: 'social_carousel_3',
    label: '3-slide carousel',
    description: 'Hook → value → CTA carousel sharing a single brand system.',
    category: 'social',
    icon: Layers,
    aspect: '1 / 1',
    width: 1080,
    height: 1080,
    strategy: 'hybrid',
    requires: ['primaryColor', 'tone', 'audience'],
    promptKey: 'social_carousel',
  },
  website_hero: {
    id: 'website_hero',
    label: 'Website hero',
    description: 'Above-the-fold hero block with branded typography.',
    category: 'web',
    icon: Globe,
    aspect: '16 / 9',
    width: 1600,
    height: 900,
    strategy: 'hybrid',
    requires: ['primaryColor', 'tone', 'audience'],
    promptKey: 'web_hero',
  },
  website_features: {
    id: 'website_features',
    label: 'Features section',
    description: '3-column features grid following the brand system.',
    category: 'web',
    icon: LayoutGrid,
    aspect: '16 / 9',
    width: 1600,
    height: 900,
    strategy: 'hybrid',
    requires: ['primaryColor', 'tone'],
    promptKey: 'web_features',
  },
  guideline_cover: {
    id: 'guideline_cover',
    label: 'Guidelines cover',
    description: 'Brand guidelines cover page with mark + descriptor.',
    category: 'guideline',
    icon: BookOpen,
    aspect: '4 / 3',
    width: 1600,
    height: 1200,
    strategy: 'hybrid',
    requires: ['primaryColor'],
    promptKey: 'guideline_intro',
  },
  guideline_color_page: {
    id: 'guideline_color_page',
    label: 'Color system page',
    description: 'Branded color palette page with usage notes.',
    category: 'guideline',
    icon: Palette,
    aspect: '4 / 3',
    width: 1600,
    height: 1200,
    strategy: 'template',
    requires: ['primaryColor'],
    promptKey: 'none',
  },
  guideline_typography_page: {
    id: 'guideline_typography_page',
    label: 'Typography page',
    description: 'Branded typography specimen with hierarchy.',
    category: 'guideline',
    icon: Type,
    aspect: '4 / 3',
    width: 1600,
    height: 1200,
    strategy: 'template',
    requires: ['fonts'],
    promptKey: 'none',
  },
  mockup_business_card: {
    id: 'mockup_business_card',
    label: 'Business card mockup',
    description: 'Front + back business card on a branded backdrop.',
    category: 'mockup',
    icon: CreditCard,
    aspect: '16 / 10',
    width: 1600,
    height: 1000,
    strategy: 'template',
    requires: ['primaryColor', 'fonts'],
    promptKey: 'business_card',
  },
  presentation_slide: {
    id: 'presentation_slide',
    label: 'Presentation slide',
    description: '16:9 keynote-style slide with branded layout.',
    category: 'presentation',
    icon: Presentation,
    aspect: '16 / 9',
    width: 1920,
    height: 1080,
    strategy: 'hybrid',
    requires: ['primaryColor', 'tone'],
    promptKey: 'presentation',
  },
  digital_ad: {
    id: 'digital_ad',
    label: 'Digital ad (300x250)',
    description: 'IAB medium rectangle banner with brand-locked composition.',
    category: 'ad',
    icon: Megaphone,
    aspect: '6 / 5',
    width: 1200,
    height: 1000,
    strategy: 'hybrid',
    requires: ['primaryColor', 'tone'],
    promptKey: 'digital_ad',
  },
};

export const OUTPUT_SPEC_LIST: OutputSpec[] = Object.values(OUTPUT_SPECS);

export function getOutputSpec(id: OutputTypeId): OutputSpec {
  const spec = OUTPUT_SPECS[id];
  if (!spec) throw new Error(`Unknown output type: ${id}`);
  return spec;
}

export const CATEGORY_LABEL: Record<OutputCategory, string> = {
  social: 'Social',
  web: 'Website',
  guideline: 'Guidelines',
  mockup: 'Mockups',
  presentation: 'Presentations',
  ad: 'Ads',
};
