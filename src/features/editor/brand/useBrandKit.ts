// Memoized BrandKit derivation hook.
//
// REQUIRED at every call site that consumes a BrandKit in React.
// Without memoization, every selection change re-runs the full
// priority resolution in `brandToBrandKit` — wasted work that
// compounds in multi-page documents with frequent selection
// switching.
//
// The dependency tuple is the brand reference identity AND
// `brand.updatedAt`. Reference identity catches Zustand-style
// store updates that replace the brand object on every change.
// `updatedAt` catches in-place mutations that slipped through.

import { useMemo } from 'react';
import type { Brand } from '@/shared/types/brand';
import { brandToBrandKit } from './brandToBrandKit';
import type { BrandKit } from './BrandKit';

export function useBrandKit(brand: Brand | null | undefined): BrandKit | null {
  return useMemo(
    () => {
      if (!brand) return null;
      return brandToBrandKit(brand);
    },
    // The exhaustive-deps rule treats `brand.updatedAt` as implied by
    // `brand`. That's true only when every brand mutation replaces
    // the reference; in-place mutations (a real failure mode in this
    // codebase) keep the reference and only advance `updatedAt`.
    // Including it forces a re-derive in that case.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brand, brand?.updatedAt],
  );
}
