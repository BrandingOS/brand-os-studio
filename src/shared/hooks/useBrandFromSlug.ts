import { useEffect } from 'react';
import { useBrandStore } from '@/shared/store/brandStore';
import { getSeedBrandBySlug } from '@/data/brands';
import type { Brand } from '@/shared/types/brand';

/**
 * Load a brand by its URL slug into the brand store and return the
 * resolved brand (or undefined while loading / if not found).
 *
 * Resolution order, on every render:
 *   1. `useBrandStore.current` when its slug matches — authoritative,
 *      includes in-flight edits.
 *   2. Synchronous fallback into the seed-brand registry (client-side
 *      constant array). This gives the FIRST render the right brand
 *      for /b/skam/setup etc. without waiting for the store's async
 *      `loadBySlug` to resolve — which was causing the "Nuworld mock
 *      flashes, then correct brand loads after a move/click" bug.
 *   3. Otherwise `undefined`.
 *
 * The effect still calls `loadBySlug` on mount so user-authored brands
 * (Supabase) pull into the store on top of any seed fallback.
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

  let brand: Brand | undefined = current?.slug === slug ? current : undefined;
  if (!brand && slug) {
    brand = getSeedBrandBySlug(slug);
  }
  return { brand, isLoading, error };
}
