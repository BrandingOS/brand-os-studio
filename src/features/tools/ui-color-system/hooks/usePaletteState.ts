/**
 * Palette state hook.
 *
 * Single source of truth for the UI Color System generator. Uses a
 * Zustand store (instance-per-hook, not global) so that multiple tabs
 * or side-by-side comparisons can coexist without bleeding state.
 *
 * Responsibilities:
 *   - Hold the current `PaletteSystem` object.
 *   - Expose mutating actions: setSeed, editShade, lockShade, resetShade,
 *     setSetting, addRole, removeRole, applyHarmony, regenerateSemantics.
 *   - Recompute `semanticTokens` whenever roles change.
 *   - Track history for undo/redo (kept separate in usePaletteHistory).
 */
import { useMemo } from 'react';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

import {
  generateShades,
  generateSemanticTokens,
  suggestAllSemanticSeeds,
  suggestNeutralScale,
  generateHarmony,
  type HarmonyName,
  type PaletteSettings,
  type PaletteSystem,
  type RoleKey,
  type RolePaletteMap,
  type ShadeStop,
  type Theme,
} from '@/lib/color-engine';

export interface PaletteStateSnapshot extends PaletteSystem {
  theme: Theme;
}

export interface PaletteActions {
  setSeed: (hex: string) => void;
  setRoleSeed: (role: RoleKey, hex: string) => void;
  addRole: (role: RoleKey) => void;
  removeRole: (role: RoleKey) => void;
  editShade: (role: RoleKey, stop: ShadeStop, hex: string) => void;
  lockShade: (role: RoleKey, stop: ShadeStop, locked: boolean) => void;
  resetShade: (role: RoleKey, stop: ShadeStop) => void;
  setSetting: <K extends keyof PaletteSettings>(key: K, value: PaletteSettings[K]) => void;
  setTheme: (theme: Theme) => void;
  applyHarmony: (harmony: HarmonyName) => void;
  regenerateFromPrimary: () => void;
  replace: (next: PaletteSystem) => void;
}

type Store = PaletteStateSnapshot & PaletteActions;

function buildInitial(seedHex: string): PaletteSystem {
  const primary = generateShades(seedHex);
  const neutral = suggestNeutralScale(seedHex);
  const semanticSeeds = suggestAllSemanticSeeds(seedHex);
  const roles: RolePaletteMap = {
    primary,
    secondary: null,
    tertiary: null,
    neutral,
    success: generateShades(semanticSeeds.success),
    warning: generateShades(semanticSeeds.warning),
    error: generateShades(semanticSeeds.error),
    info: generateShades(semanticSeeds.info),
  };
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `p-${Date.now()}`,
    name: 'Untitled palette',
    ownerId: null,
    brandId: null,
    visibility: 'private',
    sourceType: 'manual',
    seedColor: primary.inputHex,
    roles,
    semanticTokens: generateSemanticTokens(roles, 'light'),
    settings: {
      contrastStandard: 'WCAG',
      colorSpace: 'HEX',
      lockedShade: null,
      generationMode: 'auto',
    },
    chartColors: [],
    gradients: [],
    tags: [],
    publicSlug: null,
    createdAt: now,
    updatedAt: now,
  };
}

function recomputeSemantic(state: PaletteStateSnapshot): PaletteStateSnapshot {
  return {
    ...state,
    semanticTokens: generateSemanticTokens(state.roles, state.theme),
    updatedAt: new Date().toISOString(),
  };
}

export type PaletteStore = UseBoundStore<StoreApi<Store>>;

