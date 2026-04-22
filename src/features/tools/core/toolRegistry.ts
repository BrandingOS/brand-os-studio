/**
 * Central registry of every tool the platform knows about.
 *
 * Adding a tool here gets you:
 *  - the `/tools/<slug>` landing page (via ToolLanding)
 *  - the `/tools` directory listing
 *  - SEO metadata
 *  - shared gates and signup-claim flow
 *
 * The registry is intentionally a plain object — no React, no async —
 * so it can be imported from anywhere (router, SEO meta, server-side
 * sitemaps) without pulling component code into the bundle.
 */
import { Wand2, Palette } from 'lucide-react';
import type { ToolMeta, ToolSlug } from './types';

export const TOOL_REGISTRY: Record<ToolSlug, ToolMeta> = {
  'ui-color-system': {
    slug: 'ui-color-system',
    name: 'UI Color System',
    tagline: 'Generate a complete UI color system from your brand.',
    description:
      'Drop in a brand color and get a full UI color system: perceptually ' +
      'balanced shade ramps, semantic tokens, accessible pairings, live UI ' +
      'previews, and production-ready exports — all in one place.',
    seo: {
      title: 'UI Color System Generator — BrandOS',
      description:
        'Generate a complete UI color system from one brand color. Shades, ' +
        'semantic tokens, WCAG + APCA contrast testing, Tailwind/CSS/JSON exports.',
      keywords: [
        'ui color generator',
        'tailwind palette generator',
        'design system colors',
        'oklch palette',
        'apca contrast checker',
        'brand color system',
        'shadcn color system',
        'color tokens',
      ],
    },
    Icon: Palette,
  },
  'logo-variant-generator': {
    slug: 'logo-variant-generator',
    name: 'Logo Variant Studio',
    tagline: 'Drop in a logo. Get every version of it you will ever need.',
    description:
      'Generate every logo variant you need — horizontal, stacked, ' +
      'monochrome, inverse, transparent, icon-only, wordmark-only — in ' +
      'one place. Brand-aware color logic. Export-ready SVG, PNG, and PDF.',
    seo: {
      title: 'Logo Variant Generator — Make every version of your logo, free',
      description:
        'Upload your logo and generate every variant: horizontal, stacked, ' +
        'monochrome, white, black, transparent, icon-only. Export SVG, PNG, PDF.',
      keywords: [
        'logo variant generator',
        'logo white version',
        'logo black version',
        'logo monochrome',
        'logo horizontal stacked',
        'logo icon only',
        'logo wordmark',
        'transparent logo',
      ],
    },
    Icon: Wand2,
  },
};

export function getTool(slug: string): ToolMeta | undefined {
  return TOOL_REGISTRY[slug as ToolSlug];
}

export function listTools(): ToolMeta[] {
  return Object.values(TOOL_REGISTRY);
}
