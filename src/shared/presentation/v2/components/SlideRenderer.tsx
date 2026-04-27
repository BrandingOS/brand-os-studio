/**
 * SlideRenderer — turns a `Slide` data object into a rendered React
 * tree. Picks a layout from `LAYOUT_REGISTRY` and hands it the slide's
 * blocks. No layout logic lives here; this is a pure dispatcher.
 *
 * If the slide's layout id isn't registered (yet), we render a
 * fallback placeholder so the deck doesn't crash mid-build during
 * Phase 1.
 */

import type { DeckMode, Slide } from '../types';
import { getLayout } from '../layouts';
import { Frame } from './Frame';
import { PageChrome } from './PageChrome';

interface Props {
  slide: Slide;
  index: number;
  total: number;
  mode: DeckMode;
  /** Brand wordmark shown in chrome — usually `brand.name` lower-case. */
  brandWordmark?: string;
  /** RTL? Reads from `brand.guidelines?.language?.direction === 'rtl'`. */
  rtl?: boolean;
}

export function SlideRenderer({ slide, index, total, mode, brandWordmark, rtl }: Props) {
  const Layout = getLayout(slide.layout);

  if (!Layout) {
    return (
      <Frame index={index}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 16,
            color: 'rgba(0,21,99,0.45)',
            fontFamily: 'var(--deck-font-body)',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700 }}>
            Unknown layout: <code>{slide.layout}</code>
          </span>
          <span style={{ fontSize: 13 }}>
            Register it in <code>src/shared/presentation/v2/layouts/index.ts</code>.
          </span>
        </div>
      </Frame>
    );
  }

  return (
    <Frame index={index}>
      <PageChrome
        brandWordmark={brandWordmark}
        section={slide.section}
        pageNum={index}
        total={total}
        rtl={rtl}
      />
      <Layout
        blocks={slide.blocks}
        positions={slide.positions}
        index={index}
        total={total}
        section={slide.section}
        mode={mode}
      />
    </Frame>
  );
}
