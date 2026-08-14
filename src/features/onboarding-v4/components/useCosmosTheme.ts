import { useEffect, useState } from 'react';

export type CosmosTheme = 'light' | 'dark';

const STORAGE_KEY = 'brandos-onboarding-v4-theme';

function readInitial(): CosmosTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* ignore */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Module-level shared state: every useCosmosTheme() instance reads the same
// value and re-renders on toggle. Without this each caller held its own
// useState copy, so the shell could flip to dark while the colors board's
// picker stayed pinned to light.
let current: CosmosTheme | null = null;
const listeners = new Set<(t: CosmosTheme) => void>();

function getCurrent(): CosmosTheme {
  if (current === null) current = readInitial();
  return current;
}

function setGlobalTheme(next: CosmosTheme) {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(next));
}

export function useCosmosTheme(): [CosmosTheme, () => void] {
  const [theme, setTheme] = useState<CosmosTheme>(getCurrent);
  useEffect(() => {
    listeners.add(setTheme);
    // Catch a toggle that happened between this instance's render and mount.
    setTheme(getCurrent());
    return () => {
      listeners.delete(setTheme);
    };
  }, []);
  const toggle = () => setGlobalTheme(getCurrent() === 'dark' ? 'light' : 'dark');
  return [theme, toggle];
}
