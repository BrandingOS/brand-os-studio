import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import SetupPage from '@/features/setup/SetupPage';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { useBrandStore } from '@/shared/store/brandStore';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { mockBrandToPatch } from '@/features/setup/data/mockBrandToPatch';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { useService, SERVICE_KEYS } from '@/core';
import type { BrandRepository } from '@/domain/brand/repository';
import { changeBrandColors } from '@/application/brand/changeBrandColor';
import { toLegacyBrandPatch } from '@/domain/brand';
import { applyBrandTokens } from '@/shared/design-system/PresentationStyleAdapter';

/**
 * Brand-scoped Setup tab at /b/:slug/setup.
 *
 * Wiring:
 *  1. Load the brand by slug (sync for seed brands, async for user brands).
 *  2. Project Brand → MockBrand for the editor.
 *  3. On each (debounced) edit inside SetupPage, project MockBrand →
 *     Partial<Brand> and call `brandStore.update(id, patch)` so every
 *     edit persists through the service layer (localStorage +
 *     Supabase, depending on which brands service is active).
 *
 * CRITICAL: we never render SetupPage with `initialBrand=undefined`.
 * Its `useState` captures the initial prop once — feeding undefined
 * would stick on the Nuworld mock. The seed fallback in
 * `useBrandFromSlug` handles /b/skam, /b/raqm, /b/vector
 * synchronously.
 *
 * `key={brand.id}` forces a clean remount when switching brands so
 * the edit state inside SetupPage resets cleanly.
 */
export default function BrandSetupPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand } = useBrandFromSlug(slug);
  const updateBrand = useBrandStore((s) => s.update);
  const repo = useService<BrandRepository>(SERVICE_KEYS.BRAND_REPOSITORY);

  const handlePersist = useCallback(
    async (next: MockBrand) => {
      if (!brand) return;
      const patch = mockBrandToPatch(next, brand);
      if (Object.keys(patch).length === 0) return;

      // A0 — route color through the ONE canonical color operation and strip it
      // from the legacy patch, so Setup and the ColorsTab share a single color
      // write authority. Non-color fields (name, logos, fonts) still flow through
      // the legacy update until their own slices migrate.
      const changes: Parameters<typeof changeBrandColors>[2] = {};
      if (patch.primaryColor) changes.primary = { hex: patch.primaryColor };
      if (patch.secondaryColor) changes.secondary = { hex: patch.secondaryColor };
      if (patch.accentColor) changes.accent = { hex: patch.accentColor };
      if (patch.neutrals) changes.neutrals = patch.neutrals.map((hex) => ({ hex }));
      const {
        primaryColor: _p,
        secondaryColor: _s,
        accentColor: _a,
        neutrals: _n,
        colorSystem: _cs,
        ...rest
      } = patch;

      try {
        if (Object.keys(changes).length > 0) {
          const updated = await changeBrandColors(repo, brand.id, changes);
          const cpatch = toLegacyBrandPatch(updated);
          useBrandStore.setState((st) => ({
            current: st.current?.id === brand.id ? { ...st.current, ...cpatch } : st.current,
            list: st.list.map((b) => (b.id === brand.id ? { ...b, ...cpatch } : b)),
          }));
          const cur = useBrandStore.getState().current;
          if (cur?.id === brand.id) applyBrandTokens(cur);
        }
        if (Object.keys(rest).length > 0) {
          await updateBrand(brand.id, rest);
        }
      } catch (err) {
        toast.error('Could not save changes', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [brand, updateBrand, repo],
  );

  if (!brand) return null;

  return (
    <SetupPage
      key={brand.id}
      brandId={brand.id}
      initialBrand={brandToMockBrand(brand)}
      onPersist={handlePersist}
    />
  );
}
