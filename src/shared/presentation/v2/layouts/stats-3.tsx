/**
 * Stats3 layout — three KPI cards.
 *
 * Slots:
 *  - title (text, role h1)   optional
 *  - stat1 (stat)            required
 *  - stat2 (stat)            required
 *  - stat3 (stat)            required
 *  - note  (text, role caption) optional — footnote / source
 */

import type { CSSProperties, ReactNode } from 'react';
import type { Block, LayoutComponent, LayoutComponentProps, StatBlock } from '../types';
import { isStat } from '../types';
import { registerLayout } from './index';
import { CHROME_TOP_INSET, SlotText, detectDirection } from './_helpers';

function trendGlyph(trend?: StatBlock['trend']): ReactNode {
  if (!trend || trend === 'flat') return null;
  return (
    <span
      aria-hidden
      style={{
        color: 'var(--deck-accent)',
        fontSize: '0.5em',
        marginInlineStart: 12,
        verticalAlign: 'middle',
      }}
    >
      {trend === 'up' ? '↑' : '↓'}
    </span>
  );
}

function StatCard({ block, mode }: { block: Block | undefined; mode: LayoutComponentProps['mode'] }) {
  const cardStyle: CSSProperties = {
    background: 'var(--deck-bg-card)',
    border: '1px solid var(--deck-border-subtle)',
    borderRadius: 'var(--deck-radius, 16px)',
    boxShadow: 'var(--deck-shadow)',
    padding: 'var(--deck-pad-y, 32px) var(--deck-pad-x, 32px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 280,
    gap: 16,
  };

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
        }}
      >
        Click to add a stat
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div className="deck-display" style={{ color: 'var(--deck-color-h1)' }}>
        {block.value}
        {trendGlyph(block.trend)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="deck-h4" style={{ display: 'block' }}>
          {block.label}
        </span>
        {block.caption && (
          <span className="deck-caption" style={{ display: 'block' }}>
            {block.caption}
          </span>
        )}
      </div>
    </div>
  );
}

const Stats3: LayoutComponent = (props: LayoutComponentProps) => {
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
        hint="Slide title (optional)"
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--deck-gap, 32px)',
          flex: 1,
          minHeight: 0,
        }}
      >
        <StatCard block={blocks.stat1} mode={mode} />
        <StatCard block={blocks.stat2} mode={mode} />
        <StatCard block={blocks.stat3} mode={mode} />
      </div>
      <SlotText
        block={blocks.note}
        roleClass="deck-caption"
        mode={mode}
        as="span"
        hint="Source / footnote"
      />
    </div>
  );
};

export default Stats3;

registerLayout('stats-3', Stats3);
