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
import { SERVICE_KEYS } from '../types/services';

const LOCAL_ALWAYS = [
  SERVICE_KEYS.BRANDS,
  SERVICE_KEYS.BRAND_REPOSITORY,
  SERVICE_KEYS.DESIGN_STORAGE,
  SERVICE_KEYS.BRAND_CONSISTENCY,
  SERVICE_KEYS.MOCKUP_TEMPLATES,
  SERVICE_KEYS.TEMPLATES,
  SERVICE_KEYS.FORMAT_PRESETS,
  SERVICE_KEYS.BRAND_MEMORY,
];

const AUTHED_ONLY = [
  SERVICE_KEYS.WORKSPACES,
  SERVICE_KEYS.ASSETS,
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

  it('guest mode registers local defaults but NOT the authed-only server services', () => {
    container.clear();
    reconfigureForAuth(false);
    for (const k of LOCAL_ALWAYS) expect(container.has(k)).toBe(true);
    for (const k of AUTHED_ONLY) expect(container.has(k)).toBe(false);
  });
});
