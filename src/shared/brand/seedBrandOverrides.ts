/**
 * Seed-brand override layer.
 *
 * Seed brands (Raqm / SKAM / Vector / Nuworld demo) are constants in
 * `src/data/brands/*` — they aren't database rows. So when the user
 * edits one in /setup, the patch can't be persisted via Supabase
 * (no row to UPDATE) or LocalBrandsService (which writes whole-brand
 * snapshots to localStorage).
 *
 * This module is the fix: per-seed-brand patches are merged into a
 * single localStorage entry, and applied on top of the seed at read
 * time. Both `LocalBrandsService` and `SupabaseBrandsService` route
 * seed reads/writes through here so edits survive reloads, propagate
 * to every consumer (case-study, brand kit, presentation slides),
 * and stay isolated from real DB rows.
 */

import type { Brand } from '@/shared/types/brand';

const STORAGE_KEY = 'brandos:seed-brand-overrides';

type Store = Record<string, Partial<Brand>>;

function read(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota — fail silently; the user's edit just won't survive a reload */
  }
}

/** Read the patch for a single seed brand. Returns {} if none. */
export function getSeedOverride(id: string): Partial<Brand> {
  return read()[id] ?? {};
}

/** Merge a patch into the stored override for a seed brand. */
export function patchSeedOverride(id: string, patch: Partial<Brand>): Partial<Brand> {
  const store = read();
  const prev = store[id] ?? {};
  // For nested objects (colorSystem, typography, guidelines, fonts) we want
  // a shallow merge so a partial fonts patch doesn't drop colorSystem.
  const next: Partial<Brand> = { ...prev, ...patch };
  // Strip undefined keys so we don't accumulate dead keys.
  Object.keys(next).forEach((k) => {
    if ((next as Record<string, unknown>)[k] === undefined) {
      delete (next as Record<string, unknown>)[k];
    }
  });
  store[id] = next;
  write(store);
  return next;
}

/** Drop all overrides for a single seed brand (revert to defaults). */
export function clearSeedOverride(id: string) {
  const store = read();
  if (!store[id]) return;
  delete store[id];
  write(store);
}

/** Apply the stored override on top of a seed brand snapshot. Pure. */
export function applySeedOverride(brand: Brand): Brand {
  const override = getSeedOverride(brand.id);
  if (Object.keys(override).length === 0) return brand;
  return {
    ...brand,
    ...override,
    // updatedAt is always bumped so consumers detect change.
    updatedAt: (override.updatedAt as Date | undefined) ?? new Date(),
  };
}
