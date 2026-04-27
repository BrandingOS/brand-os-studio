/**
 * Quote layout — testimonial / pull-quote.
 *
 * Slots:
 *  - quote       (quote)                    required
 *  - attribution (text, role caption)       optional
 *  - image       (image)                    optional — small avatar circle
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps } from '../types';
import { isQuote } from '../types';
import { registerLayout } from './index';
import {
  CHROME_TOP_INSET,
  SlotImage,
  SlotText,
  detectDirection,
  hasArabic,
  isEmptyImage,
} from './_helpers';

const Quote: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode } = props;
  const direction = detectDirection(blocks);
  const q = isQuote(blocks.quote) ? blocks.quote : undefined;
  const hasAvatar = !isEmptyImage(blocks.image) || mode === 'edit';

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: `${CHROME_TOP_INSET}px 0 0 0`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    textAlign: 'center',
    direction,
  };

  return (
    <div style={wrapper}>
      <span
        aria-hidden
        className="deck-display"
        style={{
          color: 'var(--deck-accent)',
          lineHeight: 0.5,
          fontSize: 'min(220px, var(--deck-text-display, 96px))',
        }}
      >
        “
      </span>

      {q ? (
        <blockquote
          className="deck-h2"
          style={{
            margin: 0,
            maxWidth: 1400,
            color: 'var(--deck-color-h2, var(--deck-color-h1))',
          }}
        >
          {hasArabic(q.text) ? <bdi>{q.text}</bdi> : q.text}
        </blockquote>
      ) : mode === 'edit' ? (
        <div
          className="deck-h2"
          style={{
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

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginTop: 12,
        }}
      >
        {hasAvatar && (
          <div
            style={{
              width: 64,
              height: 64,
              flexShrink: 0,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '1px solid var(--deck-border-subtle)',
            }}
          >
            <SlotImage
              block={blocks.image}
              mode={mode}
              shape="circle"
              hint="Avatar"
              style={{ position: 'static' }}
            />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {q?.author && (
            <span className="deck-h4" style={{ display: 'block' }}>
              {q.author}
            </span>
          )}
          {q?.role && (
            <span className="deck-caption" style={{ display: 'block' }}>
              {q.role}
            </span>
          )}
          <SlotText
            block={blocks.attribution}
            roleClass="deck-caption"
            mode={mode}
            as="span"
            hint="Author, role"
          />
        </div>
      </div>
    </div>
  );
};

export default Quote;

registerLayout('quote', Quote);
