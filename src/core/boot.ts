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
import type { IBrandsService } from './types/services';
import { BrandServiceRepository } from '@/platform/brand/BrandServiceRepository';
import type { IDesignStorage } from './types/services';
import { LocalBrandsService } from '@/features/brand/services/brands.local';
import { LocalDesignStorage } from './adapters/storage/LocalDesignStorage';
import { SupabaseDesignStorage } from './adapters/storage/SupabaseDesignStorage';
import { LocalBrandConsistencyService } from '@/features/brand-consistency/services/consistency.local';
import { LocalMockupTemplatesService } from './adapters/database/LocalMockupTemplatesService';
import { LocalAssetsService } from './adapters/database/LocalAssetsService';
import { LocalTemplatesService } from './adapters/templates/LocalTemplatesService';
import { LocalFormatPresetsService } from './adapters/format-presets/LocalFormatPresetsService';
import { LocalBrandMemoryService } from './adapters/brand-memory/LocalBrandMemoryService';
import { StubKitAdoptionService } from './adapters/kit-adoptions/StubKitAdoptionService';
import { StubBrandContextService } from './adapters/brand-context/StubBrandContextService';
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

  // ─── Canonical Brand Repository (Stage 2B/2D) ──────────────
  // A canonical facade over whichever BRANDS service is active. Used by the
  // migrated Color slice (changeBrandColor) so color edits go through the
  // canonical model + one authoritative write path.
  container.register(
    SERVICE_KEYS.BRAND_REPOSITORY,
    () => new BrandServiceRepository(container.get<IBrandsService>(SERVICE_KEYS.BRANDS)),
  );

  // ─── Design Storage ────────────────────────────────────────
  // Guest/dev → localStorage. reconfigureForAuth swaps to SupabaseDesignStorage.
  container.register(SERVICE_KEYS.DESIGN_STORAGE, () => new LocalDesignStorage());

  // ─── DAM Assets (library) ──────────────────────────────────
  // Guest/dev → localStorage. reconfigureForAuth swaps to SupabaseAssetsService
  // (→ public.assets). The DAM library is the ONE home for uploaded brand files;
  // brand IDENTITY assets (logos referenced by logoSystem) stay in brand.brandAssets.
  container.register(SERVICE_KEYS.ASSETS, () => new LocalAssetsService());

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

  // ─── Phase 5.1b — Format Presets ────────────────────────────
  // Reads from the in-memory ContentTypeConfig registry. A future
  // SupabaseFormatPresetsService backed by the format_presets table
  // (migration deliberately deferred until an admin UI ships) will
  // swap in here behind the same interface.
  container.register(SERVICE_KEYS.FORMAT_PRESETS, () => new LocalFormatPresetsService());

  // ─── Phase 6.3 — Brand Memory ──────────────────────────────
  // Re-analyzes a brand's saved designs on demand and caches the
  // ranked color/font/position usage in memory. Supabase impl will
  // write through to a `brand_memory` table for cross-device sync.
  container.register(SERVICE_KEYS.BRAND_MEMORY, () => {
    const ds = container.get<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE);
    return new LocalBrandMemoryService(ds);
  });

  // ─── Brand System Foundation — Official Kit + Context ───────
  // Phase 0 registers the DI contract with stub implementations so consumers
  // can be typed against a stable interface. The Official Kit and Context
  // phases replace these two lines with the local implementations (and add
  // Supabase overrides below). Registered in BOTH modes, like every other
  // service, so `boot.test.ts` can assert the key resolves either way.
  container.register(SERVICE_KEYS.KIT_ADOPTIONS, () => new StubKitAdoptionService());
  container.register(SERVICE_KEYS.BRAND_CONTEXT, () => new StubBrandContextService());
}

/**
 * Reconfigure services when auth state changes (called from useAuth on login/out).
 *
 * The model is deliberately simple + explicit: ALWAYS re-establish the full set of
 * local defaults (`bootServices()`), then — only when authenticated — OVERRIDE the
 * subset of services that have a server-backed implementation. This removes the old
 * duplicated registration list, guarantees every service (incl. FORMAT_PRESETS /
 * BRAND_MEMORY) is registered in both modes, and makes the guest→authed delta a
 * single readable block. Everything NOT in that block (brand consistency, mockup +
 * content templates, format presets, brand memory) is intentionally local in both
 * modes until it gets its own server backing.
 */
export function reconfigureForAuth(isAuthenticated: boolean): void {
  // reset() clears cached singleton instances (not registrations); re-running
  // bootServices() re-registers every local default fresh.
  container.reset();
  bootServices();

  if (!isAuthenticated) return; // guest mode uses the local defaults as-is.

  // ── Services that become SERVER-BACKED when authenticated ──
  container.register(SERVICE_KEYS.BRANDS, () => new SupabaseBrandsService());
  container.register(
    SERVICE_KEYS.BRAND_REPOSITORY,
    () => new BrandServiceRepository(container.get<IBrandsService>(SERVICE_KEYS.BRANDS)),
  );
  // Designs → server (migration 015; tolerant of a pre-015 env, falls back to local).
  container.register(SERVICE_KEYS.DESIGN_STORAGE, () => new SupabaseDesignStorage());
  // Authed-only server services (no local guest equivalent — guest never gets these).
  container.register(SERVICE_KEYS.WORKSPACES, () => new SupabaseWorkspaceService());
  container.register(SERVICE_KEYS.ASSETS, () => new SupabaseAssetsService());
  container.register(SERVICE_KEYS.COMMENTS, () => new SupabaseCommentsService());
  container.register(SERVICE_KEYS.APPROVALS, () => new SupabaseApprovalsService());
  container.register(SERVICE_KEYS.NOTIFICATIONS, () => new SupabaseNotificationsService());
  container.register(SERVICE_KEYS.ACTIVITY, () => new SupabaseActivityService());
}
