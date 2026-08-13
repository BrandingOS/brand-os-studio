/**
 * /dashboard/brand/:slug/tools/ui-color-system (and /b/:slug/...).
 *
 * In-app variant: seeds from brand.primaryColor (and secondary when
 * present) and hands a push callback to the generator so Save-to-Brand
 * writes back through the brandStore.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ColorSystemGenerator } from '@/features/tools/ui-color-system';
import { useBrandStore } from '@/shared/store/brandStore';
import { useService, SERVICE_KEYS } from '@/core';
import type { BrandRepository } from '@/domain/brand/repository';
import { applyBrandTokens } from '@/shared/design-system/PresentationStyleAdapter';
import { isValidHex, normalizeHex, type PaletteSystem, type ShadeStop } from '@/lib/color-engine';

export default function InAppUiColorSystemPage() {
  const { slug } = useParams();
  const brand = useBrandStore((s) => s.list.find((b) => b.slug === slug));
  const loadBySlug = useBrandStore((s) => s.loadBySlug);

  useEffect(() => {
    if (slug && !brand) {
      loadBySlug(slug).catch(() => {
        /* surfaced by store */
      });
    }
  }, [slug, brand, loadBySlug]);

  const brandPrimary = useMemo(() => {
    const guess = brand?.primaryColor;
    return guess && isValidHex(guess) ? normalizeHex(guess) : undefined;
  }, [brand]);

  const brandSecondary = useMemo(() => {
    const guess = brand?.secondaryColor;
    return guess && isValidHex(guess) ? normalizeHex(guess) : undefined;
  }, [brand]);

  const updateBrand = useBrandStore((s) => s.update);
  const pushToBrand = useCallback(
    async (palette: PaletteSystem) => {
      if (!brand) return;
      try {
        const stops: ShadeStop[] = [50, 100, 200, 500, 800, 950];
        // One call: the store routes colour fields to changeBrandColors and
        // merges the canonical result back. This used to call the op itself and
        // hand-merge via setState — a second write path, and a UI update that
        // was never persisted if the op's own save had failed.
        await updateBrand(brand.id, {
          colorSystem: {
            primary: { hex: palette.roles.primary.inputHex },
            ...(palette.roles.secondary?.inputHex
              ? { secondary: { hex: palette.roles.secondary.inputHex } }
              : {}),
            ...(palette.roles.tertiary?.inputHex
              ? { accent: { hex: palette.roles.tertiary.inputHex } }
              : {}),
            neutrals: stops.map((s) => ({ hex: palette.roles.neutral.shades[s].hex })),
          },
        });
        const cur = useBrandStore.getState().current;
        if (cur?.id === brand.id) applyBrandTokens(cur);
        toast.success('Brand Kit updated', {
          description: 'Colors pushed to this brand.',
        });
      } catch (err) {
        toast.error('Could not save', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [brand, updateBrand],
  );

  return (
    <ColorSystemGenerator
      initialSeed={brandPrimary ?? '#0ea5e9'}
      initialSecondary={brandSecondary ?? null}
      forcedMode="integrated"
      brand={
        brand
          ? {
              brandName: brand.name,
              brandPrimary,
              brandSecondary,
              onPush: pushToBrand,
            }
          : undefined
      }
    />
  );
}
