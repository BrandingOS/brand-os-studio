/**
 * Unified Settings Store
 *
 * Single Zustand store for canvas/customizer settings (size, spacing,
 * header, footer, padding, radius) keyed by surface. Replaces the previously
 * scattered:
 *   - presentations-settings
 *   - logo-presentation-settings
 *   - social-media-settings
 *   - default-settings (brand-guide)
 *
 * New surfaces just pick a key (e.g. 'my-feature') and call
 * `useSurfaceSettings('my-feature')` — no new store needed.
 *
 * For backwards compatibility, the existing per-surface stores keep working;
 * this store is the new home for any new surface.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PresentationSettings } from './types';
import { DEFAULT_PRESENTATION_SETTINGS } from './types';

type SurfaceKey = string;

const DEFAULT_SETTINGS = DEFAULT_PRESENTATION_SETTINGS;

interface UnifiedSettingsState {
  settings: Record<SurfaceKey, PresentationSettings>;
  get: (surface: SurfaceKey) => PresentationSettings;
  update: (surface: SurfaceKey, patch: Partial<PresentationSettings>) => void;
  reset: (surface: SurfaceKey) => void;
}

export const useUnifiedSettingsStore = create<UnifiedSettingsState>()(
  persist(
    (set, get) => ({
      settings: {},
      get: (surface) => get().settings[surface] ?? DEFAULT_SETTINGS,
      update: (surface, patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [surface]: { ...(state.settings[surface] ?? DEFAULT_SETTINGS), ...patch },
          },
        })),
      reset: (surface) =>
        set((state) => {
          const { [surface]: _, ...rest } = state.settings;
          return { settings: rest };
        }),
    }),
    { name: 'unified-presentation-settings' },
  ),
);

/** Convenient hook returning the settings for a specific surface. */
export function useSurfaceSettings(surface: SurfaceKey): PresentationSettings {
  return useUnifiedSettingsStore((s) => s.settings[surface] ?? DEFAULT_SETTINGS);
}
