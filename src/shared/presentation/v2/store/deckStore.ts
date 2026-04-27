/**
 * Deck OS v2 — single source of truth for in-memory deck state.
 *
 * Every edit (text, image, layout swap, slide add/delete/reorder)
 * writes a new Slide / Deck object into this store. The shell
 * subscribes via `useDeck(brandId, deckId)` and re-renders. A debounced
 * auto-save flushes the deck back into `brand.decks[]` via the
 * existing `brandStore.update`. No DOM cloning, no frozenHtml — slides
 * are data, so editing IS just data update.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useEffect, useMemo, useCallback } from 'react';
import { useBrandStore } from '@/shared/store/brandStore';
import { useAutoSave } from '@/features/editor/core';
import type { EditorSaveState } from '@/features/editor/core';
import type { Brand } from '@/shared/types/brand';
import type { Block, Deck, LayoutId, Slide, SlotId } from '../types';

type DeckMap = Record<string, Deck>;

interface DeckStoreState {
  /** Decks keyed by deck.id. */
  byId: DeckMap;
  /** Slugs whose brand-side decks have been pulled into the store. */
  hydratedFor: Set<string>;

  /** Replace the whole deck (used on hydrate + reset). */
  setDeck: (deck: Deck) => void;
  /** Apply a partial patch to a deck and bump its updatedAt. */
  patchDeck: (deckId: string, patch: Partial<Deck>) => void;
  /** Mutate a single block on a slide. Creates the slide.blocks entry if missing. */
  setBlock: (deckId: string, slideId: string, slotId: SlotId, block: Block) => void;
  /** Replace a whole slide. */
  setSlide: (deckId: string, slideId: string, slide: Slide) => void;
  /** Insert a new slide at position `index`. */
  insertSlide: (deckId: string, index: number, slide: Slide) => void;
  /** Remove a slide. */
  removeSlide: (deckId: string, slideId: string) => void;
  /** Reorder a slide from `from` to `to`. */
  reorderSlide: (deckId: string, from: number, to: number) => void;
  /** Drop the deck from memory (e.g. on brand switch). */
  forget: (deckId: string) => void;
  /** Mark a brand's decks as hydrated so we don't re-pull. */
  markHydrated: (brandId: string) => void;
}

export const useDeckStore = create<DeckStoreState>()(
  devtools(
    (set, get) => ({
      byId: {},
      hydratedFor: new Set<string>(),

      setDeck: (deck) =>
        set((s) => ({ byId: { ...s.byId, [deck.id]: deck } })),

      patchDeck: (deckId, patch) =>
        set((s) => {
          const cur = s.byId[deckId];
          if (!cur) return s;
          return {
            byId: {
              ...s.byId,
              [deckId]: { ...cur, ...patch, updatedAt: new Date(), version: cur.version + 1 },
            },
          };
        }),

      setBlock: (deckId, slideId, slotId, block) =>
        set((s) => {
          const cur = s.byId[deckId];
          if (!cur) return s;
          return {
            byId: {
              ...s.byId,
              [deckId]: {
                ...cur,
                slides: cur.slides.map((sl) =>
                  sl.id === slideId
                    ? { ...sl, blocks: { ...sl.blocks, [slotId]: block } }
                    : sl,
                ),
                updatedAt: new Date(),
                version: cur.version + 1,
              },
            },
          };
        }),

      setSlide: (deckId, slideId, slide) =>
        set((s) => {
          const cur = s.byId[deckId];
          if (!cur) return s;
          return {
            byId: {
              ...s.byId,
              [deckId]: {
                ...cur,
                slides: cur.slides.map((sl) => (sl.id === slideId ? slide : sl)),
                updatedAt: new Date(),
                version: cur.version + 1,
              },
            },
          };
        }),

      insertSlide: (deckId, index, slide) =>
        set((s) => {
          const cur = s.byId[deckId];
          if (!cur) return s;
          const slides = [...cur.slides];
          slides.splice(Math.max(0, Math.min(index, slides.length)), 0, slide);
          return {
            byId: {
              ...s.byId,
              [deckId]: { ...cur, slides, updatedAt: new Date(), version: cur.version + 1 },
            },
          };
        }),

      removeSlide: (deckId, slideId) =>
        set((s) => {
          const cur = s.byId[deckId];
          if (!cur) return s;
          return {
            byId: {
              ...s.byId,
              [deckId]: {
                ...cur,
                slides: cur.slides.filter((sl) => sl.id !== slideId),
                updatedAt: new Date(),
                version: cur.version + 1,
              },
            },
          };
        }),

      reorderSlide: (deckId, from, to) =>
        set((s) => {
          const cur = s.byId[deckId];
          if (!cur) return s;
          if (from === to) return s;
          const slides = [...cur.slides];
          const [moved] = slides.splice(from, 1);
          if (!moved) return s;
          slides.splice(to, 0, moved);
          return {
            byId: {
              ...s.byId,
              [deckId]: { ...cur, slides, updatedAt: new Date(), version: cur.version + 1 },
            },
          };
        }),

      forget: (deckId) =>
        set((s) => {
          const next = { ...s.byId };
          delete next[deckId];
          return { byId: next };
        }),

      markHydrated: (brandId) =>
        set((s) => ({ hydratedFor: new Set([...s.hydratedFor, brandId]) })),
    }),
    { name: 'deck-os-v2' },
  ),
);

