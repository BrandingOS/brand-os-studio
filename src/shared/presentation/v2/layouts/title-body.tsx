/**
 * TitleBody layout — standard text slide.
 *
 * Slots:
 *  - label (text, role label)  optional
 *  - title (text, role h1)     required
 *  - body  (text, role body)   required — flowing copy with max-width
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps } from '../types';
import { registerLayout } from './index';
import { CHROME_TOP_INSET, SlotText, detectDirection } from './_helpers';

const TitleBody: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode } = props;
  const direction = detectDirection(blocks);

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: `${CHROME_TOP_INSET}px 0 0 0`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 24,
    direction,
  };

  return (
    <div style={wrapper}>
      <SlotText
        block={blocks.label}
        roleClass="deck-label"
        mode={mode}
        as="span"
        hint="LABEL"
        style={{ color: 'var(--deck-accent)' }}
      />
      <SlotText
        block={blocks.title}
        roleClass="deck-h1"
        mode={mode}
        as="h1"
        hint="Slide title"
        style={{ maxWidth: 1400 }}
      />
      <SlotText
        block={blocks.body}
        roleClass="deck-body"
        mode={mode}
        as="p"
        hint="Body copy goes here…"
        style={{ maxWidth: 980, marginTop: 8 }}
      />
    </div>
  );
};

export default TitleBody;

registerLayout('title-body', TitleBody);
