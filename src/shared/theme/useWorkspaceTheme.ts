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
  const { theme: nextTheme, setTheme: setNextTheme } = useTheme();

  /*
   * next-themes resolves its value only AFTER mount, so the first render would
   * otherwise be `undefined` and a dark-mode user would see a light flash on
   * every route change. `readStoredTheme` answers synchronously for that one
   * paint and is never consulted again.
   */
  const [firstPaint] = useState(readStoredTheme);

  /*
   * DERIVED, never copied.
   *
   * This used to be `useState(readStoredTheme)` with an effect pushing the
   * local value back into next-themes. That gave every consumer its OWN theme,
   * and `setThemeState` only ever updated the one that was clicked — so a
   * second mounted surface (WorkspaceShellAlt, Settings → Preferences,
   * NotFound) kept its stale value and went on asserting it. Two components
   * holding two opinions about one global, each re-asserting on render, is the
   * shape that produces a flicker rather than a theme.
   *
   * There is one owner now: next-themes. Everything else reads it.
   */
  const theme: WorkspaceTheme =
    nextTheme === 'dark' || nextTheme === 'light' ? nextTheme : firstPaint;

  /*
   * Another tab changed the theme. Push it into the OWNER rather than into a
   * local copy, so every surface in this tab follows the same value. `storage`
   * fires only in other tabs, so this cannot loop back on the writer.
   */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      if (e.newValue === 'dark' || e.newValue === 'light') setNextTheme(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [setNextTheme]);

  // Persist the choice to the user's account as well as this browser, so it
  // follows them to another device. Fire-and-forget: the local value has
  // already been applied and a preference is never worth blocking the UI over.
  const setTheme = useCallback(
    (next: WorkspaceTheme) => {
      setNextTheme(next);
      writePreference({ theme: next });
    },
    [setNextTheme],
  );

  const toggleTheme = useCallback(
    () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    [theme, setTheme],
  );

  return { theme, setTheme, toggleTheme };
}
