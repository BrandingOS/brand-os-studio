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
import { LocalBrandConsistencyService } from '@/features/brand-consistency/services/consistency.local';
import { LocalMockupTemplatesService } from './adapters/database/LocalMockupTemplatesService';
import { LocalTemplatesService } from './adapters/templates/LocalTemplatesService';
import { SupabaseBrandsService } from '@/shared/services/brands.supabase';
import { SupabaseWorkspaceService } from './adapters/database/SupabaseWorkspaceService';
import { SupabaseAssetsService } from './adapters/database/SupabaseAssetsService';
import { SupabaseCommentsService } from './adapters/database/SupabaseCommentsService';
import { SupabaseApprovalsService } from './adapters/database/SupabaseApprovalsService';
import { SupabaseNotificationsService } from './adapters/database/SupabaseNotificationsService';
import { SupabaseActivityService } from './adapters/database/SupabaseActivityService';

export function bootServices(): void {
  // ─── Brands Service ────────────────────────────────────────
  // Start with local storage; reconfigureForAuth swaps to Supabase on login.
  container.register(SERVICE_KEYS.BRANDS, () => new LocalBrandsService());

  // ─── Design Storage ────────────────────────────────────────
  container.register(SERVICE_KEYS.DESIGN_STORAGE, () => new LocalDesignStorage());

  // ─── Upload Service ────────────────────────────────────────
  container.register(SERVICE_KEYS.UPLOAD, () => new LocalUploadService());

  // ─── Brand Consistency Service ─────────────────────────────
  // LocalStorage-backed for now; a Supabase impl can be slotted in
  // later behind the same `IBrandConsistencyService` interface.
  container.register(SERVICE_KEYS.BRAND_CONSISTENCY, () => new LocalBrandConsistencyService());

  // ─── Mockup Templates ──────────────────────────────────────
  // Bundled local catalogue for V1 (admin-uploaded templates come
  // with the Phase 7 Supabase implementation).
  container.register(SERVICE_KEYS.MOCKUP_TEMPLATES, () => new LocalMockupTemplatesService());

  // ─── Phase 4 — Content Universe Templates ──────────────────
  // LocalStorage-backed dev default. Migrations
  // (supabase/migrations/20260504000000_009_templates_phase_4.sql)
  // define the production schema; deploying them + swapping to a
  // Supabase implementation is a one-line change here.
  container.register(SERVICE_KEYS.TEMPLATES, () => new LocalTemplatesService());
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
    container.register(SERVICE_KEYS.COMMENTS, () => new SupabaseCommentsService());
    container.register(SERVICE_KEYS.APPROVALS, () => new SupabaseApprovalsService());
    container.register(SERVICE_KEYS.NOTIFICATIONS, () => new SupabaseNotificationsService());
    container.register(SERVICE_KEYS.ACTIVITY, () => new SupabaseActivityService());
    container.register(SERVICE_KEYS.DESIGN_STORAGE, () => new LocalDesignStorage());
    container.register(SERVICE_KEYS.UPLOAD, () => new LocalUploadService());
    container.register(SERVICE_KEYS.BRAND_CONSISTENCY, () => new LocalBrandConsistencyService());
    container.register(SERVICE_KEYS.MOCKUP_TEMPLATES, () => new LocalMockupTemplatesService());
    container.register(SERVICE_KEYS.TEMPLATES, () => new LocalTemplatesService());
  } else {
    // Revert to local implementations for guest mode
    bootServices();
  }
}
