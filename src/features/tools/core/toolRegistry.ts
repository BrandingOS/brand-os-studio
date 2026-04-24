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
import { Type, Wand2, Palette, Shirt } from 'lucide-react';
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
  'typescale': {
    slug: 'typescale',
    name: 'Typescale Generator',
    tagline: 'Build a typography system your whole brand can use.',
    description:
      'Pick a font pair, tune the scale for web, UI, presentations, and social — then export ' +
      'CSS, Tailwind v3/v4, SCSS, W3C design tokens, and Figma Tokens Studio. Free.',
    seo: {
      title: 'Typescale Generator — Build a typography system — BrandOS',
      description:
        'Free modern typescale tool. Pick Google Fonts, generate a fluid scale, export CSS, ' +
        'Tailwind, and W3C design tokens.',
      keywords: [
        'typescale generator', 'type scale', 'modular scale', 'fluid typography',
        'tailwind typography', 'design tokens typography', 'google fonts pair', 'type hierarchy',
      ],
    },
    Icon: Type,
  },
  'mockup-studio': {
    slug: 'mockup-studio',
    name: 'Mockup Studio',
    tagline: 'Drop your design on a t-shirt, mug, or card — in one click.',
    description:
      'Place any design or logo onto a growing library of product mockups. ' +
      'Tint t-shirt / mug / card colors, swap backgrounds, and export studio-quality PNGs. ' +
      'Connect a brand to auto-fill every template with your logo and palette.',
    seo: {
      title: 'Free Mockup Generator — T-shirts, mugs, cards & more — BrandOS',
      description:
        'Free online mockup generator. Upload a logo or design and see it composited ' +
        'on t-shirts, mugs, business cards, and more. Export at up to 2x. Brand-aware.',
      keywords: [
        'mockup generator',
        'logo mockup',
        't-shirt mockup',
        'mug mockup',
        'business card mockup',
        'free mockup tool',
        'brand mockups',
        'online mockup maker',
      ],
    },
    Icon: Shirt,
  },
};

export function getTool(slug: string): ToolMeta | undefined {
  return TOOL_REGISTRY[slug as ToolSlug];
}

export function listTools(): ToolMeta[] {
  return Object.values(TOOL_REGISTRY);
}
