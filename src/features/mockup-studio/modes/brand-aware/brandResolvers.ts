/**
 * Brand resolvers — map BrandingOS's `Brand` type onto the generic tokens
 * referenced by `brand_kit_hints` on templates.
 *
 * Adaptation plan §2.4 lists the mappings. These helpers are pure and
 * unit-testable; they never reach into the network or the service
 * container.
 */

import type { Brand } from '@/shared/types/brand';
import type { BrandAsset, LogoRef } from '@/shared/types/brandAssets';

import type { ColorRole } from '../../engine/types';

export type PreferredLogoAsset =
  | 'logo_primary'
  | 'logo_iconmark'
  | 'logo_wordmark'
  | 'logo_secondary';

/** Find a logo URL for a given slot, walking fallbacks until one resolves. */
export function resolveLogoUrl(
  brand: Brand,
  preferred: PreferredLogoAsset,
  fallbacks: PreferredLogoAsset[] = [],
): string | null {
  const candidates = [preferred, ...fallbacks];
  for (const cand of candidates) {
    const url = lookupSingleLogo(brand, cand);
    if (url) return url;
  }
  return null;
}

function lookupSingleLogo(brand: Brand, slot: PreferredLogoAsset): string | null {
  const v3Url = resolveV3LogoUrl(brand, slot);
  if (v3Url) return v3Url;
  return resolveLegacyLogoUrl(brand, slot);
}

function resolveV3LogoUrl(brand: Brand, slot: PreferredLogoAsset): string | null {
  const refs = brand.logoSystem;
  if (!refs) return null;
  let ref: LogoRef | undefined;
  switch (slot) {
    case 'logo_primary':
      ref = refs.primary;
      break;
    case 'logo_secondary':
      ref = refs.secondary;
      break;
    case 'logo_wordmark':
      ref = refs.wordmark;
      break;
    case 'logo_iconmark':
      ref = refs.iconmark;
      break;
  }
  if (!ref) return null;
  const asset = (brand.brandAssets ?? []).find(
    (a: BrandAsset) => a.id === ref!.assetId,
  );
  if (!asset) return null;
  const preferred = ref.preferredFormat;
  if (preferred && asset.formats[preferred]) {
    return asset.formats[preferred]!.url;
  }
  // Preference order: svg > png > webp > jpg > pdf
  const order: Array<keyof typeof asset.formats> = [
    'svg',
    'png',
    'webp',
    'jpg',
    'pdf',
  ];
  for (const format of order) {
    if (asset.formats[format]) return asset.formats[format]!.url;
  }
  return null;
}

function resolveLegacyLogoUrl(brand: Brand, slot: PreferredLogoAsset): string | null {
  const legacy = brand.logoAssets;
  switch (slot) {
    case 'logo_primary':
      return legacy?.full ?? brand.logo ?? null;
    case 'logo_secondary':
      return legacy?.alternate ?? brand.logo ?? null;
    case 'logo_wordmark':
      return legacy?.wordmark ?? brand.logo ?? null;
    case 'logo_iconmark':
      return legacy?.icon ?? brand.logo ?? null;
  }
}

/** Hex color for a color role, falling back to v2 color fields or a sensible default. */
export function resolveColor(brand: Brand, role: ColorRole): string {
  const cs = brand.colorSystem as
    | {
        primary?: { hex?: string };
        secondary?: { hex?: string };
        accent?: { hex?: string };
      }
    | undefined;

  switch (role) {
    case 'primary':
      return cs?.primary?.hex ?? brand.primaryColor ?? '#111111';
    case 'secondary':
      return cs?.secondary?.hex ?? brand.secondaryColor ?? '#888888';
    case 'accent':
      // Fall back through the brand's own palette instead of a hardcoded
      // hue — we don't want mockups to default to an arbitrary peach that
      // the brand didn't choose.
      return (
        cs?.accent?.hex ??
        brand.accentColor ??
        cs?.secondary?.hex ??
        brand.secondaryColor ??
        cs?.primary?.hex ??
        brand.primaryColor ??
        '#111111'
      );
    case 'neutral_light':
      return brand.neutrals?.[0] ?? '#FFFFFF';
    case 'neutral_dark': {
      const last = brand.neutrals?.[brand.neutrals.length - 1];
      return last ?? '#111111';
    }
  }
}

/** Font family for a role. */
export function resolveFontFamily(
  brand: Brand,
  role: 'heading' | 'body',
): string {
  const typography = brand.typography as
    | {
        primary?: { family?: string };
        secondary?: { family?: string };
      }
    | undefined;
  if (role === 'heading') {
    return (
      typography?.primary?.family ??
      brand.fonts?.primary ??
      'system-ui'
    );
  }
  return (
    typography?.secondary?.family ??
    typography?.primary?.family ??
    brand.fonts?.secondary ??
    brand.fonts?.primary ??
    'system-ui'
  );
}

/** Pull a brand-level text value for a default text slot. */
export function resolveBrandText(
  brand: Brand,
  field: 'brand_name' | 'tagline',
): string {
  if (field === 'brand_name') return brand.name ?? '';
  // Brand has no first-class tagline today (see adaptation plan §6, risk 2).
  // Fall back to the first clause of the strategy / tone line if present.
  const strategy = brand.strategy?.trim();
  if (strategy) {
    const firstSentence = strategy.split(/[.!?]/)[0]?.trim();
    if (firstSentence) return firstSentence;
  }
  return '';
}
