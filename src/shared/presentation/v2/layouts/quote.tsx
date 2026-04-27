/**
 * Quote layout — pull-quote / testimonial.
 *
 * Editorial composition:
 *   - MASSIVE opening quote glyph ("❝") in soft accent color, top-leading.
 *   - Quote text in display font, centered, max 1300px wide.
 *   - Closing quote glyph mirrored at bottom-trailing in even softer tone.
 *   - Author + role row: optional avatar circle (with accent ring),
 *     name in deck-h4, role in deck-caption with leading rule.
 *   - Decorative slide-number watermark behind the text.
 *
 * Slots:
 *  - quote       (quote)                    required
 *  - attribution (text, role caption)       optional
 *  - image       (image)                    optional
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps } from '../types';
import { isQuote } from '../types';
import { registerLayout } from './registry';
import {
  AccentRule,
  CHROME_TOP_INSET,
  ImagePlaceholder,
  NumeralWatermark,
  SlotImage,
  SlotText,
  detectDirection,
  hasArabic,
  isEmptyImage,
} from './_helpers';

const Quote: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId, index } = props;
  const direction = detectDirection(blocks);
  const q = isQuote(blocks.quote) ? blocks.quote : undefined;
  const hasAvatar = !isEmptyImage(blocks.image) || mode === 'edit';
  const avatarEmpty = isEmptyImage(blocks.image);

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
        size={26}
        opacity={0.04}
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Massive opening quote glyph — TL */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: '6%',
          top: '14%',
          fontFamily: 'var(--deck-font-display)',
          fontSize: '14rem',
          lineHeight: 0.7,
          color: 'var(--deck-accent)',
          opacity: 0.16,
          fontWeight: 800,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        “
      </span>

      {/* Closing quote glyph — BR */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: '6%',
          bottom: '8%',
          fontFamily: 'var(--deck-font-display)',
          fontSize: '10rem',
          lineHeight: 0.7,
          color: 'var(--deck-accent)',
          opacity: 0.08,
          fontWeight: 800,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        ”
      </span>

      <div
        style={{
          position: 'absolute',
          inset: `${CHROME_TOP_INSET}px 0 0 0`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 36,
          textAlign: 'center',
          padding: '0 8%',
        }}
      >
        {q ? (
          <blockquote
            className="deck-h2"
            style={{
              margin: 0,
              maxWidth: 1300,
              fontStyle: 'italic',
              lineHeight: 1.3,
              color: 'var(--deck-color-h2, var(--deck-color-h1))',
              letterSpacing: '-0.01em',
            }}
          >
            {hasArabic(q.text) ? <bdi>{q.text}</bdi> : q.text}
          </blockquote>
        ) : mode === 'edit' ? (
          <div
            className="deck-h2"
            style={{
              fontStyle: 'italic',
              opacity: 0.55,
              outline:
                '1.5px dashed var(--deck-border-subtle, rgba(0,21,99,0.18))',
              outlineOffset: 6,
              borderRadius: 8,
              padding: '6px 16px',
            }}
          >
            A short, memorable line
          </div>
        ) : null}

        <AccentRule width={64} height={3} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginTop: 6,
          }}
        >
          {hasAvatar && (
            <div
              style={{
                width: 72,
                height: 72,
                flexShrink: 0,
                borderRadius: '50%',
                padding: 3,
                background:
                  'color-mix(in srgb, var(--deck-accent) 25%, transparent)',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'var(--deck-bg-card)',
                }}
              >
                {avatarEmpty ? (
                  <ImagePlaceholder
                    variant={(index + 2) % 6}
                    shape="circle"
                  />
                ) : (
                  <SlotImage
                    slideId={slideId}
                    slot="image"
                    block={blocks.image}
                    mode={mode}
                    shape="circle"
                    hint="Avatar"
                    style={{ position: 'static' }}
                  />
                )}
              </div>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 2,
              textAlign: direction === 'rtl' ? 'right' : 'left',
            }}
          >
            {q?.author && (
              <span className="deck-h4" style={{ display: 'block' }}>
                {q.author}
              </span>
            )}
            {q?.role && (
              <span
                className="deck-label"
                style={{
                  display: 'block',
                  color: 'var(--deck-accent)',
                  letterSpacing: '0.16em',
                }}
              >
                {q.role}
              </span>
            )}
            <SlotText
              slideId={slideId}
              slot="attribution"
              block={blocks.attribution}
              roleClass="deck-caption"
              mode={mode}
              as="span"
              hint="Author, role"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quote;

registerLayout('quote', Quote);
