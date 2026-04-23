import { useEffect } from 'react';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';

/**
 * Load a brand by its URL slug into the brand store and return the
 * resolved brand (or undefined while loading / if not found).
 *
 * Usage:
 *   const { slug } = useParams<{ slug: string }>();
 *   const { brand, isLoading, error } = useBrandFromSlug(slug);
 */
export function useBrandFromSlug(slug: string | undefined): {
  brand: Brand | undefined;
  isLoading: boolean;
  error: string | undefined;
} {
  const loadBySlug = useBrandStore((s) => s.loadBySlug);
  const current = useBrandStore((s) => s.current);
  const isLoading = useBrandStore((s) => s.isLoading);
  const error = useBrandStore((s) => s.error);

  useEffect(() => {
    if (!slug) return;
    if (current?.slug === slug) return;
    void loadBySlug(slug);
  }, [slug, current?.slug, loadBySlug]);

  const brand = current?.slug === slug ? current : undefined;
  return { brand, isLoading, error };
}
