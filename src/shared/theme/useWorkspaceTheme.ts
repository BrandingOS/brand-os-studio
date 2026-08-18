import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { writePreference } from '@/shared/preferences/preferenceBridge';

/**
 * The one place the workspace light/dark choice lives.
 *
 * BrandOS used to carry two theme systems that did not know about each other:
 * `next-themes` put a `.dark` class on <html> under its own storage key, while
 * WorkspaceShell / WorkspaceShellAlt / NotFound each kept their OWN copy of a
 * `readInitialTheme()` helper writing `brandos-theme` and painting
 * `data-theme` on their wrapper. The two could disagree, and
 * `EditorShell` papered over it by mirroring one into the other on mount —
 * and, on unmount, forcing `setTheme('light')`, which silently dragged a user
 * in dark mode back into light every time they left the legacy editor.
 *
 * Now there is one key (`brandos-theme`, passed to ThemeProvider as its
 * `storageKey`) and one writer (next-themes). This hook holds the value for
 * the `data-theme` attribute that `[data-workspace]` CSS needs, and pushes
 * every change through next-themes so the `<html>` class follows in the same
 * tab rather than at the next reload.
 *
 * `tokens.css` maps both selectors — `.dark` and `[data-theme='dark']` — onto
 * the same values (tokens.css:85-86), so the two representations are two
 * spellings of one state, not two states.
 */

export const THEME_STORAGE_KEY = 'brandos-theme';

export type WorkspaceTheme = 'light' | 'dark';

/**
 * Read synchronously so the first paint is already correct. next-themes
 * resolves its value only after mount, so relying on it alone would flash
 * light-then-dark for every dark-mode user on every route change.
 */
export function readStoredTheme(): WorkspaceTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* Storage unavailable (private mode, quota) — fall back to light. */
  }
  return 'light';
}

export function useWorkspaceTheme(): {
  theme: WorkspaceTheme;
  setTheme: (next: WorkspaceTheme) => void;
  toggleTheme: () => void;
} {
  const { setTheme: setNextTheme } = useTheme();
  const [theme, setThemeState] = useState<WorkspaceTheme>(readStoredTheme);

  // next-themes owns the write (its storageKey IS this key), so we do not
  // touch localStorage here — a second writer is how the two systems drifted
  // apart in the first place.
  useEffect(() => {
    setNextTheme(theme);
  }, [theme, setNextTheme]);

  // Another tab changed the theme. `storage` fires only in OTHER tabs, so
  // this cannot loop back into the effect above.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      if (e.newValue === 'dark' || e.newValue === 'light') setThemeState(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Persist the choice to the user's account as well as this browser, so it
  // follows them to another device. Fire-and-forget: the local value has
  // already been applied and a preference is never worth blocking the UI over.
  const setTheme = useCallback((next: WorkspaceTheme) => {
    setThemeState(next);
    writePreference({ theme: next });
  }, []);
  const toggleTheme = useCallback(
    () =>
      setThemeState((t) => {
        const next = t === 'dark' ? 'light' : 'dark';
        writePreference({ theme: next });
        return next;
      }),
    [],
  );

  return { theme, setTheme, toggleTheme };
}
