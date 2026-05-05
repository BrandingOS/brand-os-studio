// Phase 6.3 — Local IBrandMemoryService impl.
//
// Reads every design body for a brand via IDesignStorage, runs
// analyzeDocumentColors per doc, and ranks the merged tally. Cached
// in-memory per brand; refresh() bypasses the cache. No persistence
// (the Supabase impl will write through to a brand_memory table).
import type {
  BrandMemorySnapshot,
  IBrandMemoryService,
} from '@/core/services/IBrandMemoryService';
import type { IDesignStorage } from '@/core/types/services';
import type { BrandOSDocument } from '@/features/editor/schema';
import {
  analyzeDocumentColors,
  rankBrandColors,
} from '@/features/brand-memory/analyzeBrandColors';

const DEFAULT_LIMIT = 12;

export class LocalBrandMemoryService implements IBrandMemoryService {
  private cache = new Map<string, BrandMemorySnapshot>();

  constructor(private readonly designStorage: IDesignStorage) {}

  async getSnapshot(
    brandId: string,
    options: { limit?: number } = {},
  ): Promise<BrandMemorySnapshot | null> {
    const cached = this.cache.get(brandId);
    if (cached) {
      // Apply caller's limit on the cached entries (cache stores the
      // full ranked list; truncate per request).
      return truncateSnapshot(cached, options.limit ?? DEFAULT_LIMIT);
    }
    return this.refresh(brandId).then((snap) =>
      snap ? truncateSnapshot(snap, options.limit ?? DEFAULT_LIMIT) : null,
    );
  }

  async refresh(brandId: string): Promise<BrandMemorySnapshot | null> {
    const summaries = await this.designStorage.listDesigns(brandId);
    if (summaries.length === 0) {
      this.cache.delete(brandId);
      return null;
    }

    const perDoc: Map<string, number>[] = [];
    for (const s of summaries) {
      const doc = await this.designStorage.loadDesign(brandId, s.id);
      if (!doc) continue;
      perDoc.push(analyzeDocumentColors(doc as BrandOSDocument));
    }

    const colors = rankBrandColors(perDoc);
    const snapshot: BrandMemorySnapshot = {
      computedAt: new Date().toISOString(),
      colors,
    };
    this.cache.set(brandId, snapshot);
    return snapshot;
  }

  /** Test/debug helper — clears cache for a brand. Not on the public
   *  interface so it doesn't leak into production callers. */
  invalidate(brandId: string): void {
    this.cache.delete(brandId);
  }
}

function truncateSnapshot(
  snap: BrandMemorySnapshot,
  limit: number,
): BrandMemorySnapshot {
  return { ...snap, colors: snap.colors.slice(0, limit) };
}
