// src/shared/presentation/theme/store.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DeckKind, PresentationTheme } from './types';
import { EMPTY_THEME } from './types';

type Key = `${string}:${DeckKind}`;
const k = (brandId: string, kind: DeckKind): Key => `${brandId}:${kind}` as Key;

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

interface DeckThemeStore {
  byKey: Partial<Record<Key, PresentationTheme>>;
  draftFor: (brandId: string, kind: DeckKind) => PresentationTheme;
  hydrate: (brandId: string, kind: DeckKind, theme: PresentationTheme | undefined) => void;
  setTheme: (brandId: string, kind: DeckKind, next: PresentationTheme) => void;
  patchTheme: (brandId: string, kind: DeckKind, patch: DeepPartial<PresentationTheme>) => void;
  reset: (brandId: string, kind: DeckKind) => void;
}

/**
 * Deep-merge `patch` over `base`. Plain objects merge recursively;
 * arrays REPLACE wholesale (the patch's array wins). `undefined`
 * patch keys leave the base value untouched — use `null` if you
 * actually want to clear a value.
 */
function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (patch === undefined || patch === null) return base;
  if (typeof base !== 'object' || base === null) return (patch as T) ?? base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const key of Object.keys(patch as object)) {
    const v = (patch as any)[key];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[key] = deepMerge((base as any)[key] ?? {}, v);
    } else if (v !== undefined) {
      out[key] = v;
    }
  }
  return out as T;
}

export const useDeckThemeStore = create<DeckThemeStore>()(
  devtools((set, get) => ({
    byKey: {},
    draftFor: (brandId, kind) => get().byKey[k(brandId, kind)] ?? EMPTY_THEME,
    hydrate: (brandId, kind, theme) => set((s) => ({ byKey: { ...s.byKey, [k(brandId, kind)]: theme ?? EMPTY_THEME } })),
    setTheme: (brandId, kind, next) => set((s) => ({ byKey: { ...s.byKey, [k(brandId, kind)]: next } })),
    patchTheme: (brandId, kind, patch) => set((s) => {
      const base = s.byKey[k(brandId, kind)] ?? EMPTY_THEME;
      return { byKey: { ...s.byKey, [k(brandId, kind)]: deepMerge(base, patch) } };
    }),
    reset: (brandId, kind) => set((s) => {
      const next = { ...s.byKey };
      delete next[k(brandId, kind)];
      return { byKey: next };
    }),
  }), { name: 'deck-theme-store' }),
);
