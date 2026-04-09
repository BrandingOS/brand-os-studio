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
import { Wand2 } from 'lucide-react';
import type { ToolMeta, ToolSlug } from './types';

export const TOOL_REGISTRY: Record<ToolSlug, ToolMeta> = {
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
