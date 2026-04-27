/**
 * SectionDivider layout — chapter break.
 *
 * Slots:
 *  - label  (text, role label)  optional — small caps in accent color
 *  - title  (text, role h1)     required — massive centered headline
 *  - accent (shape)             optional — thin accent line below
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps } from '../types';
import { registerLayout } from './registry';
import { CHROME_TOP_INSET, SlotText, detectDirection } from './_helpers';

const SectionDivider: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode } = props;
  const direction = detectDirection(blocks);

  const accentBlock = blocks.accent;
  const accentVisible =
    !!accentBlock && accentBlock.kind === 'shape';

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
      <SlotText
        block={blocks.label}
        roleClass="deck-label"
        mode={mode}
        as="span"
        hint="SECTION LABEL"
        style={{ color: 'var(--deck-accent)' }}
      />
      <SlotText
        block={blocks.title}
        roleClass="deck-display"
        mode={mode}
        as="h1"
        hint="Section title"
        align="center"
        style={{ maxWidth: 1500 }}
      />
      {accentVisible && (
        <div
          style={{
            width: 96,
            height: 4,
            borderRadius: 999,
            background: 'var(--deck-accent)',
          }}
        />
      )}
    </div>
  );
};

export default SectionDivider;

registerLayout('section-divider', SectionDivider);
