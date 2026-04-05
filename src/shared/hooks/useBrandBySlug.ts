import { useState, useEffect } from 'react';
import { services } from '@/shared/services/registry';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import { isUuid } from '@/shared/utils/slug';

/**
 * Hook to load a brand by slug or ID.
 *
 * Subscribes to the Zustand brand store so the brand updates
 * immediately when changed (no page reload needed).
 */
export function useBrandBySlug(slugOrId: string | undefined) {
  const [localBrand, setLocalBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to store updates — when `current` or `list` changes, check if our brand was updated
  const storeCurrent = useBrandStore((s) => s.current);
  const storeList = useBrandStore((s) => s.list);

  // Initial fetch
  useEffect(() => {
    if (!slugOrId) {
      setLocalBrand(null);
      return;
    }

    const fetchBrand = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let foundBrand: Brand | null = null;

        if (isUuid(slugOrId)) {
          foundBrand = await services.brands.getById(slugOrId);
        } else {
          foundBrand = await services.brands.getBySlug(slugOrId);
        }

        setLocalBrand(foundBrand);

        // Also set as current in store so updates propagate
        if (foundBrand) {
          useBrandStore.getState().setCurrent(foundBrand);
        } else {
          setError('Brand not found');
        }
      } catch (err) {
        console.error('Error fetching brand:', err);
        setError('Failed to load brand');
        setLocalBrand(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrand();
  }, [slugOrId]);

  // React to store changes — if the current brand in the store matches ours, use the updated version
  useEffect(() => {
    if (!localBrand) return;

    // Check if the store's current brand is the same as ours (updated)
    if (storeCurrent && storeCurrent.id === localBrand.id) {
      // Only update if something actually changed
      if (storeCurrent.updatedAt !== localBrand.updatedAt ||
          storeCurrent.logo !== localBrand.logo ||
          storeCurrent.primaryColor !== localBrand.primaryColor ||
          storeCurrent.name !== localBrand.name ||
          storeCurrent.assets?.length !== localBrand.assets?.length) {
        setLocalBrand(storeCurrent);
      }
      return;
    }

    // Also check the list in case the brand was updated but isn't "current"
    const fromList = storeList.find(b => b.id === localBrand.id);
    if (fromList && (
      fromList.updatedAt !== localBrand.updatedAt ||
      fromList.logo !== localBrand.logo ||
      fromList.primaryColor !== localBrand.primaryColor ||
      fromList.name !== localBrand.name ||
      fromList.assets?.length !== localBrand.assets?.length
    )) {
      setLocalBrand(fromList);
    }
  }, [storeCurrent, storeList, localBrand]);

  return { brand: localBrand, isLoading, error };
}
