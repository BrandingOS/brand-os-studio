// src/shared/presentation/theme/detectRole.ts
//
// Given a clicked HTMLElement, infer which deck typography role it
// belongs to (display | h1 | h2 | h3 | h4 | body | caption | label).
// Used by the pitch-deck shell when the user selects an element with
// the Theme tab active — the inferred role is pushed into the deck-
// theme store so TypographySection auto-expands the matching row.
//
// Resolution order:
//   1. Explicit `.deck-{role}` class on the element or any ancestor.
//   2. Native heading tag (<h1>..<h4>).
//   3. Computed font-size heuristic.

import type { DeckTypeRole } from './types';

const CLASS_TO_ROLE: Record<string, DeckTypeRole> = {
  'deck-display': 'display',
  'deck-h1': 'h1',
  'deck-h2': 'h2',
  'deck-h3': 'h3',
  'deck-h4': 'h4',
  'deck-body': 'body',
  'deck-caption': 'caption',
  'deck-label': 'label',
};

export function detectRoleFromElement(el: HTMLElement): DeckTypeRole | null {
  // 1. Walk up to find a .deck-* class.
  let cur: HTMLElement | null = el;
  while (cur) {
    const cls = cur.className;
    if (typeof cls === 'string') {
      for (const [klass, role] of Object.entries(CLASS_TO_ROLE)) {
        if (cls.split(/\s+/).includes(klass)) return role;
      }
    }
    cur = cur.parentElement;
    if (cur && cur.dataset.deck) break; // don't escape the deck wrapper
  }

  // 2. Native heading tag.
  const tag = el.tagName.toLowerCase();
  if (tag === 'h1') return 'h1';
  if (tag === 'h2') return 'h2';
  if (tag === 'h3') return 'h3';
  if (tag === 'h4') return 'h4';

  // 3. Font-size heuristic.
  if (typeof window === 'undefined') return null;
  const size = parseFloat(window.getComputedStyle(el).fontSize);
  if (Number.isFinite(size)) {
    if (size >= 80) return 'display';
    if (size >= 48) return 'h1';
    if (size >= 36) return 'h2';
    if (size >= 24) return 'h3';
    if (size >= 20) return 'h4';
    if (size >= 16) return 'body';
    if (size >= 13) return 'caption';
  }
  return 'label';
}
