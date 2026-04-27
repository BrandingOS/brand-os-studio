/**
 * SectionDivider layout — chapter break.
 *
 * Full-bleed editorial divider:
 *   - Massive display headline centered.
 *   - Section label (small caps) flanked by two accent rules.
 *   - Massive decorative numeral behind the title (very low opacity).
 *   - Soft radial gradient backdrop in brand accent.
 *   - Thin accent rule below title as a closing note.
 *
 * Slots:
 *  - label  (text, role label)  optional
 *  - title  (text, role h1)     required
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps } from '../types';
import { registerLayout } from './registry';
import {
  AccentRadialBackdrop,
  AccentRule,
  CHROME_TOP_INSET,
  NumeralWatermark,
  SlotText,
  detectDirection,
  isEmptyText,
} from './_helpers';

const SectionDivider: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId, index } = props;
  const direction = detectDirection(blocks);
  const labelEmpty = isEmptyText(blocks.label);

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    direction,
  };

  return (
    <div style={wrapper}>
      <AccentRadialBackdrop position="center" intensity={0.07} />

      {/* Massive watermark numeral behind the title */}
      <NumeralWatermark
        index={index}
        size={32}
        opacity={0.05}
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

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
        {(!labelEmpty || mode === 'edit') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              justifyContent: 'center',
            }}
          >
            <AccentRule width={48} height={2} />
            <SlotText
              slideId={slideId}
              slot="label"
              block={blocks.label}
              roleClass="deck-label"
              mode={mode}
              as="span"
              hint="SECTION LABEL"
              style={{
                color: 'var(--deck-accent)',
                letterSpacing: '0.22em',
              }}
            />
            <AccentRule width={48} height={2} />
          </div>
        )}

        <SlotText
          slideId={slideId}
          slot="title"
          block={blocks.title}
          roleClass="deck-display"
          mode={mode}
          as="h1"
          hint="Section title"
          align="center"
          style={{
            maxWidth: 1500,
            letterSpacing: '-0.025em',
            lineHeight: 0.96,
          }}
        />

        <AccentRule width={120} height={4} style={{ marginTop: 8 }} />
      </div>
    </div>
  );
};

export default SectionDivider;

registerLayout('section-divider', SectionDivider);
