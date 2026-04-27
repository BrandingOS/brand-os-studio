/**
 * Bullets layout — title + list, optional image column.
 *
 * Slots:
 *  - title   (text, role h1)         required
 *  - intro   (text, role body)       optional — short lede above bullets
 *  - bullets (list, role body)       required
 *  - image   (image)                 optional — when present, 60/40 split
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps, ListBlock } from '../types';
import { isList } from '../types';
import { registerLayout } from './registry';
import {
  CHROME_TOP_INSET,
  SlotImage,
  SlotText,
  detectDirection,
  isEmptyImage,
} from './_helpers';

function bulletMarkerNode(marker: ListBlock['marker'], index: number) {
  switch (marker) {
    case 'check':
      return (
        <span
          aria-hidden
          style={{
            color: 'var(--deck-accent)',
            fontWeight: 700,
            marginInlineEnd: 14,
            flexShrink: 0,
          }}
        >
          ✓
        </span>
      );
    case 'arrow':
      return (
        <span
          aria-hidden
          style={{
            color: 'var(--deck-accent)',
            fontWeight: 700,
            marginInlineEnd: 14,
            flexShrink: 0,
          }}
        >
          →
        </span>
      );
    case 'number':
      return (
        <span
          className="deck-label"
          aria-hidden
          style={{
            color: 'var(--deck-accent)',
            marginInlineEnd: 14,
            minWidth: 26,
            flexShrink: 0,
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
      );
    case 'none':
      return null;
    case 'dot':
    default:
      return (
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: 999,
            background: 'var(--deck-accent)',
            marginInlineEnd: 16,
            marginTop: '0.55em',
            flexShrink: 0,
          }}
        />
      );
  }
}

const Bullets: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId } = props;
  const direction = detectDirection(blocks);
  const hasImage = !isEmptyImage(blocks.image);
  const list = isList(blocks.bullets) ? blocks.bullets : undefined;

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: `${CHROME_TOP_INSET}px 0 0 0`,
    display: 'grid',
    gridTemplateColumns: hasImage ? '1.5fr 1fr' : '1fr',
    gap: 'var(--deck-gap, 48px)',
    alignItems: 'stretch',
    direction,
  };

  return (
    <div style={wrapper}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 24,
          minWidth: 0,
        }}
      >
        <SlotText
          slideId={slideId}
          slot="title"
          block={blocks.title}
          roleClass="deck-h1"
          mode={mode}
          as="h1"
          hint="Slide title"
        />
        <SlotText
          slideId={slideId}
          slot="intro"
          block={blocks.intro}
          roleClass="deck-body"
          mode={mode}
          as="p"
          hint="Optional short intro"
          style={{ maxWidth: 920, color: 'var(--deck-color-body)' }}
        />
        {list ? (
          <ul
            className="deck-body"
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              maxWidth: 1100,
            }}
          >
            {list.items.map((item, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  lineHeight: 1.5,
                }}
              >
                {bulletMarkerNode(list.marker, i)}
                <span style={{ flex: 1 }}>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          mode === 'edit' && (
            <div
              className="deck-body"
              style={{
                opacity: 0.55,
                outline:
                  '1.5px dashed var(--deck-border-subtle, rgba(0,21,99,0.18))',
                outlineOffset: 4,
                borderRadius: 6,
                padding: '8px 12px',
                maxWidth: 600,
              }}
            >
              Click to add bullets
            </div>
          )
        )}
      </div>

      {(hasImage || mode === 'edit') && (
        <div style={{ position: 'relative', minHeight: 0 }}>
          <SlotImage
            slideId={slideId}
            slot="image"
            block={blocks.image}
            mode={mode}
            hint="Supporting image"
            style={{ position: 'absolute', inset: 0 }}
          />
        </div>
      )}
    </div>
  );
};

export default Bullets;

registerLayout('bullets', Bullets);
