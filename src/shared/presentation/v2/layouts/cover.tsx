/**
 * Cover layout — title slide.
 *
 * Editorial composition with:
 *   - Massive display title (60% width, leading-aligned).
 *   - Tag label above title with leading accent rule.
 *   - Subtitle in light body, max 70% width.
 *   - Decorative slide-number watermark behind content.
 *   - Quarter-circle accent shape in trailing-bottom corner.
 *   - Optional image collapsed to a 40% slot when present.
 *
 * Slots:
 *  - title    (text, role display)  required
 *  - subtitle (text, role h3)       optional
 *  - tag      (text, role label)    optional
 *  - image    (image)               optional
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps } from '../types';
import { registerLayout } from './registry';
import {
  AccentRadialBackdrop,
  CHROME_TOP_INSET,
  ImagePlaceholder,
  LabelWithRule,
  NumeralWatermark,
  SlotImage,
  SlotText,
  detectDirection,
  isEmptyImage,
} from './_helpers';

const Cover: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId, index } = props;
  const direction = detectDirection(blocks);
  const hasImageSlot = !isEmptyImage(blocks.image) || mode === 'edit';
  const imageEmpty = isEmptyImage(blocks.image);

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    direction,
  };

  return (
    <div style={wrapper}>
      <AccentRadialBackdrop position="bottom-right" intensity={0.06} />

      {/* Decorative numeral watermark — soft accent block behind everything */}
      <NumeralWatermark
        index={index}
        size={20}
        opacity={0.05}
        style={{
          right: '4%',
          top: '12%',
        }}
      />

      {/* Quarter-circle accent in BR corner */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 220,
          height: 220,
          background: 'var(--deck-accent)',
          opacity: 0.85,
          borderTopLeftRadius: '100%',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: `${CHROME_TOP_INSET}px 0 0 0`,
          display: 'grid',
          gridTemplateColumns: hasImageSlot ? '1.4fr 1fr' : '1fr',
          gap: 'var(--deck-gap, 64px)',
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 28,
            minWidth: 0,
            zIndex: 1,
          }}
        >
          <LabelWithRule
            slideId={slideId}
            slot="tag"
            block={blocks.tag}
            mode={mode}
            hint="LABEL"
          />

          <SlotText
            slideId={slideId}
            slot="title"
            block={blocks.title}
            roleClass="deck-display"
            mode={mode}
            as="h1"
            hint="Slide title"
            style={{
              maxWidth: '95%',
              letterSpacing: '-0.02em',
              lineHeight: 0.98,
            }}
          />

          <SlotText
            slideId={slideId}
            slot="subtitle"
            block={blocks.subtitle}
            roleClass="deck-h3"
            mode={mode}
            as="p"
            hint="Subtitle"
            style={{
              maxWidth: 760,
              color: 'var(--deck-color-body)',
              fontWeight: 400,
              opacity: 0.85,
              marginTop: 4,
            }}
          />

          {/* Decorative trailing line */}
          <div
            aria-hidden
            style={{
              marginTop: 12,
              width: 64,
              height: 3,
              background: 'var(--deck-accent)',
              borderRadius: 999,
              opacity: 0.9,
            }}
          />
        </div>

        {hasImageSlot && (
          <div
            style={{
              position: 'relative',
              minHeight: 0,
              alignSelf: 'stretch',
              zIndex: 1,
            }}
          >
            {imageEmpty ? (
              <ImagePlaceholder variant={index % 6} style={{ position: 'absolute', inset: 0 }} />
            ) : (
              <SlotImage
                slideId={slideId}
                slot="image"
                block={blocks.image}
                mode={mode}
                hint="Cover image"
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

export default Cover;

registerLayout('cover', Cover);
