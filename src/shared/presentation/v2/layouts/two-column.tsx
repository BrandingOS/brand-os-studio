/**
 * TwoColumn layout — title with two card columns below.
 *
 * Slots:
 *  - title      (text, role h1)   required
 *  - leftTitle  (text, role h3)   required
 *  - leftBody   (text, role body) required
 *  - rightTitle (text, role h3)   required
 *  - rightBody  (text, role body) required
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps } from '../types';
import { registerLayout } from './index';
import { CHROME_TOP_INSET, SlotText, detectDirection } from './_helpers';

const cardStyle: CSSProperties = {
  background: 'var(--deck-bg-card)',
  border: '1px solid var(--deck-border-subtle)',
  borderRadius: 'var(--deck-radius, 16px)',
  boxShadow: 'var(--deck-shadow)',
  padding: 'var(--deck-pad-y, 32px) var(--deck-pad-x, 32px)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  minWidth: 0,
};

const TwoColumn: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode } = props;
  const direction = detectDirection(blocks);

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: `${CHROME_TOP_INSET}px 0 0 0`,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--deck-gap, 32px)',
    direction,
  };

  return (
    <div style={wrapper}>
      <SlotText
        block={blocks.title}
        roleClass="deck-h1"
        mode={mode}
        as="h1"
        hint="Slide title"
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--deck-gap, 32px)',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div style={cardStyle}>
          <SlotText
            block={blocks.leftTitle}
            roleClass="deck-h3"
            mode={mode}
            as="h3"
            hint="Left title"
          />
          <SlotText
            block={blocks.leftBody}
            roleClass="deck-body"
            mode={mode}
            as="p"
            hint="Left body copy"
          />
        </div>
        <div style={cardStyle}>
          <SlotText
            block={blocks.rightTitle}
            roleClass="deck-h3"
            mode={mode}
            as="h3"
            hint="Right title"
          />
          <SlotText
            block={blocks.rightBody}
            roleClass="deck-body"
            mode={mode}
            as="p"
            hint="Right body copy"
          />
        </div>
      </div>
    </div>
  );
};

export default TwoColumn;

registerLayout('two-column', TwoColumn);
