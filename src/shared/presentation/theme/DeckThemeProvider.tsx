// src/shared/presentation/theme/DeckThemeProvider.tsx

import type { ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import { buildDeckCssVars } from './buildDeckTokens';
import type { DeckKind, PresentationTheme } from './types';
import './deck.css';

interface Props {
  brand: Brand;
  theme: PresentationTheme;
  deckKind: DeckKind;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a deck in a div that emits --deck-* CSS variables from
 * (brand + theme). Children consume the variables via .deck-* classes
 * defined in deck.css.
 */
export function DeckThemeProvider({ brand, theme, deckKind, children, className }: Props) {
  const style = buildDeckCssVars(brand, theme);
  return (
    <div
      data-deck={deckKind}
      data-logo-pos={theme.style.logoPlacement}
      data-bg-kind={theme.style.bgKind}
      className={className}
      style={{ ...style, contain: 'style' }}
    >
      {children}
    </div>
  );
}
