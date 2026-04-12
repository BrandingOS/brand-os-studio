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
import { LocalUploadService } from './adapters/upload/LocalUploadService';
import { SupabaseBrandsService } from '@/shared/services/brands.supabase';
import { SupabaseWorkspaceService } from './adapters/database/SupabaseWorkspaceService';
import { SupabaseAssetsService } from './adapters/database/SupabaseAssetsService';

export function bootServices(): void {
  // ─── Brands Service ────────────────────────────────────────
  // Start with local storage; reconfigureForAuth swaps to Supabase on login.
  container.register(SERVICE_KEYS.BRANDS, () => new LocalBrandsService());

  // ─── Design Storage ────────────────────────────────────────
  container.register(SERVICE_KEYS.DESIGN_STORAGE, () => new LocalDesignStorage());

  // ─── Upload Service ────────────────────────────────────────
  container.register(SERVICE_KEYS.UPLOAD, () => new LocalUploadService());
}

/**
 * Reconfigure services when auth state changes.
 * Called from useAuth when user logs in/out.
 *
 * - Authenticated: swap to Supabase-backed services
 * - Unauthenticated: revert to localStorage services
 */
export function reconfigureForAuth(isAuthenticated: boolean): void {
  // Clear singleton caches so next get() creates a fresh instance
  container.reset();

  if (isAuthenticated) {
    container.register(SERVICE_KEYS.BRANDS, () => new SupabaseBrandsService());
    container.register(SERVICE_KEYS.WORKSPACES, () => new SupabaseWorkspaceService());
    container.register(SERVICE_KEYS.ASSETS, () => new SupabaseAssetsService());
    container.register(SERVICE_KEYS.DESIGN_STORAGE, () => new LocalDesignStorage());
    container.register(SERVICE_KEYS.UPLOAD, () => new LocalUploadService());
  } else {
    // Revert to local implementations for guest mode
    bootServices();
  }
}
