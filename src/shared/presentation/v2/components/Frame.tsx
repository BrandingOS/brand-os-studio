/**
 * Frame — the 1920×1080 slide canvas. Reads bg/ink from the deck-theme
 * tokens emitted by `<DeckThemeProvider>`. Layouts compose inside it.
 */

import type { CSSProperties, ReactNode } from 'react';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';

interface Props {
  /** 1-based index, used as `data-deck-slide` for the exporter. */
  index: number;
  /** Optional bg override — defaults to `var(--deck-bg-page)`. */
  bg?: string;
  /** Optional ink override — defaults to `var(--deck-color-h1)`. */
  ink?: string;
  /** Inner safe-area padding. Defaults to chrome-pad tokens (density-aware). */
  pad?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Frame({ index, bg, ink, pad, children, className, style }: Props) {
  return (
    <div
      data-deck-slide={index}
      data-pitch-slide={index}      // back-compat with the existing exporter selector
      className={className}
      style={{
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
        background: bg ?? 'var(--deck-bg-page, #F5F7FB)',
        color: ink ?? 'var(--deck-color-h1, #001563)',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: pad ?? 'var(--deck-chrome-pad-y, 64px) var(--deck-chrome-pad-x, 96px)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export { SLIDE_HEIGHT, SLIDE_WIDTH };
