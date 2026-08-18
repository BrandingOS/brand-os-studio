/**
 * Service lifecycle (boot / reconfigureForAuth) — Batch B / B6.
 *
 * The swap is: always register the full local default set, then override only the
 * server-backed subset when authenticated. This test locks the two invariants that
 * matter: (1) local-only services (FORMAT_PRESETS / BRAND_MEMORY / templates / etc.)
 * are registered in BOTH guest and authed mode — they must never be dropped; and
 * (2) the guest→authed delta is exactly the server-backed services.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { bootServices, reconfigureForAuth } from '../boot';
import { container } from '../container/ServiceContainer';
import { SERVICE_KEYS, type IUserPreferencesService } from '../types/services';

const LOCAL_ALWAYS = [
  SERVICE_KEYS.BRANDS,
  SERVICE_KEYS.BRAND_REPOSITORY,
  SERVICE_KEYS.DESIGN_STORAGE,
  SERVICE_KEYS.ASSETS, // DAM library: LocalAssetsService (guest) / SupabaseAssetsService (authed)
  SERVICE_KEYS.BRAND_CONSISTENCY,
  SERVICE_KEYS.MOCKUP_TEMPLATES,
  SERVICE_KEYS.TEMPLATES,
  SERVICE_KEYS.FORMAT_PRESETS,
  SERVICE_KEYS.BRAND_MEMORY,
  // Brand System Foundation — stubs in Phase 0, real impls in the Kit/Context
  // phases. Registered in both modes from the start so the swap is a
  // one-line change here rather than a new registration site.
  SERVICE_KEYS.KIT_ADOPTIONS,
  SERVICE_KEYS.BRAND_CONTEXT,
  // Preferences are registered in BOTH modes on purpose: guests, dev-bypass
  // sessions and every pre-auth render read them synchronously, so there must
  // never be a window where the key is absent. Auth swaps the implementation,
  // not the presence.
  SERVICE_KEYS.USER_PREFERENCES,
];

const AUTHED_ONLY = [
  SERVICE_KEYS.WORKSPACES,
  SERVICE_KEYS.COMMENTS,
  SERVICE_KEYS.APPROVALS,
  SERVICE_KEYS.NOTIFICATIONS,
  SERVICE_KEYS.ACTIVITY,
];

afterEach(() => container.clear());

describe('reconfigureForAuth', () => {
  it('boot registers every local default', () => {
    container.clear();
    bootServices();
    for (const k of LOCAL_ALWAYS) expect(container.has(k)).toBe(true);
  });

  it('authenticated keeps ALL local-only services registered (no drop) + adds server ones', () => {
    container.clear();
    reconfigureForAuth(true);
    // Regression guard — these are NOT re-registered in the old authed block but
    // must survive because bootServices() runs first.
    expect(container.has(SERVICE_KEYS.FORMAT_PRESETS)).toBe(true);
    expect(container.has(SERVICE_KEYS.BRAND_MEMORY)).toBe(true);
    for (const k of LOCAL_ALWAYS) expect(container.has(k)).toBe(true);
    for (const k of AUTHED_ONLY) expect(container.has(k)).toBe(true);
  });

  it('swaps the preferences implementation on auth without ever unregistering it', () => {
    container.clear();
    reconfigureForAuth(false);
    const guest = container.get<IUserPreferencesService>(SERVICE_KEYS.USER_PREFERENCES);
    expect(guest.isServerBacked()).toBe(false);

    container.clear();
    reconfigureForAuth(true);
    // The authed impl extends the local one, so it is still a valid preferences
    // service — what changes is that it can reach the server row.
    expect(container.has(SERVICE_KEYS.USER_PREFERENCES)).toBe(true);
    expect(
      container.get(SERVICE_KEYS.USER_PREFERENCES).constructor.name,
    ).toBe('SupabaseUserPreferencesService');
  });

  it('guest mode registers local defaults but NOT the authed-only server services', () => {
    container.clear();
    reconfigureForAuth(false);
    for (const k of LOCAL_ALWAYS) expect(container.has(k)).toBe(true);
    for (const k of AUTHED_ONLY) expect(container.has(k)).toBe(false);
  });
});
