import { useMemo } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { FontRef, Typescale } from '@/shared/types/typescale';
import { buildLadder, toFluid, DEFAULT_SURFACES, defaultSemanticMap } from '../engine';
import { findCatalogEntry } from '@/shared/typography';

function refFromBrandFamily(family: string | undefined, fallbackFamily: string): FontRef {
  const catalog = family ? findCatalogEntry(family) : undefined;
  if (catalog) return catalog;
  return {
    family: family ?? fallbackFamily,
    source: family ? 'google' : 'system',
    weights: [400, 500, 700],
    italic: false,
    fallback: 'system-ui, sans-serif',
  };
}

export function seedTypescale(brand?: Brand | null): Typescale {
  const headingFamily = brand?.typography?.primary?.family;
  const bodyFamily    = brand?.typography?.secondary?.family ?? headingFamily;
  const heading = refFromBrandFamily(headingFamily, 'Inter');
  const body    = refFromBrandFamily(bodyFamily,    'Inter');
  const surfaces = {} as Typescale['surfaces'];
  (['web','ui','presentation','social'] as const).forEach((key) => {
    const def = DEFAULT_SURFACES[key];
    let steps = buildLadder({
      basePx: def.basePx,
      ratio: def.ratio.value,
      stepsUp: def.stepsUp,
      stepsDown: def.stepsDown,
      leading: def.leading,
      tracking: def.tracking,
    });
    if (key === 'web' && def.fluid) steps = steps.map(s => toFluid(s, def.fluid!));
    surfaces[key] = { key, ...def, steps, semantic: defaultSemanticMap(key, steps) };
  });
  return {
    schemaVersion: 1,
    fonts: { heading, body },
    surfaces,
    activeSurface: 'web',
    updatedAt: new Date().toISOString(),
  };
}

export function useSeedTypescale(brand?: Brand | null): Typescale {
  return useMemo(
    () => seedTypescale(brand),
    [brand?.id, brand?.typography?.primary?.family, brand?.typography?.secondary?.family],
  );
}
