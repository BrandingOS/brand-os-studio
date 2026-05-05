// Phase 11.1 — Feature-tour "seen" tracking.
//
// Pure localStorage flag keyed by feature id. Used to gate first-
// visit-only UI nudges (welcome tip, "what's new" pip, etc.) so a
// returning user doesn't see them again. Per-feature granularity so
// adding a new tour step in a future commit doesn't reset earlier
// dismissals.
//
// Storage shape: a single JSON object at key 'brandos:features-seen'
// = { '<id>': '<isoDate>' }. This makes it easy to inspect/clear
// in devtools and survives across page reloads + sessions.
//
// SSR-safe — guards every window/localStorage access.

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'brandos:features-seen';

type SeenMap = Record<string, string>;

function readMap(): SeenMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(next: SeenMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode — silently ignore */
  }
}

export interface UseFeatureSeenResult {
  /** True when this feature has been marked seen. Undefined while the
   *  hook is hydrating its initial value (matters for SSR-safety;
   *  client-side it resolves synchronously on first render). */
  isSeen: boolean;
  /** Mark seen now. Idempotent. */
  markSeen: () => void;
  /** Clear the seen flag. Useful for QA / settings → "show tour again". */
  clearSeen: () => void;
}

export function useFeatureSeen(featureId: string): UseFeatureSeenResult {
  const [isSeen, setIsSeen] = useState<boolean>(() => Boolean(readMap()[featureId]));

  // Re-sync on featureId change (callers may consume different ids).
  useEffect(() => {
    setIsSeen(Boolean(readMap()[featureId]));
  }, [featureId]);

  const markSeen = useCallback(() => {
    const next = { ...readMap(), [featureId]: new Date().toISOString() };
    writeMap(next);
    setIsSeen(true);
  }, [featureId]);

  const clearSeen = useCallback(() => {
    const next = { ...readMap() };
    delete next[featureId];
    writeMap(next);
    setIsSeen(false);
  }, [featureId]);

  return { isSeen, markSeen, clearSeen };
}

/** Test/devtools helper — wipes the entire seen map. Not exported by
 *  default to avoid accidental use; pull via the package internals
 *  if you need it. */
export function _resetAllFeatureSeen(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
