import { useState, useEffect } from 'react';
import { services } from '@/shared/services/registry';
import type { Brand } from '@/shared/types/brand';
import { isUuid } from '@/shared/utils/slug';

export function useBrandBySlug(slugOrId: string | undefined) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugOrId) {
      setBrand(null);
      return;
    }

    const fetchBrand = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        let foundBrand: Brand | null = null;
        
        // Check if it's a UUID (for backward compatibility)
        if (isUuid(slugOrId)) {
          foundBrand = await services.brands.getById(slugOrId);
        } else {
          // It's a slug
          foundBrand = await services.brands.getBySlug(slugOrId);
        }
        
        setBrand(foundBrand);
        
        if (!foundBrand) {
          setError('Brand not found');
        }
      } catch (err) {
        console.error('Error fetching brand:', err);
        setError('Failed to load brand');
        setBrand(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrand();
  }, [slugOrId]);

  return { brand, isLoading, error };
}