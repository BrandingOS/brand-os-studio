/**
 * MetricsHero layout — one giant number focus.
 *
 * Editorial composition:
 *   - Section label with rule above the metric.
 *   - GIANT numeric value at ~14rem (display weight 800) in BRAND ACCENT.
 *   - Trend glyph (↑/↓) inline next to value when set.
 *   - Label in deck-h2.
 *   - Context line in deck-h3 with leading + trailing accent rules.
 *   - Caption in italic small at bottom.
 *   - Massive decorative numeral watermark behind value.
 *   - Soft radial accent backdrop.
 */

import type { CSSProperties, ReactNode } from 'react';
import type { LayoutComponent, LayoutComponentProps, StatBlock } from '../types';
import { isStat } from '../types';
import {
  AccentRadialBackdrop,
  AccentRule,
  CHROME_TOP_INSET,
  LabelWithRule,
  NumeralWatermark,
  SlotText,
  detectDirection,
  isEmptyText,
} from './_helpers';
import { registerLayout } from './registry';

function trendGlyph(trend?: StatBlock['trend']): ReactNode {
  if (!trend || trend === 'flat') return null;
  return (
    <span
      aria-hidden
      style={{
        color: 'var(--deck-accent)',
        fontSize: '0.32em',
        marginInlineStart: 18,
        verticalAlign: 'middle',
        fontWeight: 700,
      }}
    >
      {trend === 'up' ? '↑' : '↓'}
    </span>
  );
}

const MetricsHero: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId, index } = props;
  const direction = detectDirection(blocks);
  const metric = isStat(blocks.metric) ? blocks.metric : undefined;
  const contextEmpty = isEmptyText(blocks.context);

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    direction,
  };

  return (
    <div style={wrapper}>
      <AccentRadialBackdrop position="center" intensity={0.07} />

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

      <div
        style={{
          position: 'absolute',
          inset: `${CHROME_TOP_INSET}px 0 0 0`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 28,
          padding: '0 8%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            justifyContent: 'center',
          }}
        >
          <AccentRule width={36} height={2} />
          <SlotText
            slideId={slideId}
            slot="label"
            block={blocks.label}
            roleClass="deck-label"
            mode={mode}
            as="span"
            hint="THE NUMBER"
            style={{
              color: 'var(--deck-accent)',
              letterSpacing: '0.22em',
            }}
          />
          <AccentRule width={36} height={2} />
        </div>

        {metric ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--deck-font-display)',
                fontWeight: 800,
                fontSize: 'min(15rem, calc(var(--deck-text-display, 96px) * 2.6))',
                lineHeight: 0.9,
                color: 'var(--deck-accent)',
                letterSpacing: '-0.05em',
              }}
            >
              {metric.value}
              {trendGlyph(metric.trend)}
            </span>
            <AccentRule width={88} height={4} />
            <span
              className="deck-h2"
              style={{
                display: 'block',
                marginTop: 12,
                letterSpacing: '-0.01em',
              }}
            >
              {metric.label}
            </span>
            {metric.caption && (
              <span
                className="deck-caption"
                style={{ display: 'block', opacity: 0.75, fontStyle: 'italic' }}
              >
                {metric.caption}
              </span>
            )}
          </div>
        ) : (
          mode === 'edit' && (
            <div
              style={{
                opacity: 0.55,
                outline:
                  '1.5px dashed var(--deck-border-subtle, rgba(0,21,99,0.18))',
                outlineOffset: 8,
                borderRadius: 12,
                padding: '12px 24px',
                fontFamily: 'var(--deck-font-display)',
                fontWeight: 800,
                fontSize: 'min(11rem, calc(var(--deck-text-display, 96px) * 2))',
                lineHeight: 1,
                color: 'var(--deck-accent)',
                letterSpacing: '-0.05em',
              }}
            >
              123
            </div>
          )
        )}

        {(!contextEmpty || mode === 'edit') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              justifyContent: 'center',
              maxWidth: 1200,
              marginTop: 12,
            }}
          >
            <AccentRule width={32} height={2} style={{ opacity: 0.6 }} />
            <SlotText
              slideId={slideId}
              slot="context"
              block={blocks.context}
              roleClass="deck-h3"
              mode={mode}
              as="p"
              hint="One-sentence context"
              align="center"
              style={{
                color: 'var(--deck-color-body)',
                opacity: 0.92,
                flex: 1,
                maxWidth: 1100,
                fontStyle: 'italic',
              }}
            />
            <AccentRule width={32} height={2} style={{ opacity: 0.6 }} />
          </div>
        )}

        <SlotText
          slideId={slideId}
          slot="caption"
          block={blocks.caption}
          roleClass="deck-caption"
          mode={mode}
          as="span"
          hint="Footnote / source"
          style={{ opacity: 0.7, marginTop: 4 }}
        />
      </div>
    </div>
  );
};

export default MetricsHero;

registerLayout('metrics-hero', MetricsHero);
