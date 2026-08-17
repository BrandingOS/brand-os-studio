// Brand context the user chooses ON PURPOSE.
//
// The compiler still decides how to word a prompt, but WHICH brand material
// rides along is the user's call: a logo, the palette, a product shot, a
// campaign reference. Nothing is attached implicitly here — an image model
// takes what it is given, and guessing wastes a paid generation.

import { useMemo } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { ImageReferenceInput } from '@/features/image-generation';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';
import { buildBrandImageContext } from '@/features/editor/ai/imagePrompt/brandImageContext';

export type BrandContextKey = 'logo' | 'palette' | 'style';

export interface BrandContextOption {
  key: BrandContextKey;
  label: string;
  detail: string;
  available: boolean;
  /** Why it can't be used, when it can't. */
  unavailableReason?: string;
}

export function useBrandContextOptions(brand: Brand | null | undefined): BrandContextOption[] {
  return useMemo(() => {
    const ctx = buildBrandImageContext(brand);
    const logoUrl = brand ? resolveBrandLogo(brand, 'primary')?.url : undefined;
    const paletteCount = ctx?.palette.length ?? 0;
    const styleWords = ctx?.styleDescriptors ?? [];

    return [
      {
        key: 'logo',
        label: 'Logo',
        detail: logoUrl ? 'Sent as a reference image' : 'No logo on this brand yet',
        available: !!logoUrl,
        unavailableReason: logoUrl ? undefined : 'Add a logo in Brand Kit first',
      },
      {
        key: 'palette',
        label: 'Colours',
        detail: paletteCount ? `${paletteCount} brand colours` : 'No palette set',
        available: paletteCount > 0,
        unavailableReason: paletteCount ? undefined : 'Set brand colours in Brand Kit',
      },
      {
        key: 'style',
        label: 'Style',
        detail: styleWords.length ? styleWords.slice(0, 3).join(', ') : 'No style words set',
        available: styleWords.length > 0,
        unavailableReason: styleWords.length ? undefined : 'Add style words in Brand Strategy',
      },
    ];
  }, [brand]);
}

/** Which asset picks the model can actually carry, given its capabilities. */
export function selectedRefRoles(selected: Set<BrandContextKey>): Array<ImageReferenceInput['role']> {
  const roles: Array<ImageReferenceInput['role']> = [];
  if (selected.has('logo')) roles.push('logo');
  if (selected.has('palette')) roles.push('palette');
  return roles;
}
