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
import type { IKitAdoptionService } from './services/IKitAdoptionService';
import type { IBrandContextService } from './services/IBrandContextService';
import { LocalBrandsService } from '@/features/brand/services/brands.local';
import { LocalDesignStorage } from './adapters/storage/LocalDesignStorage';
import { SupabaseDesignStorage } from './adapters/storage/SupabaseDesignStorage';
import { LocalBrandConsistencyService } from '@/features/brand-consistency/services/consistency.local';
import { LocalMockupTemplatesService } from './adapters/database/LocalMockupTemplatesService';
import { LocalAssetsService } from './adapters/database/LocalAssetsService';
import { LocalTemplatesService } from './adapters/templates/LocalTemplatesService';
import { LocalFormatPresetsService } from './adapters/format-presets/LocalFormatPresetsService';
import { LocalBrandMemoryService } from './adapters/brand-memory/LocalBrandMemoryService';
import { LocalKitAdoptionService } from './adapters/kit-adoptions/LocalKitAdoptionService';
import { SupabaseKitAdoptionService } from './adapters/kit-adoptions/SupabaseKitAdoptionService';
import { setKitStateRepository, LocalKitStateRepository } from '@/features/brand-kit/kit/repository';
import { SupabaseKitStateRepository } from '@/features/brand-kit/kit/repository.supabase';
import { LocalBrandContextService } from './adapters/brand-context/LocalBrandContextService';
import { SupabaseBrandContextService } from './adapters/brand-context/SupabaseBrandContextService';
import { SupabaseBrandsService } from '@/shared/services/brands.supabase';
import { SupabaseWorkspaceService } from './adapters/database/SupabaseWorkspaceService';
import { SupabaseAssetsService } from './adapters/database/SupabaseAssetsService';
import { SupabaseCommentsService } from './adapters/database/SupabaseCommentsService';
import { SupabaseApprovalsService } from './adapters/database/SupabaseApprovalsService';
import { SupabaseNotificationsService } from './adapters/database/SupabaseNotificationsService';
import { SupabaseActivityService } from './adapters/database/SupabaseActivityService';
import { LocalPublicationRepository } from '@/features/brand-identity/publish/publicationRepository';
import { SupabasePublicationRepository } from '@/features/brand-identity/publish/publicationRepository.supabase';

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

  // ─── Brand Identity publications ───────────────────────────
  // Browser-local until auth swaps in the server-backed one below. A guest's
  // share link works on their own machine and says so.
  container.register(
    SERVICE_KEYS.IDENTITY_PUBLICATIONS,
    () => new LocalPublicationRepository(),
  );

  // ─── Design Storage ────────────────────────────────────────
  // Guest/dev → localStorage. reconfigureForAuth swaps to SupabaseDesignStorage.
  container.register(SERVICE_KEYS.DESIGN_STORAGE, () => new LocalDesignStorage());

  // ─── DAM Assets (library) ──────────────────────────────────
  // Guest/dev → localStorage. reconfigureForAuth swaps to SupabaseAssetsService
  // (→ public.assets). The DAM library is the ONE home for uploaded brand files;
  // brand IDENTITY assets (logos referenced by logoSystem) stay in brand.brandAssets.
  container.register(
    SERVICE_KEYS.ASSETS,
    () =>
      new LocalAssetsService({
        // Lets softDelete tell the user an item is adopted instead of removing
        // material the Official Kit points at.
        adoptions: container.get<IKitAdoptionService>(SERVICE_KEYS.KIT_ADOPTIONS),
        context: container.get<IBrandContextService>(SERVICE_KEYS.BRAND_CONTEXT),
      }),
  );

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
  // Adoptions are the Official Brand Kit: references to what the brand owns,
  // never copies. Local by default; Supabase overrides below when authed.
  container.register(SERVICE_KEYS.KIT_ADOPTIONS, () => new LocalKitAdoptionService());

  // Brand Kit working state. The repository is a module-level seam rather than
  // a container key (its consumers are the kit store, not DI), so it is set
  // here alongside the rest of the wiring and reset to local on every boot —
  // otherwise a sign-out would leave the Supabase impl in place.
  setKitStateRepository(new LocalKitStateRepository());
  container.register(SERVICE_KEYS.BRAND_CONTEXT, () => new LocalBrandContextService());
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
  // Publications → server (migration 023; falls back to local when absent, so
  // the Publish control works either way and reports its real reach).
  container.register(
    SERVICE_KEYS.IDENTITY_PUBLICATIONS,
    () => new SupabasePublicationRepository(),
  );
  // Authed-only server services (no local guest equivalent — guest never gets these).
  container.register(SERVICE_KEYS.WORKSPACES, () => new SupabaseWorkspaceService());
  container.register(
    SERVICE_KEYS.ASSETS,
    () =>
      new SupabaseAssetsService({
        adoptions: container.get<IKitAdoptionService>(SERVICE_KEYS.KIT_ADOPTIONS),
        context: container.get<IBrandContextService>(SERVICE_KEYS.BRAND_CONTEXT),
      }),
  );
  container.register(SERVICE_KEYS.COMMENTS, () => new SupabaseCommentsService());
  container.register(SERVICE_KEYS.APPROVALS, () => new SupabaseApprovalsService());
  container.register(SERVICE_KEYS.NOTIFICATIONS, () => new SupabaseNotificationsService());
  container.register(SERVICE_KEYS.ACTIVITY, () => new SupabaseActivityService());
  container.register(SERVICE_KEYS.KIT_ADOPTIONS, () => new SupabaseKitAdoptionService());
  // Kit state → server (migration 018; tolerant of a pre-018 env, falls back
  // to localStorage so nothing breaks before the deploy).
  setKitStateRepository(new SupabaseKitStateRepository());
  container.register(SERVICE_KEYS.BRAND_CONTEXT, () => new SupabaseBrandContextService());
}
