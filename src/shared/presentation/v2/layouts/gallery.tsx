/**
 * Gallery layout — N images in a grid.
 *
 * Slots:
 *  - title         (text, role h1)      optional
 *  - caption       (text, role caption) optional
 *  - image1..image6 (image)              auto-discovered by key prefix
 *
 * Slot-discovery choice: same parallel-keys pattern. Scan image1..image6.
 * Layout is a 3-column grid when ≥4 images, 2-column otherwise.
 */

import type { CSSProperties } from 'react';
import type { Block, LayoutComponent, LayoutComponentProps } from '../types';
import {
  CHROME_TOP_INSET,
  SlotImage,
  SlotText,
  detectDirection,
  isEmptyImage,
} from './_helpers';
import { registerLayout } from './registry';

const MAX_IMAGES = 6;

function collectImages(blocks: Record<string, Block>): Array<{ n: number; block: Block | undefined; empty: boolean }> {
  const out: Array<{ n: number; block: Block | undefined; empty: boolean }> = [];
  for (let i = 1; i <= MAX_IMAGES; i++) {
    const block = blocks[`image${i}`];
    out.push({ n: i, block, empty: isEmptyImage(block) });
  }
  return out;
}

const Gallery: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId } = props;
  const direction = detectDirection(blocks);
  const all = collectImages(blocks);
  const populated = all.filter((m) => !m.empty);
  // In edit mode show 6 tiles minimum so the user can fill them.
  const tiles =
    mode === 'edit'
      ? all.slice(0, Math.max(populated.length, 6))
      : populated;

  const cols = tiles.length >= 4 ? 3 : Math.max(1, Math.min(tiles.length, 2));

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: `${CHROME_TOP_INSET}px 0 0 0`,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--deck-gap, 24px)',
    direction,
  };

  return (
    <div style={wrapper}>
      <SlotText
        slideId={slideId}
        slot="title"
        block={blocks.title}
        roleClass="deck-h1"
        mode={mode}
        as="h1"
        hint="Gallery title (optional)"
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridAutoRows: '1fr',
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        {tiles.map(({ n, block }) => (
          <div
            key={n}
            style={{
              position: 'relative',
              borderRadius: 'var(--deck-radius, 12px)',
              overflow: 'hidden',
              background: 'var(--deck-bg-card)',
              border: '1px solid var(--deck-border-subtle)',
            }}
          >
            <SlotImage
              slideId={slideId}
              slot={`image${n}`}
              block={block}
              mode={mode}
              hint={`Image ${n}`}
              style={{ position: 'absolute', inset: 0 }}
            />
          </div>
        ))}
      </div>
      <SlotText
        slideId={slideId}
        slot="caption"
        block={blocks.caption}
        roleClass="deck-caption"
        mode={mode}
        as="span"
        hint="Optional caption"
      />
    </div>
  );
};

export default Gallery;

registerLayout('gallery', Gallery);
