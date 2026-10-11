/** Shared by the board and the direction previews: radius, fonts, readable ink. */
import { useEffect } from 'react';
import { loadFontFamily } from '@/shared/design-system/fonts';
import { pickFgOnBackground } from '@/shared/brand/logoOnBackground';
import type { BrandSystem } from '../model/types';
import { CORNER_RATIO } from '../engine/graphics';

/** Corner radius for a tile, from the system's corner style. */
export function tileRadius(system: Pick<BrandSystem, 'corner'>, base = 56): number {
  return Math.round(Math.min(28, base * CORNER_RATIO[system.corner]));
}

export function useSystemFonts(system: Pick<BrandSystem, 'type'> | null | undefined): void {
  const heading = system?.type.heading;
  const body = system?.type.body;
  const weight = system?.type.headingWeight;
  useEffect(() => {
    if (heading) loadFontFamily(heading, [400, weight ?? 600, 700].filter((w, i, a) => a.indexOf(w) === i));
    if (body && body !== heading) loadFontFamily(body, [400, 500, 600]);
  }, [heading, body, weight]);
}

export const ink = (bg: string) => pickFgOnBackground(bg, ['#ffffff', '#111111']);
