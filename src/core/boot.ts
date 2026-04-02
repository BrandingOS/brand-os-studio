/**
 * Application Boot — configures the service container.
 *
 * This is the SINGLE place where we decide which implementations to use.
 * It's called once at app startup in main.tsx.
 *
 * Environment-aware:
 *   - DEV/guest → Local implementations (localStorage)
 *   - PROD/authenticated → Supabase implementations
 *
 * This replaces the old registry.ts pattern where services were
 * lazily instantiated via getters with runtime checks.
 */

import { container } from './container/ServiceContainer';
import { SERVICE_KEYS } from './types/services';
import { LocalBrandsService } from '@/features/brand/services/brands.local';
import { LocalDesignStorage } from './adapters/storage/LocalDesignStorage';

export function bootServices(): void {
  // ─── Brands Service ────────────────────────────────────────
  // In dev mode, always use local storage.
  // In production with auth, this would be swapped for SupabaseBrandsService.
  container.register(SERVICE_KEYS.BRANDS, () => new LocalBrandsService());

  // ─── Design Storage ────────────────────────────────────────
  container.register(SERVICE_KEYS.DESIGN_STORAGE, () => new LocalDesignStorage());
}

/**
 * Reconfigure services when auth state changes.
 * Called from AuthProvider when user logs in/out.
 */
export function reconfigureForAuth(isAuthenticated: boolean): void {
  if (isAuthenticated && !import.meta.env.DEV) {
    // In production authenticated mode, swap to Supabase services
    // container.register(SERVICE_KEYS.BRANDS, () => new SupabaseBrandsService());
    // For now, keep local until Supabase is fully configured
  }
}
