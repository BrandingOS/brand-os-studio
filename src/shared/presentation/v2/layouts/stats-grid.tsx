/**
 * StatsGrid layout — N KPI tiles in a wrapping grid.
 *
 * Editorial composition:
 *   - Section label + title at top.
 *   - Tiles in a 2- or 3-column grid (depending on count).
 *   - Tiles alternate visual rhythm:
 *       · Even tiles: solid card background.
 *       · Odd tiles : transparent + thicker accent border-leading edge.
 *   - Each tile shows: value (massive, accent), label (h4), caption.
 *   - Tiny ordinal numeral in TR corner of each tile.
 *   - Hover lift.
 *
 * Slot-discovery: scan `blocks` for keys matching /^stat\d+$/ and sort
 * by trailing number. Up to 6 stats render in 3 columns; 4+ render in
 * 2 columns when fewer; 1–2 render single-row.
 *
 * Slots:
 *  - label   (text, role label)  optional
 *  - title   (text, role h1)     required
 *  - stat1..N (stat)             auto-discovered
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps, StatBlock } from '../types';
import { isStat } from '../types';
import { registerLayout } from './registry';
import {
  CHROME_TOP_INSET,
  LabelWithRule,
  NumeralWatermark,
  SlotText,
  detectDirection,
} from './_helpers';

const STAT_KEY = /^stat(\d+)$/;

function collectStats(
  blocks: Record<string, unknown>,
): Array<{ key: string; stat: StatBlock; n: number }> {
  const out: Array<{ key: string; stat: StatBlock; n: number }> = [];
  for (const key of Object.keys(blocks)) {
    const m = STAT_KEY.exec(key);
    if (!m) continue;
    const value = blocks[key];
    if (isStat(value as never)) {
      out.push({ key, stat: value as StatBlock, n: Number(m[1]) });
    }
  }
  out.sort((a, b) => a.n - b.n);
  return out;
}

const StatsGrid: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId, index } = props;
  const direction = detectDirection(blocks);
  const stats = collectStats(blocks as unknown as Record<string, unknown>);

  const cols = stats.length >= 5 ? 3 : Math.max(1, Math.min(stats.length, 2));

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
          gap: 22,
        }}
      >
        <LabelWithRule
          slideId={slideId}
          slot="label"
          block={blocks.label}
          mode={mode}
          hint="BY THE NUMBERS"
        />

        <SlotText
          slideId={slideId}
          slot="title"
          block={blocks.title}
          roleClass="deck-h1"
          mode={mode}
          as="h1"
          hint="Slide title"
          style={{ letterSpacing: '-0.02em', lineHeight: 1.04 }}
        />

        {stats.length === 0 && mode === 'edit' ? (
          <div
            style={{
              border: '1.5px dashed var(--deck-border-subtle)',
              borderRadius: 'var(--deck-radius, 16px)',
              padding: 48,
              textAlign: 'center',
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
            {stats.map(({ key, stat, n }, idx) => {
              const filled = idx % 2 === 0;
              const tileStyle: CSSProperties = {
                position: 'relative',
                background: filled
                  ? 'var(--deck-bg-card)'
                  : 'transparent',
                border: filled
                  ? '1px solid var(--deck-border-subtle)'
                  : '1px solid color-mix(in srgb, var(--deck-accent) 22%, transparent)',
                boxShadow: filled ? 'var(--deck-shadow)' : 'none',
                borderRadius: 'var(--deck-radius, 16px)',
                padding: '28px 28px 24px',
                paddingInlineStart: filled ? 28 : 32,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                minHeight: 180,
                overflow: 'hidden',
                transition: 'transform 0.18s ease',
              };

              return (
                <div
                  key={key}
                  style={tileStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Leading accent stripe on odd tiles */}
                  {!filled && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        insetInlineStart: 0,
                        top: '12%',
                        bottom: '12%',
                        width: 3,
                        background: 'var(--deck-accent)',
                        borderRadius: 999,
                      }}
                    />
                  )}

                  {/* TR ordinal */}
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      right: 18,
                      top: 14,
                      fontFamily: 'var(--deck-font-label)',
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      color: 'var(--deck-accent)',
                      opacity: 0.5,
                    }}
                  >
                    {String(n).padStart(2, '0')}
                  </span>

                  <span
                    style={{
                      fontFamily: 'var(--deck-font-display)',
                      fontWeight: 800,
                      fontSize: 'min(5rem, calc(var(--deck-text-h1, 56px) * 1.5))',
                      lineHeight: 0.95,
                      color: 'var(--deck-accent)',
                      letterSpacing: '-0.03em',
                      marginTop: 14,
                    }}
                  >
                    {stat.value}
                  </span>

                  <span
                    className="deck-h4"
                    style={{ display: 'block', letterSpacing: '-0.005em' }}
                  >
                    {stat.label}
                  </span>

                  {stat.caption && (
                    <span
                      className="deck-caption"
                      style={{ display: 'block', opacity: 0.75 }}
                    >
                      {stat.caption}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsGrid;

registerLayout('stats-grid', StatsGrid);
