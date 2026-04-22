/**
 * useSavedPalettes — local persistence for "My palettes".
 *
 * Anonymous users get localStorage-backed saves so a refresh doesn't
 * lose work. Once auth is wired, the save/load should switch to the
 * Supabase palettes table; the hook's API stays stable.
 */
import { useCallback, useEffect, useState } from 'react';

import type { PaletteSystem } from '@/lib/color-engine';

const STORAGE_KEY = 'brandos:ui-color-system:saved';

export interface SavedPaletteSummary {
  id: string;
  name: string;
  seed: string;
  primary: string;
  updatedAt: string;
}

interface SavedEntry {
  summary: SavedPaletteSummary;
  palette: PaletteSystem;
}

function readAll(): SavedEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: SavedEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded — silently drop oldest half and retry once.
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(entries.slice(-Math.floor(entries.length / 2))),
      );
    } catch {
      /* give up */
    }
  }
}

export function useSavedPalettes() {
  const [entries, setEntries] = useState<SavedEntry[]>(() => readAll());

  useEffect(() => {
    // Listen for cross-tab updates.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEntries(readAll());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const save = useCallback((palette: PaletteSystem, name?: string) => {
    const now = new Date().toISOString();
    const effectiveName = name ?? palette.name ?? 'Untitled palette';
    const summary: SavedPaletteSummary = {
      id: palette.id,
      name: effectiveName,
      seed: palette.seedColor,
      primary: palette.roles.primary.inputHex,
      updatedAt: now,
    };
    setEntries((prev) => {
      const next = [
        { summary, palette: { ...palette, name: effectiveName, updatedAt: now } },
        ...prev.filter((e) => e.summary.id !== palette.id),
      ];
      writeAll(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.summary.id !== id);
      writeAll(next);
      return next;
    });
  }, []);

  const load = useCallback(
    (id: string): PaletteSystem | null => {
      return entries.find((e) => e.summary.id === id)?.palette ?? null;
    },
    [entries],
  );

  return {
    palettes: entries.map((e) => e.summary),
    save,
    remove,
    load,
  };
}
