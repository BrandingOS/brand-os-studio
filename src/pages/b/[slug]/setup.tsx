import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import SetupPage from '@/features/setup/SetupPage';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { useBrandStore } from '@/shared/store/brandStore';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { mockBrandToPatch } from '@/features/setup/data/mockBrandToPatch';
import type { MockBrand } from '@/features/setup/data/mockBrand';

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

  const handlePersist = useCallback(
    async (next: MockBrand) => {
      if (!brand) return;
      const patch = mockBrandToPatch(next, brand);
      if (Object.keys(patch).length === 0) return;
      try {
        await updateBrand(brand.id, patch);
      } catch (err) {
        toast.error('Could not save changes', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [brand, updateBrand],
  );

  if (!brand) return null;

  return (
    <SetupPage
      key={brand.id}
      initialBrand={brandToMockBrand(brand)}
      onPersist={handlePersist}
    />
  );
}
