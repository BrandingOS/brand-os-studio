/**
 * MetricsHero layout — one giant number focus.
 *
 * Slots:
 *  - metric  (stat)                required — value + label
 *  - context (text, role h3)       optional — a sentence after the number
 *  - caption (text, role caption)  optional
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps } from '../types';
import { isStat } from '../types';
import {
  CHROME_TOP_INSET,
  SlotText,
  detectDirection,
} from './_helpers';
import { registerLayout } from './index';

const MetricsHero: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode } = props;
  const direction = detectDirection(blocks);
  const metric = isStat(blocks.metric) ? blocks.metric : undefined;

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: `${CHROME_TOP_INSET}px 0 0 0`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 24,
    direction,
  };

  return (
    <div style={wrapper}>
      {metric ? (
        <>
          <span
            className="deck-display"
            style={{
              fontSize: 'min(280px, calc(var(--deck-text-display, 96px) * 2.4))',
              lineHeight: 1,
              color: 'var(--deck-color-h1)',
            }}
          >
            {metric.value}
          </span>
          <span className="deck-h2" style={{ display: 'block' }}>
            {metric.label}
          </span>
          {metric.caption && (
            <span className="deck-caption" style={{ display: 'block' }}>
              {metric.caption}
            </span>
          )}
        </>
      ) : (
        mode === 'edit' && (
          <div
            className="deck-display"
            style={{
              opacity: 0.55,
              outline:
                '1.5px dashed var(--deck-border-subtle, rgba(0,21,99,0.18))',
              outlineOffset: 8,
              borderRadius: 12,
              padding: '12px 24px',
              fontSize: 'min(220px, calc(var(--deck-text-display, 96px) * 2))',
              lineHeight: 1,
            }}
          >
            123
          </div>
        )
      )}

      <SlotText
        block={blocks.context}
        roleClass="deck-h3"
        mode={mode}
        as="p"
        hint="One-sentence context"
        style={{
          maxWidth: 1100,
          color: 'var(--deck-color-body)',
          marginTop: 12,
        }}
      />
      <SlotText
        block={blocks.caption}
        roleClass="deck-caption"
        mode={mode}
        as="span"
        hint="Footnote / source"
      />
    </div>
  );
};

export default MetricsHero;

registerLayout('metrics-hero', MetricsHero);
