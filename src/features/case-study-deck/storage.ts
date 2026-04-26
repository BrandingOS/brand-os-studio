/**
 * Local persistence for case-study DeckPlans.
 *
 * One active plan per brand — stored in localStorage under
 * `brandos:case-study-deck:v1`. The shape is a map from brand id to
 * { plan, overrides }.
 */

import type { DeckPlan, DeckStyleId, SlideOverrides, SlidePick } from './types';
import { DECK_STORAGE_KEY } from './constants';

export interface StoredDeck {
  plan: DeckPlan;
  /** Index-keyed overrides applied on top of the director's picks. */
  overrides: Record<number, SlideOverrides>;
  /** Optional per-slide variant overrides (user explicitly picked a different variant). */
  variantOverrides: Record<number, SlidePick['variant']>;
  /**
   * Per-slide style overrides. If a slide isn't listed, it inherits
   * `plan.style`. Lets a user mix styles within one deck.
   */
  slideStyles?: Record<number, DeckStyleId>;
  /**
   * Per-slide shape (composition) overrides. Shape changes the body
   * composition WITHOUT touching style/template/typography.
   */
  slideShapes?: Record<number, string>;
  /**
   * Frozen HTML snapshots from the live editor. When set, the viewer
   * renders this raw HTML for the slide instead of the React
   * composition — so user edits (text, image swaps, drag-resize)
   * persist verbatim.
   */
  slideFrozenHtml?: Record<number, string>;
  /** Indexes the user chose to hide. */
  hidden: number[];
}

type Store = Record<string, StoredDeck>;

function read(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(DECK_STORAGE_KEY);
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
    window.localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // quota exceeded or similar — fail silently, the deck just won't persist
  }
}

export function loadDeck(brandId: string): StoredDeck | null {
  const store = read();
  return store[brandId] ?? null;
}

export function saveDeck(brandId: string, deck: StoredDeck) {
  const store = read();
  store[brandId] = deck;
  write(store);
}

export function clearDeck(brandId: string) {
  const store = read();
  delete store[brandId];
  write(store);
}
