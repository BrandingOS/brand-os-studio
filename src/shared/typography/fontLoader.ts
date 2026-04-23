// src/shared/typography/fontLoader.ts
import type { FontRef } from '@/shared/types/typescale';
import { googleFontsCssUrl } from './fontCatalog';

const loaded = new Set<string>();
const LINK_ATTR = 'data-typescale-font';
const STYLE_ATTR = 'data-typescale-fontface';

function keyFor(ref: FontRef): string {
  return `${ref.source}:${ref.family}:${ref.weights.join(',')}:${ref.italic ? 'i' : ''}`;
}

function injectGoogle(ref: FontRef) {
  if (typeof document === 'undefined') return;
  const href = googleFontsCssUrl(ref);
  if (document.querySelector(`link[${LINK_ATTR}="${ref.family}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute(LINK_ATTR, ref.family);
  document.head.appendChild(link);
}

function injectUpload(ref: FontRef) {
  if (typeof document === 'undefined') return;
  if (!ref.files?.length) return;
  if (document.querySelector(`style[${STYLE_ATTR}="${ref.family}"]`)) return;
  const css = ref.files
    .map(
      f => `@font-face{font-family:"${ref.family}";src:url("${f.url}") format("${f.format}");font-weight:${f.weight};font-style:${f.italic ? 'italic' : 'normal'};font-display:swap;}`,
    )
    .join('\n');
  const style = document.createElement('style');
  style.setAttribute(STYLE_ATTR, ref.family);
  style.textContent = css;
  document.head.appendChild(style);
}

/** Idempotent: safe to call every render. */
export function ensureLoaded(ref: FontRef): void {
  const key = keyFor(ref);
  if (loaded.has(key)) return;
  if (ref.source === 'google') injectGoogle(ref);
  else if (ref.source === 'upload') injectUpload(ref);
  // 'system' needs no injection
  loaded.add(key);
}

export function ensurePairLoaded(pair: { heading: FontRef; body: FontRef; mono?: FontRef }) {
  ensureLoaded(pair.heading);
  ensureLoaded(pair.body);
  if (pair.mono) ensureLoaded(pair.mono);
}

/** For tests. */
export function __resetFontLoader() {
  loaded.clear();
  if (typeof document === 'undefined') return;
  document.querySelectorAll(`link[${LINK_ATTR}]`).forEach(n => n.remove());
  document.querySelectorAll(`style[${STYLE_ATTR}]`).forEach(n => n.remove());
}