/* ─── React hook ──────────────────────────────────────────────────── */

export interface UseDeckResult {
  deck: Deck;
  saveState: EditorSaveState;
  /** Update a single block on a slide. */
  setBlock: (slideId: string, slotId: SlotId, block: Block) => void;
  /** Insert a slide at position. */
  insertSlide: (index: number, slide: Slide) => void;
  /** Remove a slide. */
  removeSlide: (slideId: string) => void;
  /** Move a slide. */
  reorderSlide: (from: number, to: number) => void;
  /** Force-flush pending save. */
  flush: () => Promise<void>;
}

/**
 * Subscribe to a deck + auto-save it back to the brand. Caller is
 * responsible for ensuring the deck exists in the store first
 * (see `ensureDeck` below).
 */
export function useDeck(brand: Brand, deckId: string): UseDeckResult | null {
  const deck = useDeckStore((s) => s.byId[deckId]);
  const setBlockAction = useDeckStore((s) => s.setBlock);
  const insertAction = useDeckStore((s) => s.insertSlide);
  const removeAction = useDeckStore((s) => s.removeSlide);
  const reorderAction = useDeckStore((s) => s.reorderSlide);
  const updateBrand = useBrandStore((s) => s.update);

  const { saveState, markDirty, flush } = useAutoSave<Deck | undefined>({
    value: deck,
    debounceMs: 800,
    enabled: Boolean(deck),
    save: async (next) => {
      if (!next) return;
      // Find existing decks list, replace this deck in it (or
      // append). brandStore.update merges presentationThemes / decks
      // into the brand record via brandsService.
      const cur = useBrandStore.getState().current?.decks ?? [];
      const exists = cur.some((d) => d.id === next.id);
      const decks = exists
        ? cur.map((d) => (d.id === next.id ? next : d))
        : [...cur, next];
      await updateBrand(brand.id, { decks });
    },
  });

  const setBlock = useCallback(
    (slideId: string, slotId: SlotId, block: Block) => {
      setBlockAction(deckId, slideId, slotId, block);
      markDirty();
    },
    [deckId, setBlockAction, markDirty],
  );

  const insertSlide = useCallback(
    (index: number, slide: Slide) => {
      insertAction(deckId, index, slide);
      markDirty();
    },
    [deckId, insertAction, markDirty],
  );

  const removeSlide = useCallback(
    (slideId: string) => {
      removeAction(deckId, slideId);
      markDirty();
    },
    [deckId, removeAction, markDirty],
  );

  const reorderSlide = useCallback(
    (from: number, to: number) => {
      reorderAction(deckId, from, to);
      markDirty();
    },
    [deckId, reorderAction, markDirty],
  );

  if (!deck) return null;
  return { deck, saveState, setBlock, insertSlide, removeSlide, reorderSlide, flush };
}

/* ─── Hydration helper ────────────────────────────────────────────── */

/**
 * On mount of a deck route, ensure the deck exists in the store.
 *   1. If the brand has a saved deck with this id, hydrate it.
 *   2. Else, build a fresh deck from `factory()` and persist on first save.
 *
 * Returns the resolved deck id (caller passes to `useDeck`).
 */
export function useEnsureDeck(brand: Brand | undefined, deckId: string, factory: () => Deck): string | null {
  const setDeck = useDeckStore((s) => s.setDeck);
  const existing = useDeckStore((s) => s.byId[deckId]);
  const fingerprint = brand ? `${brand.id}:${(brand.decks ?? []).map((d) => d.id).join(',')}` : '';

  useEffect(() => {
    if (!brand) return;
    if (existing) return;
    const saved = brand.decks?.find((d) => d.id === deckId);
    if (saved) {
      // Coerce date strings (from JSON) back to Date objects.
      setDeck({
        ...saved,
        createdAt: new Date(saved.createdAt),
        updatedAt: new Date(saved.updatedAt),
      });
    } else {
      setDeck(factory());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand?.id, deckId, fingerprint, existing]);

  // Memoize the resolved id so the caller's `useDeck` doesn't churn.
  return useMemo(() => (brand ? deckId : null), [brand, deckId]);
}
