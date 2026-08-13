/**
 * Phase 0 placeholder for Brand Context v1.
 *
 * The DI contract lands now; the real local (ring-buffered localStorage) and
 * Supabase implementations arrive with the Context phase and REPLACE this file's
 * registration in boot.ts.
 *
 * Note the asymmetry, and that it is deliberate: `record()` no-ops instead of
 * throwing, because the interface's core promise is that capture is silent and
 * never interrupts the user — a stub that threw would violate that contract the
 * moment the first call site landed. Reads return empty; `remove` throws because
 * a caller deleting a signal deserves to know it did not happen.
 */
import type {
  ContextQuery,
  ContextSignal,
  ContextSummary,
  IBrandContextService,
  NewContextSignal,
} from '@/core/services/IBrandContextService';

export class StubBrandContextService implements IBrandContextService {
  async record(_signal: NewContextSignal): Promise<void> {
    // Intentionally silent: signals are non-essential and must never surface.
  }

  async list(_brandId: string, _q?: ContextQuery): Promise<ContextSignal[]> {
    return [];
  }

  async remove(_id: string): Promise<void> {
    throw new Error(
      '[BrandContextService] Not implemented yet — the Brand Context phase ' +
        'replaces this Phase 0 stub with the local/Supabase implementations.',
    );
  }

  async summarize(_brandId: string): Promise<ContextSummary> {
    return {
      referenceIds: [],
      likedRefs: [],
      dislikedRefs: [],
      preferences: {},
      signalCount: 0,
    };
  }
}
