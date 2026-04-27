/**
 * Stats3 layout — three KPI cards with editorial polish.
 *
 * Composition:
 *   - Section label + title row at the top.
 *   - Three cards in a row:
 *       · Massive numeral (display weight 800) in BRAND ACCENT.
 *       · "01 / 02 / 03" tiny ordinal in TR corner.
 *       · Trend glyph (↑/↓) inline next to value.
 *       · Label in deck-h4.
 *       · Caption row with leading accent rule.
 *   - Hover lift on each card.
 *   - Note row at bottom in italic small.
 *
 * Slots:
 *  - title (text, role h1)        optional
 *  - label (text, role label)     optional
 *  - stat1 (stat)                 required
 *  - stat2 (stat)                 required
 *  - stat3 (stat)                 required
 *  - note  (text, role caption)   optional
 */

import type { CSSProperties, ReactNode } from 'react';
import type { Block, LayoutComponent, LayoutComponentProps, StatBlock } from '../types';
import { isStat } from '../types';
import { registerLayout } from './registry';
import {
  AccentRule,
  CHROME_TOP_INSET,
  LabelWithRule,
  NumeralWatermark,
  SlotText,
  detectDirection,
} from './_helpers';

function trendGlyph(trend?: StatBlock['trend']): ReactNode {
  if (!trend || trend === 'flat') return null;
  return (
    <span
      aria-hidden
      style={{
        color: 'var(--deck-accent)',
        fontSize: '0.4em',
        marginInlineStart: 14,
        verticalAlign: 'middle',
        fontWeight: 700,
      }}
    >
      {trend === 'up' ? '↑' : '↓'}
    </span>
  );
}

function StatCard({
  block,
  ordinal,
  mode,
}: {
  block: Block | undefined;
  ordinal: string;
  mode: LayoutComponentProps['mode'];
}) {
  const cardStyle: CSSProperties = {
    position: 'relative',
    background: 'var(--deck-bg-card)',
    border: '1px solid var(--deck-border-subtle)',
    borderRadius: 'var(--deck-radius, 16px)',
    boxShadow: 'var(--deck-shadow)',
    padding: '32px 32px 28px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 280,
    gap: 18,
    overflow: 'hidden',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  };

  const ordinalEl = (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        right: 22,
        top: 18,
        fontFamily: 'var(--deck-font-label)',
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.18em',
        color: 'var(--deck-accent)',
        opacity: 0.55,
      }}
    >
      {ordinal}
    </span>
  );

  if (!isStat(block)) {
    if (mode !== 'edit') {
      return <div style={{ ...cardStyle, opacity: 0 }} />;
    }
    return (
      <div
        style={{
          ...cardStyle,
          borderStyle: 'dashed',
          background: 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--deck-color-caption)',
          fontFamily: 'var(--deck-font-caption)',
          fontSize: 14,
          boxShadow: 'none',
        }}
      >
        {ordinalEl}
        Click to add a stat
      </div>
    );
  }

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {ordinalEl}

      <div
        className="deck-display"
        style={{
          color: 'var(--deck-accent)',
          fontWeight: 800,
          fontSize: 'min(7.5rem, calc(var(--deck-text-display, 96px) * 1.2))',
          lineHeight: 0.9,
          letterSpacing: '-0.04em',
          marginTop: 22,
        }}
      >
        {block.value}
        {trendGlyph(block.trend)}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <AccentRule width={28} height={3} style={{ opacity: 0.85 }} />
        <span
          className="deck-h4"
          style={{ display: 'block', letterSpacing: '-0.005em' }}
        >
          {block.label}
        </span>
        {block.caption && (
          <span
            className="deck-caption"
            style={{ display: 'block', opacity: 0.75 }}
          >
            {block.caption}
          </span>
        )}
      </div>
    </div>
  );
}

const Stats3: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId, index } = props;
  const direction = detectDirection(blocks);

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
        style={{ right: '4%', top: '8%' }}
      />

      <div
        style={{
          position: 'absolute',
          inset: `${CHROME_TOP_INSET}px 0 0 0`,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <LabelWithRule
          slideId={slideId}
          slot="label"
          block={blocks.label}
          mode={mode}
          hint="KEY METRICS"
        />

        <SlotText
          slideId={slideId}
          slot="title"
          block={blocks.title}
          roleClass="deck-h1"
          mode={mode}
          as="h1"
          hint="Slide title (optional)"
          style={{ letterSpacing: '-0.02em', lineHeight: 1.04 }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--deck-gap, 28px)',
            flex: 1,
            minHeight: 0,
            marginTop: 4,
          }}
        >
          <StatCard block={blocks.stat1} ordinal="01" mode={mode} />
          <StatCard block={blocks.stat2} ordinal="02" mode={mode} />
          <StatCard block={blocks.stat3} ordinal="03" mode={mode} />
        </div>

        <SlotText
          slideId={slideId}
          slot="note"
          block={blocks.note}
          roleClass="deck-caption"
          mode={mode}
          as="span"
          hint="Source / footnote"
          style={{ fontStyle: 'italic', opacity: 0.7 }}
        />
      </div>
    </div>
  );
};

export default Stats3;

registerLayout('stats-3', Stats3);
