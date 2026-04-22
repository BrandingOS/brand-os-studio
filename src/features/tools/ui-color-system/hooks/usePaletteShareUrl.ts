/**
 * usePaletteShareUrl — encode/decode the full palette state as a URL
 * fragment, so any generated system can be shared as a public link
 * without server storage.
 *
 * We encode to URL-safe base64 instead of URL-params so the link stays
 * short and doesn't get interpreted by SPA frameworks as nested routes.
 * The minimal-state object trimmed below keeps typical URLs under 4KB.
 */
import { useMemo } from 'react';
import type { PaletteSystem } from '@/lib/color-engine';

export interface SharePalettePayload {
  seed: string;
  roles: Record<string, string>; // role → inputHex
  mode: PaletteSystem['settings']['generationMode'];
  locked: PaletteSystem['settings']['lockedShade'];
  theme: 'light' | 'dark';
  name: string;
}

export function encodePalette(p: SharePalettePayload): string {
  const json = JSON.stringify(p);
  if (typeof window === 'undefined') return '';
  return urlSafe(btoa(unescape(encodeURIComponent(json))));
}

export function decodePalette(encoded: string): SharePalettePayload | null {
  try {
    const json = decodeURIComponent(escape(atob(fromUrlSafe(encoded))));
    return JSON.parse(json) as SharePalettePayload;
  } catch {
    return null;
  }
}

function urlSafe(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafe(safe: string): string {
  const padded = safe + '==='.slice((safe.length + 3) % 4);
  return padded.replace(/-/g, '+').replace(/_/g, '/');
}

/**
 * Build a shareable URL for the given palette. Returns an absolute
 * URL when rendered in the browser, or an empty string in SSR.
 */
export function useShareUrl(palette: PaletteSystem, theme: 'light' | 'dark'): string {
  return useMemo(() => {
    if (typeof window === 'undefined') return '';
    const payload: SharePalettePayload = {
      seed: palette.roles.primary.inputHex,
      mode: palette.settings.generationMode,
      locked: palette.settings.lockedShade,
      theme,
      name: palette.name,
      roles: {
        primary: palette.roles.primary.inputHex,
        ...(palette.roles.secondary && { secondary: palette.roles.secondary.inputHex }),
        ...(palette.roles.tertiary && { tertiary: palette.roles.tertiary.inputHex }),
        ...(palette.roles.neutral && { neutral: palette.roles.neutral.inputHex }),
        ...(palette.roles.success && { success: palette.roles.success.inputHex }),
        ...(palette.roles.warning && { warning: palette.roles.warning.inputHex }),
        ...(palette.roles.error && { error: palette.roles.error.inputHex }),
        ...(palette.roles.info && { info: palette.roles.info.inputHex }),
      },
    };
    const hash = encodePalette(payload);
    return `${window.location.origin}/tools/ui-color-system?p=${hash}`;
  }, [palette, theme]);
}
