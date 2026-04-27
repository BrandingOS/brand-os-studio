/**
 * Gallery layout — N images in a grid.
 *
 * Editorial composition:
 *   - Section label + title at top.
 *   - 3-column grid (≥4 images) or 2-column grid (1-3 images).
 *   - Tiles are rounded with soft shadow and a tiny ordinal in the
 *     trailing-top corner.
 *   - Empty tiles use ImagePlaceholder with a different `variant` per
 *     tile so they're not monotone.
 *   - Hover lift on each tile.
 *   - Caption with leading rule at bottom.
 *   - Decorative slide-number watermark in TR.
 */

import type { CSSProperties } from 'react';
import type { Block, LayoutComponent, LayoutComponentProps } from '../types';
import {
  CHROME_TOP_INSET,
  ImagePlaceholder,
  LabelWithRule,
  NumeralWatermark,
  SlotImage,
  SlotText,
  detectDirection,
  isEmptyImage,
  isEmptyText,
} from './_helpers';
import { registerLayout } from './registry';

const MAX_IMAGES = 6;

function collectImages(
  blocks: Record<string, Block>,
): Array<{ n: number; block: Block | undefined; empty: boolean }> {
  const out: Array<{ n: number; block: Block | undefined; empty: boolean }> = [];
  for (let i = 1; i <= MAX_IMAGES; i++) {
    const block = blocks[`image${i}`];
    out.push({ n: i, block, empty: isEmptyImage(block) });
  }
  return out;
}

const Gallery: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId, index } = props;
  const direction = detectDirection(blocks);
  const all = collectImages(blocks);
  const populated = all.filter((m) => !m.empty);
  const tiles =
    mode === 'edit'
      ? all.slice(0, Math.max(populated.length, 6))
      : populated;

  const cols = tiles.length >= 4 ? 3 : Math.max(1, Math.min(tiles.length, 2));
  const captionEmpty = isEmptyText(blocks.caption);

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    direction,
  };

  return (
    <div style={wrapper}>
      <NumeralWatermark
        index={index}
        size={14}
        opacity={0.05}
        style={{ right: '4%', top: '8%' }}
      />

      <div
        style={{
          position: 'absolute',
          inset: `${CHROME_TOP_INSET}px 0 0 0`,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <LabelWithRule
          slideId={slideId}
          slot="label"
          block={blocks.label}
          mode={mode}
          hint="GALLERY"
        />

        <SlotText
          slideId={slideId}
          slot="title"
          block={blocks.title}
          roleClass="deck-h1"
          mode={mode}
          as="h1"
          hint="Gallery title (optional)"
          style={{ letterSpacing: '-0.02em', lineHeight: 1.04 }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridAutoRows: '1fr',
            gap: 18,
            flex: 1,
            minHeight: 0,
            marginTop: 4,
          }}
        >
          {tiles.map(({ n, block, empty }, idx) => (
            <div
              key={n}
              style={{
                position: 'relative',
                borderRadius: 'var(--deck-radius, 12px)',
                overflow: 'hidden',
                boxShadow: empty ? 'none' : 'var(--deck-shadow)',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {empty ? (
                <ImagePlaceholder
                  variant={(idx + index) % 6}
                  style={{ position: 'absolute', inset: 0 }}
                />
              ) : (
                <SlotImage
                  slideId={slideId}
                  slot={`image${n}`}
                  block={block}
                  mode={mode}
                  hint={`Image ${n}`}
                  style={{ position: 'absolute', inset: 0 }}
                />
              )}

              {/* Tiny ordinal in TR */}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 12,
                  fontFamily: 'var(--deck-font-label)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  color: '#fff',
                  background: 'rgba(0,0,0,0.45)',
                  padding: '4px 8px',
                  borderRadius: 999,
                  backdropFilter: 'blur(4px)',
                  pointerEvents: 'none',
                }}
              >
                {String(n).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>

        {(!captionEmpty || mode === 'edit') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginTop: 4,
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 24,
                height: 2,
                background: 'var(--deck-accent)',
                borderRadius: 999,
                flexShrink: 0,
              }}
            />
            <SlotText
              slideId={slideId}
              slot="caption"
              block={blocks.caption}
              roleClass="deck-caption"
              mode={mode}
              as="span"
              hint="Optional caption"
              style={{ opacity: 0.85, fontStyle: 'italic' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;

registerLayout('gallery', Gallery);
