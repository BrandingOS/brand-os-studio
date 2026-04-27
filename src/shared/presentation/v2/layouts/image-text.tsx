/**
 * ImageText layout — 50/50 image-left / text-right.
 *
 * Slots:
 *  - image (image)              required (placeholder in edit mode)
 *  - title (text, role h1)      required
 *  - body  (text, role body)    required
 *  - cta   (text, role label)   optional — small caps call-to-action
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps } from '../types';
import { registerLayout } from './index';
import {
  CHROME_TOP_INSET,
  SlotImage,
  SlotText,
  detectDirection,
} from './_helpers';

const ImageText: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode } = props;
  const direction = detectDirection(blocks);

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: `${CHROME_TOP_INSET}px 0 0 0`,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--deck-gap, 48px)',
    alignItems: 'stretch',
    direction,
  };

  return (
    <div style={wrapper}>
      <div style={{ position: 'relative', minHeight: 0 }}>
        <SlotImage
          block={blocks.image}
          mode={mode}
          hint="Click to add image"
          style={{ position: 'absolute', inset: 0 }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 20,
          minWidth: 0,
        }}
      >
        <SlotText
          block={blocks.title}
          roleClass="deck-h1"
          mode={mode}
          as="h1"
          hint="Slide title"
        />
        <SlotText
          block={blocks.body}
          roleClass="deck-body"
          mode={mode}
          as="p"
          hint="Body copy"
          style={{ maxWidth: 720 }}
        />
        <SlotText
          block={blocks.cta}
          roleClass="deck-label"
          mode={mode}
          as="span"
          hint="CALL TO ACTION"
          style={{ color: 'var(--deck-accent)', marginTop: 12 }}
        />
      </div>
    </div>
  );
};

export default ImageText;

registerLayout('image-text', ImageText);
