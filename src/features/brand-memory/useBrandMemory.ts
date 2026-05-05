// Phase 6.3 — React hook over IBrandMemoryService.
//
// Loads a brand's memory snapshot lazily on mount; recomputes when
// brandId changes; exposes a manual `refresh()` for callers that
// want to re-analyze after a known design change.
import { useCallback, useEffect, useState } from 'react';
import { SERVICE_KEYS } from '@/core';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import type {
  BrandMemorySnapshot,
  IBrandMemoryService,
} from '@/core/services/IBrandMemoryService';

interface UseBrandMemoryResult {
  snapshot: BrandMemorySnapshot | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * @param brandId Brand to analyze. Pass null/undefined to no-op.
 * @param options Forwarded to IBrandMemoryService.getSnapshot.
 */
export function useBrandMemory(
  brandId: string | null | undefined,
  options: { limit?: number } = {},
): UseBrandMemoryResult {
  const [snapshot, setSnapshot] = useState<BrandMemorySnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const limit = options.limit;

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!brandId) {
        setSnapshot(null);
        return;
      }
      const svc = serviceContainer.has(SERVICE_KEYS.BRAND_MEMORY)
        ? serviceContainer.get<IBrandMemoryService>(SERVICE_KEYS.BRAND_MEMORY)
        : null;
      if (!svc) {
        setSnapshot(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const snap = forceRefresh
          ? await svc.refresh(brandId)
          : await svc.getSnapshot(brandId, { limit });
        setSnapshot(snap);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [brandId, limit],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { snapshot, loading, error, refresh };
}
