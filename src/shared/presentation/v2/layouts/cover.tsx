/**
 * Cover layout — title slide.
 *
 * Slots:
 *  - title    (text, role display)  required
 *  - subtitle (text, role h3)       optional
 *  - tag      (text, role label)    optional — small caps above title
 *  - image    (image)               optional — when present, splits 50/50
 *  - logo     (logo)                optional — top-left small (display deferred)
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps } from '../types';
import { registerLayout } from './registry';
import {
  CHROME_TOP_INSET,
  SlotImage,
  SlotText,
  detectDirection,
  isEmptyImage,
} from './_helpers';

const Cover: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode } = props;
  const direction = detectDirection(blocks);
  const hasImage = !isEmptyImage(blocks.image);

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: `${CHROME_TOP_INSET}px 0 0 0`,
    display: 'grid',
    gridTemplateColumns: hasImage ? '1.1fr 1fr' : '1fr',
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
        }}
      >
        <SlotText
          block={blocks.tag}
          roleClass="deck-label"
          mode={mode}
          as="span"
          hint="LABEL"
          style={{ color: 'var(--deck-accent)' }}
        />
        <SlotText
          block={blocks.title}
          roleClass="deck-display"
          mode={mode}
          as="h1"
          hint="Slide title"
        />
        <SlotText
          block={blocks.subtitle}
          roleClass="deck-h3"
          mode={mode}
          as="p"
          hint="Subtitle"
          style={{ maxWidth: 760, color: 'var(--deck-color-body)' }}
        />
      </div>

      {(hasImage || mode === 'edit') && (
        <div style={{ position: 'relative', minHeight: 0 }}>
          <SlotImage
            block={blocks.image}
            mode={mode}
            hint="Cover image"
            style={{ position: 'absolute', inset: 0 }}
          />
        </div>
      )}
    </div>
  );
};

export default Cover;

registerLayout('cover', Cover);
