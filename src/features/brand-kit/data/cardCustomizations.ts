/**
 * Persistence for Brand Kit card-editor customizations (KIT-01).
 *
 * Each deliverable variant the user customizes in `BrandKitCardEditor`
 * (content fields, cover pick, color/logo/font selections) is stored
 * per brand + card key so Save actually survives closing the editor
 * and reloading the app. Keyed storage lives in ONE localStorage entry
 * to keep the brand record itself lean (covers can be long strings).
 *
 * Card key = `template.id` when the editor was opened from a drilldown
 * variant (each variant customizes independently), falling back to the
 * card label for direct right-click edits.
 */
import type { TemplateOverrides } from '../types';

export type SavedCardCustomization = {
  overrides: TemplateOverrides;
  cover: string | null;
  color: string | null;
  secondaryColor: string | null;
  logoId: string | null;
  logoColor: string | null;
  fontId: string | null;
  savedAt: string;
};

const STORAGE_KEY = 'brandos:brand-kit:customizations';

type StoreShape = Record<string, Record<string, SavedCardCustomization>>;

function readStore(): StoreShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as StoreShape) : {};
  } catch {
    return {};
  }
}

function writeStore(store: StoreShape): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota/serialization failure — surface nothing here; the caller
    // decides how to message the user.
  }
}

/** Stable key for one editable card surface. */
export function cardCustomizationKey(target: {
  label: string;
  template?: { id: string } | null;
}): string {
  return target.template?.id ?? `label:${target.label}`;
}

/** All saved customizations for a brand, keyed by card key. Used by
 *  the kit-state migration to seed approved items from pre-redesign
 *  card edits. */
export function loadBrandCustomizations(
  brandId: string | undefined,
): Record<string, SavedCardCustomization> {
  if (!brandId) return {};
  return readStore()[brandId] ?? {};
}

export function loadCardCustomization(
  brandId: string | undefined,
  cardKey: string,
): SavedCardCustomization | null {
  if (!brandId) return null;
  return readStore()[brandId]?.[cardKey] ?? null;
}

/** @returns true when the write landed in localStorage. */
export function saveCardCustomization(
  brandId: string | undefined,
  cardKey: string,
  customization: SavedCardCustomization,
): boolean {
  if (!brandId) return false;
  const store = readStore();
  store[brandId] = { ...(store[brandId] ?? {}), [cardKey]: customization };
  writeStore(store);
  return readStore()[brandId]?.[cardKey]?.savedAt === customization.savedAt;
}

export function clearCardCustomization(
  brandId: string | undefined,
  cardKey: string,
): void {
  if (!brandId) return;
  const store = readStore();
  if (!store[brandId]) return;
  delete store[brandId][cardKey];
  writeStore(store);
}

/* ─── Featured drilldown variants (KIT — picker "+" adds) ─────────
 * The drilldown's TemplatePickerModal appends variants to a card's
 * featured set. That set was session-only state; it persists here so
 * an added variant survives navigation and refresh, using the same
 * one-entry-per-concern localStorage pattern as the card
 * customizations above. Shape: brandId → card label → template ids. */

const FEATURED_KEY = 'brandos:brand-kit:featured-variants';

type FeaturedShape = Record<string, Record<string, string[]>>;

function readFeatured(): FeaturedShape {
  try {
    const raw = localStorage.getItem(FEATURED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as FeaturedShape) : {};
  } catch {
    return {};
  }
}

/** All persisted featured-variant lists for a brand, keyed by card label. */
export function loadFeaturedVariants(
  brandId: string | undefined,
): Record<string, string[]> {
  if (!brandId) return {};
  return readFeatured()[brandId] ?? {};
}

export function saveFeaturedVariants(
  brandId: string | undefined,
  label: string,
  templateIds: string[],
): void {
  if (!brandId) return;
  try {
    const store = readFeatured();
    store[brandId] = { ...(store[brandId] ?? {}), [label]: templateIds };
    localStorage.setItem(FEATURED_KEY, JSON.stringify(store));
  } catch {
    // Quota failure — the add still works for the session.
  }
}
