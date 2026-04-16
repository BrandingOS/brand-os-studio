/**
 * missingVariants — what's missing from this brand's logo system.
 *
 * In-app, this drives the "Missing from your brand" rail in the
 * studio's left pane. The user clicks one and gets a pre-filled
 * variant ready to export.
 *
 * The "complete" set is the canonical archetype every brand should
 * have — same shape across brands so the gap analysis is consistent.
 */
import type { Brand } from '@/shared/types/brand';
import type { PaletteContext, SourceLogo, VariantSpec } from './types';
import { resolveVariant } from './generate';
import { logoUrl, hasLogo } from '@/shared/brand/logoUrl';

export interface ArchetypeRecipe {
  key: string;
  label: string;
  /** What this variant is for in plain words. */
  purpose: string;
  build: (source: SourceLogo, palette: PaletteContext) => VariantSpec;
}

export const ARCHETYPE: ArchetypeRecipe[] = [
  {
    key: 'lockup-horizontal-brand',
    label: 'Horizontal lockup',
    purpose: 'Default header use',
    build: (source, palette) =>
      resolveVariant({ source, palette, composition: 'lockup', layout: 'horizontal' }),
  },
  {
    key: 'lockup-stacked-brand',
    label: 'Stacked lockup',
    purpose: 'Square placements, social',
    build: (source, palette) =>
      resolveVariant({ source, palette, composition: 'lockup', layout: 'stacked' }),
  },
  {
    key: 'lockup-mono-black',
    label: 'Black lockup',
    purpose: 'Print, high-contrast',
    build: (source, palette) =>
      resolveVariant({ source, palette, composition: 'lockup', colorMode: 'mono-black' }),
  },
  {
    key: 'lockup-mono-white',
    label: 'White lockup',
    purpose: 'Dark backgrounds',
    build: (source, palette) =>
      resolveVariant({
        source,
        palette,
        composition: 'lockup',
        colorMode: 'mono-white',
        background: { kind: 'solid', value: '#000000' },
      }),
  },
  {
    key: 'icon-brand',
    label: 'Icon only',
    purpose: 'Favicons, app icons, avatars',
    build: (source, palette) =>
      resolveVariant({ source, palette, composition: 'icon-only', colorMode: 'brand' }),
  },
  {
    key: 'wordmark-brand',
    label: 'Wordmark only',
    purpose: 'Long-form, when the icon would be redundant',
    build: (source, palette) =>
      resolveVariant({ source, palette, composition: 'wordmark-only', colorMode: 'brand' }),
  },
  {
    key: 'lockup-on-brand-bg',
    label: 'Reverse on brand color',
    purpose: 'Hero sections, banners',
    build: (source, palette) =>
      resolveVariant({
        source,
        palette,
        composition: 'lockup',
        colorMode: 'mono-white',
        background: { kind: 'brand' },
      }),
  },
];

export interface MissingVariantSuggestion {
  key: string;
  label: string;
  purpose: string;
  spec: VariantSpec;
}

/**
 * Diff the archetype against the user's current variant set and return
 * recipes for the missing ones.
 *
 * For monolithic sources (no separate icon asset) we skip the
 * composition-based archetypes (icon-only, wordmark-only, stacked vs.
 * horizontal) since they all collapse to "render the source as-is" —
 * suggesting them would just produce duplicates.
 */
export function findMissingVariants(
  source: SourceLogo,
  palette: PaletteContext,
  current: VariantSpec[],
): MissingVariantSuggestion[] {
  const isMonolithic = !source.icon;
  const MEANINGFUL_FOR_MONOLITHIC = new Set([
    'lockup-horizontal-brand',
    'lockup-mono-black',
    'lockup-mono-white',
    'lockup-on-brand-bg',
  ]);

  const haveIds = new Set(current.map((v) => v.id));
  const missing: MissingVariantSuggestion[] = [];
  for (const recipe of ARCHETYPE) {
    if (isMonolithic && !MEANINGFUL_FOR_MONOLITHIC.has(recipe.key)) continue;
    const spec = recipe.build(source, palette);
    if (!haveIds.has(spec.id)) {
      missing.push({ key: recipe.key, label: recipe.label, purpose: recipe.purpose, spec });
    }
  }
  return missing;
}

/**
 * Read a brand's logoAssets and return which archetype slots are
 * already filled. Used by the in-app entry to show a "your brand has
 * 3 of 7 logo variants" indicator.
 */
export function brandCompleteness(brand: Brand): { filled: number; total: number } {
  const a = brand.logoAssets ?? {};
  const filled =
    Number(hasLogo(brand)) +
    Number(!!logoUrl(brand, 'iconmark')) +
    Number(!!logoUrl(brand, 'wordmark')) +
    Number(!!a.alternate) +
    Number(!!logoUrl(brand, 'mono.black')) +
    Number(!!logoUrl(brand, 'mono.white'));
  return { filled, total: ARCHETYPE.length };
}
