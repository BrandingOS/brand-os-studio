import { useCallback } from 'react';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';

/**
 * Centralized hook for updating brand data.
 *
 * ALL brand updates must go through this hook (or useBrandStore.update directly).
 * Never call services.brands.update() directly — it bypasses the store
 * and other components won't see the change without a page reload.
 *
 * Usage:
 *   const { updateBrand, updateBrandSilent } = useBrandUpdate();
 *   await updateBrand(brandId, { logo: dataUrl });
 */
export function useBrandUpdate() {
  const update = useBrandStore((s) => s.update);

  /** Update brand and show success/error toast */
  const updateBrand = useCallback(async (
    brandId: string,
    patch: Partial<Brand>,
    successMessage?: string,
  ) => {
    try {
      await update(brandId, patch);
      if (successMessage) toast.success(successMessage);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update brand';
      toast.error(msg);
      throw err;
    }
  }, [update]);

  /** Update brand silently (no toast) */
  const updateBrandSilent = useCallback(async (
    brandId: string,
    patch: Partial<Brand>,
  ) => {
    await update(brandId, patch);
  }, [update]);

  return { updateBrand, updateBrandSilent };
}
