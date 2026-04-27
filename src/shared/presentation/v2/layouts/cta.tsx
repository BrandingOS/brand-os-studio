/**
 * Cta layout — closing slide with brand-color flood and 1–2 buttons.
 *
 * Slots:
 *  - title       (text, role display)  required
 *  - subtitle    (text, role h3)       optional
 *  - primary     (text, role label)    required — primary button label
 *  - primaryUrl  (text, role caption)  optional — pseudo-link shown
 *  - secondary   (text, role label)    optional — secondary button label
 *
 * Background uses `var(--deck-accent)` for the flood. Text colors are
 * forced to readable on-accent values via the `--deck-color-onAccent`
 * token if present, otherwise white.
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
  const { blocks, mode } = props;
  const direction = detectDirection(blocks);

  const primaryEmpty = isEmptyText(blocks.primary);
  const secondaryEmpty = isEmptyText(blocks.secondary);
  const primaryText = isText(blocks.primary) ? blocks.primary.text : '';
  const secondaryText = isText(blocks.secondary)
    ? blocks.secondary.text
    : '';
  const urlText = isText(blocks.primaryUrl) ? blocks.primaryUrl.text : '';

  // Reserve a band that covers the whole slide. The chrome row sits on
  // top of this; we still respect CHROME_TOP_INSET so chrome text remains
  // legible against the accent flood.
  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(135deg, var(--deck-accent), var(--deck-accent))',
    color: 'var(--deck-color-onAccent, #fff)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: CHROME_TOP_INSET,
    gap: 32,
    textAlign: 'center',
    direction,
  };

  const buttonBase: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 36px',
    borderRadius: 999,
    minWidth: 240,
    textTransform: 'uppercase',
    letterSpacing: 0,
  };

  return (
    <div style={wrapper}>
      <SlotText
        block={blocks.title}
        roleClass="deck-display"
        mode={mode}
        as="h1"
        hint="CTA headline"
        style={{ color: 'inherit', maxWidth: 1500 }}
      />
      <SlotText
        block={blocks.subtitle}
        roleClass="deck-h3"
        mode={mode}
        as="p"
        hint="Optional subtitle"
        style={{
          color: 'inherit',
          opacity: 0.85,
          maxWidth: 1100,
        }}
      />

      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: 12,
        }}
      >
        {!primaryEmpty || mode === 'edit' ? (
          <span
            className="deck-label"
            style={{
              ...buttonBase,
              background: 'var(--deck-color-onAccent, #fff)',
              color: 'var(--deck-accent)',
              fontWeight: 700,
            }}
          >
            {primaryText || (mode === 'edit' ? 'PRIMARY' : '')}
          </span>
        ) : null}

        {!secondaryEmpty || mode === 'edit' ? (
          <span
            className="deck-label"
            style={{
              ...buttonBase,
              background: 'transparent',
              color: 'var(--deck-color-onAccent, #fff)',
              border: '2px solid var(--deck-color-onAccent, #fff)',
            }}
          >
            {secondaryText || (mode === 'edit' ? 'SECONDARY' : '')}
          </span>
        ) : null}
      </div>

      {urlText && (
        <span
          className="deck-caption"
          style={{
            color: 'inherit',
            opacity: 0.85,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {urlText}
        </span>
      )}
    </div>
  );
};

export default Cta;

registerLayout('cta', Cta);
