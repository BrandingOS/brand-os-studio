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

export function useCosmosTheme(): [CosmosTheme, () => void] {
  const [theme, setTheme] = useState<CosmosTheme>(readInitial);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return [theme, toggle];
}
