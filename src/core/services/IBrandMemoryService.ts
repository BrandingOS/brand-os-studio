// Phase 6.3 — Brand memory service interface.
//
// Tracks user preferences observed in a brand's saved designs.
// "Memory" categories (extensible — interface-only, no enum lock-in):
//   • 'color'    → most-used hex colors (analyzeBrandColors output)
//   • 'font'     → most-used font families (TBD)
//   • 'position' → common layer-position anchors (TBD)
//
// v1 surfaces just the "color" category. Future categories share the
// same interface so adapters scale without API churn.
//
// Local impl is a thin façade over IDesignStorage + analyzeBrandColors:
// recompute on demand, cache in memory per brand. A future Supabase
// impl writes through to a `brand_memory` table for cross-device
// synchronization.
import type { BrandColorEntry } from '@/features/brand-memory/analyzeBrandColors';

export type BrandMemoryCategory = 'color' | 'font' | 'position';

export interface BrandMemorySnapshot {
  /** When the analysis was computed. */
  computedAt: string;
  /** Top entries per category. v1 only populates 'color'. */
  colors: BrandColorEntry[];
}

export interface IBrandMemoryService {
  /**
   * Compute (or fetch from cache) the brand-memory snapshot for a
   * brand. Returns null when the brand has no analyzable designs yet.
   */
  getSnapshot(brandId: string, options?: { limit?: number }): Promise<BrandMemorySnapshot | null>;

  /**
   * Force a re-analysis. Local impl bypasses its in-memory cache;
   * Supabase impl re-reads designs and writes through. Use after a
   * design body changes if the caller wants fresh suggestions
   * immediately rather than waiting for cache TTL.
   */
  refresh(brandId: string): Promise<BrandMemorySnapshot | null>;
}
