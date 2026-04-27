/**
 * PageChrome — the small wordmark · section · page-number row pinned
 * at the top of every slide. Reads chrome-pad tokens for positioning
 * (density-aware) and uses the brand wordmark.
 *
 * Pure presentational — no state, no theme drilldown beyond the
 * inherited CSS vars set by `<DeckThemeProvider>`.
 */

import type { CSSProperties } from 'react';

interface Props {
  brandWordmark?: string;       // text, e.g. "uniex"
  section?: string;
  pageNum: number;
  total: number;
  /** 'flood' / 'dark' / 'light' — flood/dark switch ink to white-ish. */
  variant?: 'light' | 'dark' | 'flood';
  /** RTL direction for the section label. */
  rtl?: boolean;
}

export function PageChrome({
  brandWordmark,
  section,
  pageNum,
  total,
  variant = 'light',
  rtl = false,
}: Props) {
  const isDark = variant !== 'light';
  const wordmarkColor: CSSProperties['color'] = isDark ? '#fff' : undefined;
  const muted: CSSProperties['color'] = isDark ? 'rgba(255,255,255,0.7)' : undefined;
  const ruleColor = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,21,99,0.10)';
  const pillBorder = isDark
    ? 'rgba(255,255,255,0.22)'
    : 'var(--deck-border-subtle, rgba(0,21,99,0.18))';
  const slashColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,21,99,0.35)';

  const direction: CSSProperties['direction'] = rtl ? 'rtl' : undefined;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 'var(--deck-chrome-pad-y, 64px)',
          left: 'var(--deck-chrome-pad-x, 96px)',
          right: 'var(--deck-chrome-pad-x, 96px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 5,
        }}
      >
        {brandWordmark && (
          <span
            className="deck-label"
            style={{
              color: wordmarkColor,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: 999,
                background: 'var(--deck-accent)',
                marginRight: 8,
                flexShrink: 0,
              }}
            />
            {brandWordmark}
          </span>
        )}
        {section && (
          <span
            className="deck-caption"
            style={{
              direction,
              fontWeight: 600,
              color: muted,
              textAlign: rtl ? 'right' : undefined,
              padding: '4px 12px',
              border: `1px solid ${pillBorder}`,
              borderRadius: 999,
              lineHeight: 1.4,
            }}
          >
            {section}
          </span>
        )}
        <span
          className="deck-caption"
          style={{
            fontVariantNumeric: 'tabular-nums',
            color: muted,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>{String(pageNum).padStart(2, '0')}</span>
          <span style={{ opacity: 0.4, color: slashColor }}>/</span>
          <span style={{ opacity: 0.7 }}>{String(total).padStart(2, '0')}</span>
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 'var(--deck-chrome-pad-x, 96px)',
          right: 'var(--deck-chrome-pad-x, 96px)',
          top: 'calc(var(--deck-chrome-pad-y, 64px) + 24px)',
          height: 1,
          background: ruleColor,
          // Fade out at the edges for a more deliberate hairline.
          maskImage:
            'linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)',
          zIndex: 5,
        }}
      />
    </>
  );
}
