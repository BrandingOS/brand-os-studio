/**
 * Google Fonts loader. Injects a single <link> into <head> and
 * rewrites its href when the selected pair changes. We keep one link
 * so switching fonts doesn't leave stale stylesheets in the DOM.
 */
import type { FontPair } from '../data/font-pairs';

const LINK_ID = 'uics-gfonts-link';

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
