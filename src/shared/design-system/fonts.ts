/**
 * Dynamic Google Fonts Loader
 *
 * Single source of truth for loading brand fonts at runtime so any surface
 * (dashboard, brand editor, slide canvas, exports) renders the same family.
 *
 * Usage: call `loadBrandFonts(brand)` whenever the active brand changes.
 * The loader caches loaded families so calling it many times is cheap.
 *
 * The loader:
 *   1. Reads `brand.fonts.primary` and `brand.fonts.secondary`
 *   2. Skips system fonts (Arial, Helvetica, system-ui, etc.)
 *   3. Injects a `<link rel="stylesheet">` to fonts.googleapis.com if not loaded
 *   4. Records the family in a Set so repeat calls no-op
 *
 * For non-Google fonts (custom @font-face), this loader is a no-op — the
 * caller is expected to register the @font-face elsewhere. Brand fonts in
 * BrandOS today are all Google Fonts, so this covers 100% of cases.
 */

import type { Brand } from '@/shared/types/brand';

const loadedFamilies = new Set<string>();

const SYSTEM_FONTS = new Set([
  'arial', 'helvetica', 'helvetica neue', 'times', 'times new roman',
  'georgia', 'courier', 'courier new', 'monaco', 'menlo', 'consolas',
  'system-ui', '-apple-system', 'sans-serif', 'serif', 'monospace',
  'inherit', 'initial', 'unset',
]);

function isSystemFont(family: string): boolean {
  return SYSTEM_FONTS.has(family.trim().toLowerCase().replace(/['"]/g, ''));
}

function familyToGoogleParam(family: string): string {
  // "Plus Jakarta Sans" → "Plus+Jakarta+Sans"
  return family.trim().replace(/['"]/g, '').replace(/\s+/g, '+');
}

/** Load a single font family from Google Fonts. Idempotent. */
export function loadFontFamily(family: string, weights: number[] = [400, 500, 600, 700]): void {
  if (typeof document === 'undefined') return;
  if (!family || isSystemFont(family)) return;

  const key = family.trim().toLowerCase();
  if (loadedFamilies.has(key)) return;
  loadedFamilies.add(key);

  const param = familyToGoogleParam(family);
  const weightsParam = weights.join(';');
  const href = `https://fonts.googleapis.com/css2?family=${param}:wght@${weightsParam}&display=swap`;

  // Avoid duplicate link tags from prior boots
  if (document.querySelector(`link[href="${href}"]`)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.brandFont = key;
  document.head.appendChild(link);
}

/** Load all fonts referenced by a brand. Safe to call repeatedly. */
export function loadBrandFonts(brand: Pick<Brand, 'fonts'> | undefined | null): void {
  if (!brand?.fonts) return;
  if (brand.fonts.primary) loadFontFamily(brand.fonts.primary);
  if (brand.fonts.secondary) loadFontFamily(brand.fonts.secondary);
}

/** For tests / debugging — clears the in-memory cache. Does NOT remove DOM links. */
export function _resetFontCache(): void {
  loadedFamilies.clear();
}
