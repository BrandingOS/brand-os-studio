// src/shared/presentation/theme/useDeckTheme.ts

import { useEffect } from 'react';
import { useBrandStore } from '@/shared/store/brandStore';
import { useAutoSave } from '@/features/editor/core';
import type { EditorSaveState } from '@/features/editor/core';
import type { Brand } from '@/shared/types/brand';
import type { DeckKind, PresentationTheme } from './types';
import { useDeckThemeStore } from './store';
import { EMPTY_THEME } from './types';

interface Result {
  theme: PresentationTheme;
  saveState: EditorSaveState;
  patch: (patch: Partial<PresentationTheme>) => void;
  reset: () => void;
}

/**
 * Subscribe to a deck's theme draft + wire auto-save.
 *   const { theme, saveState, patch, reset } = useDeckTheme(brand, 'pitch-deck');
 *   <DeckThemeProvider brand={brand} theme={theme} ...>
 *
 * The selector returns the same `EMPTY_THEME` reference until something
 * mutates the store entry — so React doesn't re-render every frame, and
 * `useAutoSave` only fires its debounced save when the theme actually
 * changes.
 */
export function useDeckTheme(brand: Brand, deckKind: DeckKind): Result {
  const theme = useDeckThemeStore((s) => s.byKey[`${brand.id}:${deckKind}`] ?? EMPTY_THEME);
  const hydrate = useDeckThemeStore((s) => s.hydrate);
  const setTheme = useDeckThemeStore((s) => s.setTheme);
  const patchTheme = useDeckThemeStore((s) => s.patchTheme);
  const resetStore = useDeckThemeStore((s) => s.reset);
  const updateBrand = useBrandStore((s) => s.update);

  // Hydrate from brand on mount + when brand swaps.
  useEffect(() => {
    hydrate(brand.id, deckKind, brand.presentationThemes?.[deckKind]);
  }, [brand.id, deckKind, brand.presentationThemes, hydrate]);

  const { saveState, markDirty } = useAutoSave<PresentationTheme>({
    value: theme,
    debounceMs: 600,
    save: async (next) => {
      const existing = useBrandStore.getState().current?.presentationThemes ?? {};
      await updateBrand(brand.id, { presentationThemes: { ...existing, [deckKind]: next } });
    },
  });

  return {
    theme,
    saveState,
    patch: (p) => { patchTheme(brand.id, deckKind, p); markDirty(); },
    reset: () => {
      resetStore(brand.id, deckKind);
      // Setting an explicit empty draft makes the auto-save fire.
      setTheme(brand.id, deckKind, EMPTY_THEME);
      markDirty();
    },
  };
}
