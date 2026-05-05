/**
 * UI preference store — Studio (canonical) vs Classic (alternate).
 *
 * Persisted in localStorage so the choice survives reloads. Decoupled from
 * sessionStore so it can be set BEFORE auth resolves (e.g. on a fresh
 * device after sign-up, the default takes effect immediately).
 *
 * Default for both new and existing users: 'studio' (Phase A canonical).
 *
 * Don't reach for this store at every nav site. Most rail navigation
 * already preserves the user's current namespace via brandPathRewrite +
 * AppRail's pathname detection. This preference is only consulted at the
 * ENTRY into a brand from the workspace level — clicking a brand card
 * from /dashboard/brands, opening a brand from a search result, etc.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UiPreference = 'studio' | 'classic';

interface UiPreferenceStore {
  preference: UiPreference;
  setPreference: (p: UiPreference) => void;
}

export const useUiPreferenceStore = create<UiPreferenceStore>()(
  persist(
    (set) => ({
      preference: 'studio',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'brandos:ui-preference',
      version: 1,
    },
  ),
);

/** Read-only hook for components that just need to read the preference. */
export function useUiPreference(): UiPreference {
  return useUiPreferenceStore((s) => s.preference);
}

/** Setter hook for the settings UI. */
export function useSetUiPreference(): (p: UiPreference) => void {
  return useUiPreferenceStore((s) => s.setPreference);
}

/**
 * Imperative reader — for non-React callsites (link builders, navigate
 * outside hooks). Prefer the hook in components so React re-renders when
 * the preference changes.
 */
export function getCurrentUiPreference(): UiPreference {
  return useUiPreferenceStore.getState().preference;
}

/**
 * Returns the canonical entry URL for a brand, respecting the user's
 * UI preference. Studio users land on /b/:slug/setup (the canonical
 * Studio entry — Setup is the first migrated tab); Classic users land
 * on /a/:slug (Overview, the legacy IA's home page). Use at brand-entry
 * sites (workspace brand list, search results, brand switcher when
 * switching from outside a brand) so users land directly in their
 * preferred namespace's canonical home, no redirect hop.
 */
export function getBrandHomeUrl(slug: string): string {
  const pref = getCurrentUiPreference();
  return pref === 'classic' ? `/a/${slug}` : `/b/${slug}/setup`;
}
