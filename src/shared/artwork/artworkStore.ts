/**
 * Generic artwork override store.
 *
 * Originally lived under `src/features/pitch-deck/artwork/` and was
 * coupled to the pitch-deck (slug + literal "pitch-deck" prefix). It
 * has been lifted to `src/shared/artwork/` so any deck/editor (case
 * studies, logo presentations, the v2 deck system) can reuse it.
 *
 * Each replaceable artwork slot has a stable `slotId`. Users can
 * replace the React SVG with an uploaded photo, an Unsplash photo, or
 * a 3D illustration; the chosen URL is stored here, keyed by
 * `${scopeId}:${slotId}`, and mirrored to localStorage so picks
 * survive a reload.
 *
 * The `scopeId` is caller-controlled. For pitch-deck callers it stays
 * `${brandSlug}:pitch-deck` (back-compat). A v2 deck might use
 * `${brandId}:deck:${deckId}`. The store does not interpret it.
 *
 * On hydrate of a `${brandSlug}:pitch-deck` scope, we one-shot migrate
 * any existing `brandos:pitch-deck:${slug}:artworkOverrides`
 * localStorage entry into the new key. The legacy key is left in
 * place for safety.
 */

import { create } from 'zustand';

export type ArtworkOverride = {
  /** Final URL the slide should render. data: URL for uploads, https for Unsplash / Iconify. */
  url: string;
  /** Source of the artwork — kept so we can show provenance + reset. */
  source: 'upload' | 'unsplash' | 'illustration';
  /** Photographer or illustration set name (attribution). Optional. */
  authorName?: string;
  /** Link to source / profile. Optional. */
  authorUrl?: string;
};

type Key = string;

const k = (scopeId: string, slotId: string): Key => `${scopeId}:${slotId}`;
const STORAGE_KEY = (scopeId: string) => `brandos:artwork:${scopeId}`;

/**
 * Legacy localStorage key used by the old pitch-deck-coupled store.
 * Returns the key only for scopeIds matching the old shape so we don't
 * accidentally migrate non-pitch-deck scopes.
 */
function legacyStorageKey(scopeId: string): string | null {
  // Old scheme: scopeId looks like `${slug}:pitch-deck`.
  const m = /^([^:]+):pitch-deck$/.exec(scopeId);
  if (!m) return null;
  const slug = m[1];
  return `brandos:pitch-deck:${slug}:artworkOverrides`;
}

interface ArtworkStore {
  /** Map of `${scopeId}:${slotId}` → override. */
  byKey: Record<Key, ArtworkOverride>;
  /** Tracks which scopes we've hydrated from localStorage already. */
  hydratedScopes: Set<string>;

  hydrate: (scopeId: string) => void;
  get: (scopeId: string, slotId: string) => ArtworkOverride | undefined;
  set: (scopeId: string, slotId: string, value: ArtworkOverride) => void;
  clear: (scopeId: string, slotId: string) => void;
  clearAll: (scopeId: string) => void;
}

function loadFromStorage(scopeId: string): Record<string, ArtworkOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY(scopeId));
    if (raw) return JSON.parse(raw) as Record<string, ArtworkOverride>;
    // Nothing under the new key — see if the legacy key has data we
    // can migrate (one-shot per scope; legacy entry left intact).
    const legacyKey = legacyStorageKey(scopeId);
    if (!legacyKey) return {};
    const legacy = window.localStorage.getItem(legacyKey);
    if (!legacy) return {};
    const parsed = JSON.parse(legacy) as Record<string, ArtworkOverride>;
    // Persist into the new key so future loads skip the legacy lookup.
    try {
      window.localStorage.setItem(STORAGE_KEY(scopeId), JSON.stringify(parsed));
    } catch {
      /* quota — ignore */
    }
    return parsed;
  } catch {
    return {};
  }
}

function persist(scopeId: string, byKey: Record<Key, ArtworkOverride>) {
  if (typeof window === 'undefined') return;
  // Filter to keys belonging to this scope so we don't overwrite other
  // scopes' overrides with our slice.
  const prefix = `${scopeId}:`;
  const scopeSlice: Record<string, ArtworkOverride> = {};
  for (const [key, value] of Object.entries(byKey)) {
    if (key.startsWith(prefix)) {
      scopeSlice[key.slice(prefix.length)] = value;
    }
  }
  try {
    window.localStorage.setItem(STORAGE_KEY(scopeId), JSON.stringify(scopeSlice));
  } catch {
    /* quota — ignore */
  }
}

export const useArtworkStore = create<ArtworkStore>((set, get) => ({
  byKey: {},
  hydratedScopes: new Set<string>(),

  hydrate: (scopeId) => {
    if (get().hydratedScopes.has(scopeId)) return;
    const slice = loadFromStorage(scopeId);
    const expanded: Record<Key, ArtworkOverride> = {};
    for (const [slotId, value] of Object.entries(slice)) {
      expanded[k(scopeId, slotId)] = value;
    }
    set((s) => ({
      byKey: { ...s.byKey, ...expanded },
      hydratedScopes: new Set([...s.hydratedScopes, scopeId]),
    }));
  },

  get: (scopeId, slotId) => get().byKey[k(scopeId, slotId)],

  set: (scopeId, slotId, value) => {
    set((s) => {
      const next = { ...s.byKey, [k(scopeId, slotId)]: value };
      persist(scopeId, next);
      return { byKey: next };
    });
  },

  clear: (scopeId, slotId) => {
    set((s) => {
      const next = { ...s.byKey };
      delete next[k(scopeId, slotId)];
      persist(scopeId, next);
      return { byKey: next };
    });
  },

  clearAll: (scopeId) => {
    set((s) => {
      const next: Record<Key, ArtworkOverride> = {};
      const prefix = `${scopeId}:`;
      for (const [key, value] of Object.entries(s.byKey)) {
        if (!key.startsWith(prefix)) next[key] = value;
      }
      persist(scopeId, next);
      return { byKey: next };
    });
  },
}));

/**
 * Convenience hook: subscribe to a single slot's override.
 * Returns `[override, setOverride, clearOverride]`.
 */
export function useArtworkSlot(
  scopeId: string,
  slotId: string,
): [ArtworkOverride | undefined, (v: ArtworkOverride) => void, () => void] {
  const override = useArtworkStore((s) => s.byKey[k(scopeId, slotId)]);
  const setVal = useArtworkStore((s) => s.set);
  const clearVal = useArtworkStore((s) => s.clear);
  return [
    override,
    (v: ArtworkOverride) => setVal(scopeId, slotId, v),
    () => clearVal(scopeId, slotId),
  ];
}
