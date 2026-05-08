// uniqueLogoVariants — single source of truth for the logo-variant
// catalog AND the dedup rule that hides "the same image, different
// label" entries from any picker.
//
// Why this exists. Several brand seeds (and brand kits where the
// author only uploaded one mark) point primary, secondary, wordmark,
// and iconmark at the SAME URL. A naive picker then renders six tiles
// of the identical purple wordmark — five of which do nothing when
// chosen. Dedup at the variant catalog so every consumer (editor's
// floating toolbar logo picker, future variant gallery, brand-kit
// inspector) gets the same clean list.
//
// Rule (in priority order):
//   1. `Auto` is ALWAYS shown. It's a behavioral mode (adapts the
//      variant to the surface bg via `pickLogoOnBackground`), not
//      just an alias of `primary`. Even when its preview URL matches
//      `primary`, the runtime behavior differs.
//   2. Other variants are kept ONLY when they resolve to a URL AND
//      that URL hasn't been seen before in iteration order. Auto's
//      URL goes into the seen set first, so a Primary that resolves
//      to the same URL as Auto is dropped.
//   3. Variants with no resolved URL (the brand has no asset for
//      that role) are dropped entirely. Empty-tile placeholders mid-
//      grid read as "broken brand" rather than "you can upload here"
//      — uploading lives in the brand-kit panel, not the editor's
//      floating picker.
//
// `ALL_LOGO_VARIANTS` is exported separately so callers that want
// the full unfiltered list (e.g. brand-kit setup screens that DO want
// to surface every slot for upload) still have access.

import type { Brand } from '@/shared/types/brand';
import type { LogoRole } from '@/shared/types/brandAssets';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';

export type LogoVariantValue =
  | 'auto'
  | 'primary'
  | 'secondary'
  | 'wordmark'
  | 'iconmark'
  | 'mono.black'
  | 'mono.white';

export interface LogoVariantOption {
  label: string;
  value: LogoVariantValue;
  /** Logo role to resolve for the thumbnail / asset URL. `auto` previews
   *  `primary` since the real auto pick is a render-time decision. */
  resolveRole: LogoRole;
  /** Tile background hint for thumbnails — mono variants need an
   *  explicit contrast bg so a white mark on white or black on black
   *  stays visible. */
  tileBg: 'light' | 'dark' | 'auto';
}

export const ALL_LOGO_VARIANTS: ReadonlyArray<LogoVariantOption> = [
  { label: 'Auto',       value: 'auto',       resolveRole: 'primary',    tileBg: 'auto'  },
  { label: 'Primary',    value: 'primary',    resolveRole: 'primary',    tileBg: 'auto'  },
  { label: 'Secondary',  value: 'secondary',  resolveRole: 'secondary',  tileBg: 'auto'  },
  { label: 'Wordmark',   value: 'wordmark',   resolveRole: 'wordmark',   tileBg: 'auto'  },
  { label: 'Iconmark',   value: 'iconmark',   resolveRole: 'iconmark',   tileBg: 'auto'  },
  { label: 'Mono Black', value: 'mono.black', resolveRole: 'mono.black', tileBg: 'light' },
  { label: 'Mono White', value: 'mono.white', resolveRole: 'mono.white', tileBg: 'dark'  },
];

export function uniqueLogoVariants(
  brand: Brand | undefined,
): LogoVariantOption[] {
  const seenUrls = new Set<string>();
  const result: LogoVariantOption[] = [];

  for (const v of ALL_LOGO_VARIANTS) {
    const url = brand ? resolveBrandLogo(brand, v.resolveRole)?.url : undefined;

    if (v.value === 'auto') {
      // Always include Auto. Seed `seenUrls` with its URL so a Primary
      // that resolves to the same asset gets dropped — Auto is the
      // smart-pick equivalent.
      result.push(v);
      if (url) seenUrls.add(url);
      continue;
    }

    if (!url) continue; // brand has no asset for this role
    if (seenUrls.has(url)) continue; // same image as a higher-priority variant
    seenUrls.add(url);
    result.push(v);
  }

  return result;
}
