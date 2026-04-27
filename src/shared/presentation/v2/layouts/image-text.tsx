/**
 * ImageText layout — 50/50 image + text composition.
 *
 * Editorial composition:
 *   - Image side fills its 50% with proper aspect ratio.
 *   - Empty image: ImagePlaceholder (dot grid + corner block).
 *   - Image is rounded with soft shadow.
 *   - Text side: section label (with rule) → h1 title → body → CTA pill.
 *   - Decorative slide-number watermark behind the text column.
 *   - Corner accent rectangle (small) overlapping the image as a frame.
 *
 * Slots:
 *  - label (text, role label)   optional
 *  - image (image)              required
 *  - title (text, role h1)      required
 *  - body  (text, role body)    required
 *  - cta   (text, role label)   optional
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps } from '../types';
import { isText } from '../types';
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
  isEmptyText,
} from './_helpers';

const ImageText: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId, index } = props;
  const direction = detectDirection(blocks);
  const imageEmpty = isEmptyImage(blocks.image);
  const ctaEmpty = isEmptyText(blocks.cta);
  const ctaText = isText(blocks.cta) ? blocks.cta.text : '';

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
        style={{ right: '4%', top: '14%' }}
      />

      <div
        style={{
          position: 'absolute',
          inset: `${CHROME_TOP_INSET}px 0 0 0`,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--deck-gap, 56px)',
          alignItems: 'stretch',
        }}
      >
        {/* Image column with corner accent rectangle */}
        <div style={{ position: 'relative', minHeight: 0 }}>
          {/* Decorative corner block */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: -10,
              top: -10,
              width: 60,
              height: 60,
              background: 'var(--deck-accent)',
              opacity: 0.85,
              borderRadius: 8,
              zIndex: 0,
            }}
          />
          {imageEmpty ? (
            <ImagePlaceholder
              variant={index % 6}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
              }}
            />
          ) : (
            <SlotImage
              slideId={slideId}
              slot="image"
              block={blocks.image}
              mode={mode}
              hint="Click to add image"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'var(--deck-radius, 16px)',
                boxShadow: 'var(--deck-shadow)',
                zIndex: 1,
              }}
            />
          )}
        </div>

        {/* Text column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 22,
            minWidth: 0,
            paddingInlineEnd: 12,
          }}
        >
          <LabelWithRule
            slideId={slideId}
            slot="label"
            block={blocks.label}
            mode={mode}
            hint="EYEBROW"
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
            slot="body"
            block={blocks.body}
            roleClass="deck-body"
            mode={mode}
            as="p"
            hint="Body copy"
            style={{ maxWidth: 640, lineHeight: 1.55, opacity: 0.92 }}
          />

          {(!ctaEmpty || mode === 'edit') && (
            <div style={{ marginTop: 14 }}>
              <span
                className="deck-label"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 20px',
                  background:
                    'color-mix(in srgb, var(--deck-accent) 12%, transparent)',
                  color: 'var(--deck-accent)',
                  borderRadius: 999,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                }}
              >
                <SlotText
                  slideId={slideId}
                  slot="cta"
                  block={blocks.cta}
                  roleClass="deck-label"
                  mode={mode}
                  as="span"
                  hint="CALL TO ACTION"
                  style={{ color: 'inherit', padding: 0 }}
                />
                {(ctaText || mode !== 'edit') && (
                  <span aria-hidden style={{ fontSize: '1.1em' }}>
                    →
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageText;

registerLayout('image-text', ImageText);