export function createPaletteStore(initialSeed: string = '#0ea5e9'): PaletteStore {
  return create<Store>((set, get) => ({
    ...buildInitial(initialSeed),
    theme: 'light',

    setSeed: (hex) => {
      set((s) => {
        const primary = generateShades(hex, { lockedShade: s.settings.lockedShade });
        const neutral = suggestNeutralScale(hex);
        const semanticSeeds = suggestAllSemanticSeeds(hex);
        const roles: RolePaletteMap = {
          ...s.roles,
          primary,
          neutral,
          success: s.roles.success ? generateShades(semanticSeeds.success) : null,
          warning: s.roles.warning ? generateShades(semanticSeeds.warning) : null,
          error: s.roles.error ? generateShades(semanticSeeds.error) : null,
          info: s.roles.info ? generateShades(semanticSeeds.info) : null,
        };
        return recomputeSemantic({
          ...s,
          seedColor: primary.inputHex,
          roles,
        });
      });
    },

    setRoleSeed: (role, hex) => {
      set((s) => {
        if (role === 'primary') return get().setSeed(hex) as unknown as Store;
        const newScale = generateShades(hex, { lockedShade: s.settings.lockedShade });
        const roles: RolePaletteMap = { ...s.roles, [role]: newScale };
        return recomputeSemantic({ ...s, roles });
      });
    },

    addRole: (role) => {
      set((s) => {
        if (s.roles[role]) return s;
        const seed =
          role === 'secondary' || role === 'tertiary'
            ? complementaryOf(s.roles.primary.inputHex, role === 'tertiary')
            : suggestAllSemanticSeeds(s.roles.primary.inputHex)[
                role as 'success' | 'warning' | 'error' | 'info'
              ];
        const roles: RolePaletteMap = { ...s.roles, [role]: generateShades(seed) };
        return recomputeSemantic({ ...s, roles });
      });
    },

    removeRole: (role) => {
      if (role === 'primary' || role === 'neutral') return;
      set((s) => {
        const roles: RolePaletteMap = { ...s.roles, [role]: null };
        return recomputeSemantic({ ...s, roles });
      });
    },

    editShade: (role, stop, hex) => {
      set((s) => {
        const scale = s.roles[role];
        if (!scale) return s;
        const next = generateShades(scale.inputHex, {
          lockedShade: s.settings.lockedShade,
          overrides: collectOverrides(scale, { [stop]: { hex, locked: true } }),
        });
        const roles: RolePaletteMap = { ...s.roles, [role]: next };
        return recomputeSemantic({ ...s, roles });
      });
    },

    lockShade: (role, stop, locked) => {
      set((s) => {
        const scale = s.roles[role];
        if (!scale) return s;
        const existing = scale.shades[stop];
        const next = generateShades(scale.inputHex, {
          lockedShade: s.settings.lockedShade,
          overrides: collectOverrides(scale, {
            [stop]: { hex: existing.hex, locked },
          }),
        });
        const roles: RolePaletteMap = { ...s.roles, [role]: next };
        return recomputeSemantic({ ...s, roles });
      });
    },

    resetShade: (role, stop) => {
      set((s) => {
        const scale = s.roles[role];
        if (!scale) return s;
        const overrides = collectOverrides(scale, {});
        delete overrides[stop];
        const next = generateShades(scale.inputHex, {
          lockedShade: s.settings.lockedShade,
          overrides,
        });
        const roles: RolePaletteMap = { ...s.roles, [role]: next };
        return recomputeSemantic({ ...s, roles });
      });
    },

    setSetting: (key, value) => {
      set((s) => ({
        ...s,
        settings: { ...s.settings, [key]: value },
      }));
      if (key === 'lockedShade') {
        // Regenerate primary with the new lock target.
        get().setSeed(get().roles.primary.inputHex);
      }
    },

    setTheme: (theme) => {
      set((s) => recomputeSemantic({ ...s, theme }));
    },

    applyHarmony: (harmony) => {
      set((s) => {
        const { seeds } = generateHarmony(s.roles.primary.inputHex, harmony);
        const secondary = seeds[1] ? generateShades(seeds[1]) : null;
        const tertiary = seeds[2] ? generateShades(seeds[2]) : null;
        const roles: RolePaletteMap = { ...s.roles, secondary, tertiary };
        return recomputeSemantic({ ...s, roles });
      });
    },

    regenerateFromPrimary: () => {
      get().setSeed(get().roles.primary.inputHex);
    },

    replace: (next) => {
      set((s) => ({ ...s, ...next, theme: s.theme }));
    },
  }));
}

function collectOverrides(
  scale: { shades: Record<number, { hex: string; edited: boolean; locked: boolean }> },
  patch: Partial<Record<ShadeStop, { hex: string; locked?: boolean }>>,
) {
  const overrides: Partial<Record<ShadeStop, { hex: string; locked: boolean }>> = {};
  for (const [stop, value] of Object.entries(scale.shades) as [string, { hex: string; edited: boolean; locked: boolean }][]) {
    if (value.edited || value.locked) {
      overrides[Number(stop) as ShadeStop] = { hex: value.hex, locked: value.locked };
    }
  }
  for (const [stop, value] of Object.entries(patch) as [string, { hex: string; locked?: boolean }][]) {
    overrides[Number(stop) as ShadeStop] = { hex: value.hex, locked: value.locked ?? false };
  }
  return overrides;
}

function complementaryOf(seedHex: string, split = false): string {
  const harmony = generateHarmony(seedHex, split ? 'split-complementary' : 'complementary');
  return harmony.seeds[1] ?? harmony.seeds[0];
}

/**
 * Convenience hook: returns a stable store instance scoped to the
 * component mounting it.
 */
export function usePaletteStore(initialSeed = '#0ea5e9'): PaletteStore {
  return useMemo(() => createPaletteStore(initialSeed), [initialSeed]);
}
