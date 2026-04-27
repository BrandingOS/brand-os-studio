/**
 * Bullets layout — title + list, optional image column.
 *
 * Editorial composition:
 *   - Section label with accent rule above title.
 *   - Each bullet uses a custom marker:
 *     · `dot`    → 10px filled accent circle
 *     · `check`  → bold accent ✓
 *     · `arrow`  → bold accent →
 *     · `number` → 01/02/… numerals in deck-label style
 *   - Hairline separator between bullets (1px low-opacity accent).
 *   - Optional image column (40%) — empty state uses ImagePlaceholder
 *     instead of dashed-text box.
 *   - Decorative slide-number watermark in TR.
 *
 * Slots:
 *  - title   (text, role h1)         required
 *  - intro   (text, role body)       optional
 *  - bullets (list, role body)       required
 *  - image   (image)                 optional
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps, ListBlock } from '../types';
import { isList } from '../types';
import { registerLayout } from './registry';
import {
  CHROME_TOP_INSET,
  ImagePlaceholder,
  LabelWithRule,
  NumeralWatermark,
  SlotImage,
  SlotText,
  detectDirection,
  isEmptyImage,
} from './_helpers';

function bulletMarker(marker: ListBlock['marker'], index: number) {
  switch (marker) {
    case 'check':
      return (
        <span
          aria-hidden
          style={{
            color: 'var(--deck-accent)',
            fontWeight: 700,
            marginInlineEnd: 16,
            flexShrink: 0,
            fontSize: '1.1em',
            lineHeight: 1.4,
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
            marginInlineEnd: 16,
            flexShrink: 0,
            fontSize: '1.05em',
            lineHeight: 1.4,
          }}
        >
          →
        </span>
      );
    case 'number':
      return (
        <span
          aria-hidden
          style={{
            color: 'var(--deck-accent)',
            fontFamily: 'var(--deck-font-label)',
            fontWeight: 700,
            fontSize: '0.85em',
            letterSpacing: '0.14em',
            marginInlineEnd: 18,
            minWidth: 32,
            flexShrink: 0,
            paddingTop: '0.18em',
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
            width: 10,
            height: 10,
            borderRadius: 999,
            background: 'var(--deck-accent)',
            marginInlineEnd: 18,
            marginTop: '0.55em',
            flexShrink: 0,
            boxShadow:
              '0 0 0 4px color-mix(in srgb, var(--deck-accent) 16%, transparent)',
          }}
        />
      );
  }
}

const Bullets: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId, index } = props;
  const direction = detectDirection(blocks);
  const hasImage = !isEmptyImage(blocks.image) || mode === 'edit';
  const imageEmpty = isEmptyImage(blocks.image);
  const list = isList(blocks.bullets) ? blocks.bullets : undefined;

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
        size={16}
        opacity={0.05}
        style={{ right: '4%', top: '18%' }}
      />

      <div
        style={{
          position: 'absolute',
          inset: `${CHROME_TOP_INSET}px 0 0 0`,
          display: 'grid',
          gridTemplateColumns: hasImage ? '1.5fr 1fr' : '1fr',
          gap: 'var(--deck-gap, 56px)',
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 22,
            minWidth: 0,
          }}
        >
          <LabelWithRule
            slideId={slideId}
            slot="label"
            block={blocks.label}
            mode={mode}
            hint="SECTION LABEL"
          />

          <SlotText
            slideId={slideId}
            slot="title"
            block={blocks.title}
            roleClass="deck-h1"
            mode={mode}
            as="h1"
            hint="Slide title"
            style={{ letterSpacing: '-0.02em', lineHeight: 1.04 }}
          />

          <SlotText
            slideId={slideId}
            slot="intro"
            block={blocks.intro}
            roleClass="deck-body"
            mode={mode}
            as="p"
            hint="Optional short intro"
            style={{
              maxWidth: 920,
              color: 'var(--deck-color-body)',
              opacity: 0.85,
            }}
          />

          {list ? (
            <ul
              className="deck-body"
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '8px 0 0 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                maxWidth: 1100,
              }}
            >
              {list.items.map((item, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    lineHeight: 1.55,
                    padding: '14px 0',
                    borderTop:
                      i === 0
                        ? 'none'
                        : '1px solid color-mix(in srgb, var(--deck-accent) 10%, transparent)',
                  }}
                >
                  {bulletMarker(list.marker, i)}
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

        {hasImage && (
          <div style={{ position: 'relative', minHeight: 0 }}>
            {imageEmpty ? (
              <ImagePlaceholder
                variant={index % 6}
                style={{ position: 'absolute', inset: 0 }}
              />
            ) : (
              <SlotImage
                slideId={slideId}
                slot="image"
                block={blocks.image}
                mode={mode}
                hint="Supporting image"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'var(--deck-radius, 16px)',
                  boxShadow: 'var(--deck-shadow)',
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bullets;

registerLayout('bullets', Bullets);
