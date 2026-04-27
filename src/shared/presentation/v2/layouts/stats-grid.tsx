/**
 * StatsGrid layout — N KPI tiles in a wrapping grid.
 *
 * Slots:
 *  - title  (text, role h1) required
 *  - stat1..statN (stat)    required (auto-discovered by key prefix)
 *
 * Slot-discovery choice:
 *   The Block discriminated union doesn't support a "list of stats"
 *   neatly — `ListBlock` is only string items. So we follow the pattern
 *   the spec hints at: scan `blocks` for keys matching /^stat\d+$/ and
 *   render every stat block we find, sorted by the trailing number.
 *   Layout is responsive: 3 columns when ≥ 5 stats, 2 columns otherwise.
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps, StatBlock } from '../types';
import { isStat } from '../types';
import { registerLayout } from './registry';
import { CHROME_TOP_INSET, SlotText, detectDirection } from './_helpers';

const STAT_KEY = /^stat(\d+)$/;

function collectStats(blocks: Record<string, unknown>): Array<{ key: string; stat: StatBlock }> {
  const out: Array<{ key: string; stat: StatBlock; n: number }> = [];
  for (const key of Object.keys(blocks)) {
    const m = STAT_KEY.exec(key);
    if (!m) continue;
    const value = blocks[key];
    // Keys must point to StatBlock; `isStat` accepts `Block | undefined`,
    // and any random unknown shape should be skipped, so cast through
    // the type guard.
    if (isStat(value as never)) {
      out.push({ key, stat: value as StatBlock, n: Number(m[1]) });
    }
  }
  out.sort((a, b) => a.n - b.n);
  return out.map(({ key, stat }) => ({ key, stat }));
}

const StatsGrid: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId } = props;
  const direction = detectDirection(blocks);
  const stats = collectStats(blocks as unknown as Record<string, unknown>);

  const cols = stats.length >= 5 ? 3 : Math.max(1, Math.min(stats.length, 2));

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: `${CHROME_TOP_INSET}px 0 0 0`,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--deck-gap, 32px)',
    direction,
  };

  const tileStyle: CSSProperties = {
    background: 'var(--deck-bg-card)',
    border: '1px solid var(--deck-border-subtle)',
    borderRadius: 'var(--deck-radius, 16px)',
    boxShadow: 'var(--deck-shadow)',
    padding: '24px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 160,
  };

  return (
    <div style={wrapper}>
      <SlotText
        slideId={slideId}
        slot="title"
        block={blocks.title}
        roleClass="deck-h1"
        mode={mode}
        as="h1"
        hint="Slide title"
      />
      {stats.length === 0 && mode === 'edit' ? (
        <div
          style={{
            ...tileStyle,
            borderStyle: 'dashed',
            background: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--deck-color-caption)',
            fontFamily: 'var(--deck-font-caption)',
            fontSize: 14,
          }}
        >
          Add stat blocks (stat1, stat2, …)
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 'var(--deck-gap, 24px)',
            flex: 1,
            minHeight: 0,
            alignContent: 'start',
          }}
        >
          {stats.map(({ key, stat }) => (
            <div key={key} style={tileStyle}>
              <span
                className="deck-h1"
                style={{ color: 'var(--deck-color-h1)' }}
              >
                {stat.value}
              </span>
              <span className="deck-h4" style={{ display: 'block' }}>
                {stat.label}
              </span>
              {stat.caption && (
                <span className="deck-caption" style={{ display: 'block' }}>
                  {stat.caption}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatsGrid;

registerLayout('stats-grid', StatsGrid);
