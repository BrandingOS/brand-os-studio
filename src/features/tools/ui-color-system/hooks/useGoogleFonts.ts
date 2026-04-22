/**
 * Google Fonts loader. Injects a single <link> into <head> and
 * rewrites its href when the selected pair changes. We keep one link
 * so switching fonts doesn't leave stale stylesheets in the DOM.
 */
import type { FontPair } from '../data/font-pairs';
import type { GoogleFontEntry } from '../data/google-fonts-catalog';

const LINK_ID = 'uics-gfonts-link';
const SEARCH_LINK_ID = 'uics-gfonts-search-link';

export function loadGoogleFontPair(pair: FontPair): void {
  if (typeof document === 'undefined') return;
  if (!pair.gfonts.length) {
    // System-only pair — remove any existing loader so we don't keep
    // a stale font hanging around.
    const existing = document.getElementById(LINK_ID);
    if (existing) existing.remove();
    return;
  }
  const families = pair.gfonts.map((g) => `family=${g}`).join('&');
  const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

/**
 * Load a Google Font chosen from the catalogue (used by the search
 * UI). Uses a different <link> so it doesn't clobber the preset pair
 * loader — removing the preset loader would revert the font.
 */
export function loadSingleGoogleFont(entry: GoogleFontEntry): void {
  if (typeof document === 'undefined') return;
  const family = entry.name.replace(/\s+/g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${family}:${entry.weights}&display=swap`;
  let link = document.getElementById(SEARCH_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = SEARCH_LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}
