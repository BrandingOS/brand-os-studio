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
import { changeBrandColors } from '@/application/brand/changeBrandColor';
import { toLegacyBrandPatch } from '@/domain/brand';
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

  const repo = useService<BrandRepository>(SERVICE_KEYS.BRAND_REPOSITORY);
  const pushToBrand = useCallback(
    async (palette: PaletteSystem) => {
      if (!brand) return;
      try {
        const stops: ShadeStop[] = [50, 100, 200, 500, 800, 950];
        // Route through the canonical color operation (A7 fix — was a competing
        // scalar-only write that left colorSystem stale for canonical readers).
        const updated = await changeBrandColors(repo, brand.id, {
          primary: { hex: palette.roles.primary.inputHex },
          ...(palette.roles.secondary?.inputHex ? { secondary: { hex: palette.roles.secondary.inputHex } } : {}),
          ...(palette.roles.tertiary?.inputHex ? { accent: { hex: palette.roles.tertiary.inputHex } } : {}),
          neutrals: stops.map((s) => ({ hex: palette.roles.neutral.shades[s].hex })),
        });
        const patch = toLegacyBrandPatch(updated);
        useBrandStore.setState((st) => ({
          current: st.current?.id === brand.id ? { ...st.current, ...patch } : st.current,
          list: st.list.map((b) => (b.id === brand.id ? { ...b, ...patch } : b)),
        }));
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
    [brand, repo],
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
