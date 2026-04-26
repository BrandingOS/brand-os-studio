/**
 * Per-deck artwork override store.
 *
 * Each illustration slot in the deck (Cover globe, Differentiators
 * mentor, etc.) has a stable `slotId`. Users can replace the React
 * SVG with an uploaded photo or an Unsplash photo; the chosen URL is
 * stored here, keyed by `${brandSlug}:pitch-deck:${slotId}`, and
 * mirrored to localStorage so picks survive a reload.
 *
 * The store is intentionally small — replacing SVGs is a power-user
 * operation, no need for the deck-theme machinery (no auto-save into
 * the brand store, no debounce). LocalStorage round-trip is fine.
 */

import { create } from 'zustand';

export type ArtworkOverride = {
  /** Final URL the slide should render. data: URL for uploads, https for Unsplash. */
  url: string;
  /** 'upload' | 'unsplash' — kept so we can show provenance + reset. */
  source: 'upload' | 'unsplash';
  /** For Unsplash: the photographer's name (attribution). Optional. */
  authorName?: string;
  /** For Unsplash: link to the photographer's profile. Optional. */
  authorUrl?: string;
};

type Key = string;

const k = (slug: string, slotId: string): Key => `${slug}:pitch-deck:${slotId}`;
const STORAGE_KEY = (slug: string) => `brandos:pitch-deck:${slug}:artworkOverrides`;

interface ArtworkStore {
  /** Map of `slug:pitch-deck:slotId` → override. */
  byKey: Record<Key, ArtworkOverride>;
  /** Tracks which slug we've hydrated from localStorage already. */
  hydratedSlugs: Set<string>;

  hydrate: (slug: string) => void;
  get: (slug: string, slotId: string) => ArtworkOverride | undefined;
  set: (slug: string, slotId: string, value: ArtworkOverride) => void;
  clear: (slug: string, slotId: string) => void;
  clearAll: (slug: string) => void;
}

function loadFromStorage(slug: string): Record<string, ArtworkOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY(slug));
    return raw ? (JSON.parse(raw) as Record<string, ArtworkOverride>) : {};
  } catch {
    return {};
  }
}

function persist(slug: string, byKey: Record<Key, ArtworkOverride>) {
  if (typeof window === 'undefined') return;
  // Filter to keys belonging to this slug so we don't overwrite other
  // brands' decks with our slice.
  const prefix = `${slug}:pitch-deck:`;
  const slugSlice: Record<string, ArtworkOverride> = {};
  for (const [key, value] of Object.entries(byKey)) {
    if (key.startsWith(prefix)) {
      slugSlice[key.slice(prefix.length)] = value;
    }
  }
  try {
    window.localStorage.setItem(STORAGE_KEY(slug), JSON.stringify(slugSlice));
  } catch {
    /* quota — ignore */
  }
}

export const useArtworkStore = create<ArtworkStore>((set, get) => ({
  byKey: {},
  hydratedSlugs: new Set<string>(),

  hydrate: (slug) => {
    if (get().hydratedSlugs.has(slug)) return;
    const slice = loadFromStorage(slug);
    const expanded: Record<Key, ArtworkOverride> = {};
    for (const [slotId, value] of Object.entries(slice)) {
      expanded[k(slug, slotId)] = value;
    }
    set((s) => ({
      byKey: { ...s.byKey, ...expanded },
      hydratedSlugs: new Set([...s.hydratedSlugs, slug]),
    }));
  },

  get: (slug, slotId) => get().byKey[k(slug, slotId)],

  set: (slug, slotId, value) => {
    set((s) => {
      const next = { ...s.byKey, [k(slug, slotId)]: value };
      persist(slug, next);
      return { byKey: next };
    });
  },

  clear: (slug, slotId) => {
    set((s) => {
      const next = { ...s.byKey };
      delete next[k(slug, slotId)];
      persist(slug, next);
      return { byKey: next };
    });
  },

  clearAll: (slug) => {
    set((s) => {
      const next: Record<Key, ArtworkOverride> = {};
      const prefix = `${slug}:pitch-deck:`;
      for (const [key, value] of Object.entries(s.byKey)) {
        if (!key.startsWith(prefix)) next[key] = value;
      }
      persist(slug, next);
      return { byKey: next };
    });
  },
}));

/**
 * Convenience hook: subscribe to a single slot's override.
 * Returns `[override, setOverride, clearOverride]`.
 */
export function useArtworkSlot(
  slug: string,
  slotId: string,
): [ArtworkOverride | undefined, (v: ArtworkOverride) => void, () => void] {
  const override = useArtworkStore((s) => s.byKey[k(slug, slotId)]);
  const setVal = useArtworkStore((s) => s.set);
  const clearVal = useArtworkStore((s) => s.clear);
  return [
    override,
    (v: ArtworkOverride) => setVal(slug, slotId, v),
    () => clearVal(slug, slotId),
  ];
}
