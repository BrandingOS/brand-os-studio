import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import SetupPage from '@/features/setup/SetupPage';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { useBrandStore } from '@/shared/store/brandStore';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { mockBrandToPatch } from '@/features/setup/data/mockBrandToPatch';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { syncSetupLibrary } from '@/features/setup/data/syncSetupLibrary';
import { useService } from '@/core';
import { SERVICE_KEYS, type IAssetsService } from '@/core/types/services';
import { BrandNotFoundPanel } from '@/shared/components/BrandNotFoundPanel';

/**
 * Brand-scoped Setup tab at /b/:slug/setup.
 *
 * Wiring:
 *  1. Load the brand by slug (sync for seed brands, async for user brands).
 *  2. Project Brand → MockBrand for the editor.
 *  3. On each (debounced) edit inside SetupPage, project MockBrand →
 *     Partial<Brand> and hand the WHOLE patch to `brandStore.update`.
 *
 * That third step used to be ~90 lines here: Setup unpacked its own patch and
 * called changeBrandColors / changeBrandTypography / changeBrandVoiceTone /
 * changeBrandStrategy itself, then hand-merged the result into the store — up
 * to five sequential round-trips for one save, and a copy of the routing rules
 * that only Setup had. The store now owns that split for every caller
 * (`routeCoreWrite.ts`), so Setup is back to being a projection: MockBrand in,
 * patch out, one call. Colours edited here and colours edited anywhere else
 * travel the same road by construction rather than by two implementations
 * agreeing.
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
  const { brand, isLoading } = useBrandFromSlug(slug);
  const updateBrand = useBrandStore((s) => s.update);
  const reproject = useBrandStore((s) => s.reprojectLibrary);
  const assets = useService<IAssetsService>(SERVICE_KEYS.ASSETS);

  const handlePersist = useCallback(
    async (next: MockBrand) => {
      if (!brand) return;
      const patch = mockBrandToPatch(next, brand);

      try {
        if (Object.keys(patch).length > 0) {
          await updateBrand(brand.id, patch);
        }
        // Photos and icons have no home in the brand record — they go to the
        // Library, which is also where `brandToMockBrand` reads them back from
        // (via the projection). Additive: rearranging a Setup slot never
        // deletes Library material.
        const synced = await syncSetupLibrary(brand.id, next, assets);
        if (synced.createdPhotos || synced.createdIcons) {
          await reproject(brand.id);
        }
      } catch (err) {
        toast.error('Could not save changes', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [brand, updateBrand, assets, reproject],
  );

  if (!brand) return <BrandNotFoundPanel slug={slug} isLoading={isLoading} />;

  return (
    <SetupPage
      key={brand.id}
      brandId={brand.id}
      initialBrand={brandToMockBrand(brand)}
      onPersist={handlePersist}
    />
  );
}
