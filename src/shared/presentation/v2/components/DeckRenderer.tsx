/**
 * DeckRenderer — renders an entire `Deck`. Wraps slides in
 * `<DeckThemeProvider>` so every layout reads `--deck-*` vars from
 * the deck's theme, then maps each slide through `SlideRenderer`.
 *
 * Layout-agnostic: hands sequencing + theme to subsystems and lets
 * the caller decide how to mount slides (a vertical scroll snap, a
 * carousel, an editor stage, etc.) by injecting `wrapper` /
 * `slideWrapper`.
 */

import type { ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import { DeckThemeProvider } from '@/shared/presentation/theme/DeckThemeProvider';
import type { Deck, DeckMode } from '../types';
import { SlideRenderer } from './SlideRenderer';

interface Props {
  deck: Deck;
  brand: Brand;
  mode?: DeckMode;
  /** Wrap the entire deck (e.g. apply a stage container). */
  wrapper?: (children: ReactNode) => ReactNode;
  /** Wrap each slide (e.g. attach scroll-snap, ref, click handler). */
  slideWrapper?: (slide: ReactNode, index: number) => ReactNode;
}

export function DeckRenderer({
  deck,
  brand,
  mode = 'present',
  wrapper,
  slideWrapper,
}: Props) {
  const total = deck.slides.length;
  const rtl = brand.guidelines?.language?.direction === 'rtl';
  const wordmark = brand.name?.toLowerCase();

  const slides = deck.slides.map((slide, i) => {
    if (slide.hidden && mode !== 'edit') return null;
    const node = (
      <SlideRenderer
        key={slide.id}
        slide={slide}
        index={i + 1}
        total={total}
        mode={mode}
        brandWordmark={wordmark}
        rtl={rtl}
      />
    );
    return slideWrapper ? slideWrapper(node, i) : node;
  });

  const inner = (
    <DeckThemeProvider brand={brand} theme={deck.theme} deckKind="pitch-deck">
      {slides}
    </DeckThemeProvider>
  );

  return <>{wrapper ? wrapper(inner) : inner}</>;
}
