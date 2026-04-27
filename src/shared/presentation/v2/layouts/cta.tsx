/**
 * Cta layout — closing slide with brand-color flood and 1–2 buttons.
 *
 * Editorial composition:
 *   - Full-bleed accent flood with a subtle radial highlight in TR.
 *   - Decorative GIANT slide-number watermark (low opacity white) in
 *     the BR corner of the flood.
 *   - Tag label above title with white accent rule.
 *   - MASSIVE display title (centered) at ~6rem.
 *   - Subtitle in deck-h3 below.
 *   - Two pill-style buttons (primary white-fill, secondary outlined).
 *   - URL caption in monospace below buttons.
 *   - Diagonal accent overlay (very subtle) gives texture to the flood.
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps } from '../types';
import { isText } from '../types';
import {
  CHROME_TOP_INSET,
  SlotText,
  detectDirection,
  isEmptyText,
} from './_helpers';
import { registerLayout } from './registry';

const Cta: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId, index } = props;
  const direction = detectDirection(blocks);

  const primaryEmpty = isEmptyText(blocks.primary);
  const secondaryEmpty = isEmptyText(blocks.secondary);
  const tagEmpty = isEmptyText(blocks.tag);
  const primaryText = isText(blocks.primary) ? blocks.primary.text : '';
  const secondaryText = isText(blocks.secondary)
    ? blocks.secondary.text
    : '';
  const urlText = isText(blocks.primaryUrl) ? blocks.primaryUrl.text : '';

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'var(--deck-accent)',
    color: 'var(--deck-color-onAccent, #fff)',
    overflow: 'hidden',
    direction,
  };

  const buttonBase: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '20px 40px',
    borderRadius: 999,
    minWidth: 220,
    fontWeight: 700,
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
    cursor: 'pointer',
  };

  const padded = String(index).padStart(2, '0');

  return (
    <div style={wrapper}>
      {/* Diagonal subtle highlight */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.10) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Massive watermark numeral in BR */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: '-3%',
          bottom: '-12%',
          fontFamily: 'var(--deck-font-display)',
          fontWeight: 800,
          fontSize: '38rem',
          lineHeight: 0.85,
          color: 'rgba(255,255,255,0.08)',
          letterSpacing: '-0.06em',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {padded}
      </span>

      {/* Decorative arrow shape in TR */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: 64,
          top: 64 + CHROME_TOP_INSET / 2,
          width: 120,
          height: 120,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 48,
          fontWeight: 800,
          fontFamily: 'var(--deck-font-display)',
        }}
      >
        →
      </span>

      <div
        style={{
          position: 'absolute',
          inset: `${CHROME_TOP_INSET}px 0 0 0`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          textAlign: 'center',
          padding: '0 8%',
          zIndex: 1,
        }}
      >
        {(!tagEmpty || mode === 'edit') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              justifyContent: 'center',
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 36,
                height: 2,
                background: 'currentColor',
                opacity: 0.65,
                borderRadius: 999,
              }}
            />
            <SlotText
              slideId={slideId}
              slot="tag"
              block={blocks.tag}
              roleClass="deck-label"
              mode={mode}
              as="span"
              hint="GET STARTED"
              style={{
                color: 'inherit',
                opacity: 0.9,
                letterSpacing: '0.22em',
              }}
            />
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 36,
                height: 2,
                background: 'currentColor',
                opacity: 0.65,
                borderRadius: 999,
              }}
            />
          </div>
        )}

        <SlotText
          slideId={slideId}
          slot="title"
          block={blocks.title}
          roleClass="deck-display"
          mode={mode}
          as="h1"
          hint="CTA headline"
          align="center"
          style={{
            color: 'inherit',
            maxWidth: 1500,
            letterSpacing: '-0.025em',
            lineHeight: 0.96,
          }}
        />

        <SlotText
          slideId={slideId}
          slot="subtitle"
          block={blocks.subtitle}
          roleClass="deck-h3"
          mode={mode}
          as="p"
          hint="Optional subtitle"
          align="center"
          style={{
            color: 'inherit',
            opacity: 0.88,
            maxWidth: 1100,
            fontWeight: 400,
          }}
        />

        <div
          style={{
            display: 'flex',
            gap: 18,
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: 18,
          }}
        >
          {(!primaryEmpty || mode === 'edit') && (
            <span
              className="deck-label"
              style={{
                ...buttonBase,
                background: 'var(--deck-color-onAccent, #fff)',
                color: 'var(--deck-accent)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                letterSpacing: '0.16em',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow =
                  '0 12px 32px rgba(0,0,0,0.22)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 8px 24px rgba(0,0,0,0.18)';
              }}
            >
              {primaryText || (mode === 'edit' ? 'PRIMARY' : '')}
              <span aria-hidden style={{ fontSize: '1.05em' }}>
                →
              </span>
            </span>
          )}

          {(!secondaryEmpty || mode === 'edit') && (
            <span
              className="deck-label"
              style={{
                ...buttonBase,
                background: 'transparent',
                color: 'var(--deck-color-onAccent, #fff)',
                border: '2px solid var(--deck-color-onAccent, #fff)',
                letterSpacing: '0.16em',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {secondaryText || (mode === 'edit' ? 'SECONDARY' : '')}
            </span>
          )}
        </div>

        {urlText && (
          <span
            className="deck-caption"
            style={{
              color: 'inherit',
              opacity: 0.85,
              fontVariantNumeric: 'tabular-nums',
              marginTop: 4,
            }}
          >
            {urlText}
          </span>
        )}
      </div>
    </div>
  );
};

export default Cta;

registerLayout('cta', Cta);
