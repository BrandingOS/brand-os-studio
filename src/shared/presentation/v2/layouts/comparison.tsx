/**
 * Comparison layout — two columns side by side.
 *
 * Editorial composition:
 *   - Section label + title at top.
 *   - Two cards (left + right):
 *       · Left  : transparent + thin border (suggestion: "current / before").
 *       · Right : elevated card-bg + shadow (suggestion: "us / after").
 *       · Each card carries: column label (small caps, accent for right
 *         and muted for left) + bullets list with custom marker.
 *   - Center connector: circular "VS" badge with accent ring.
 *   - Hairline vertical connector behind the badge.
 *   - Verdict row at bottom — full-width caption with leading + trailing
 *     accent rules.
 *   - Decorative slide-number watermark.
 *
 * Slots:
 *  - label      (text, role label) optional
 *  - title      (text, role h1)    required
 *  - leftLabel  (text, role label) required
 *  - leftBody   (list, role body)  required
 *  - rightLabel (text, role label) required
 *  - rightBody  (list, role body)  required
 *  - verdict    (text, role body)  optional
 */

import type { CSSProperties } from 'react';
import type { Block, LayoutComponent, LayoutComponentProps, ListBlock } from '../types';
import { isList, isText } from '../types';
import {
  AccentRule,
  CHROME_TOP_INSET,
  LabelWithRule,
  NumeralWatermark,
  SlotText,
  detectDirection,
} from './_helpers';
import { registerLayout } from './registry';

function ComparisonList({
  block,
  mode,
  highlight,
  hint,
}: {
  block: Block | undefined;
  mode: LayoutComponentProps['mode'];
  highlight: boolean;
  hint: string;
}) {
  // Body slot may be either a list or a text block — support both.
  if (isText(block) && block.text.trim().length > 0) {
    return (
      <p
        className="deck-body"
        style={{
          margin: 0,
          opacity: 0.92,
          lineHeight: 1.55,
          whiteSpace: 'pre-line',
        }}
      >
        {block.text}
      </p>
    );
  }

  const list: ListBlock | undefined = isList(block) ? block : undefined;

  if (!list || list.items.length === 0) {
    if (mode !== 'edit') return null;
    return (
      <div
        className="deck-body"
        style={{
          opacity: 0.55,
          outline: '1.5px dashed var(--deck-border-subtle)',
          outlineOffset: 4,
          borderRadius: 6,
          padding: '8px 12px',
        }}
      >
        {hint}
      </div>
    );
  }

  return (
    <ul
      className="deck-body"
      style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {list.items.map((item, i) => (
        <li
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            lineHeight: 1.5,
          }}
        >
          {highlight ? (
            <span
              aria-hidden
              style={{
                color: 'var(--deck-accent)',
                fontSize: '1.05em',
                fontWeight: 700,
                flexShrink: 0,
                lineHeight: 1.4,
              }}
            >
              ✓
            </span>
          ) : (
            <span
              aria-hidden
              style={{
                color: 'var(--deck-color-caption)',
                fontSize: '1em',
                fontWeight: 700,
                flexShrink: 0,
                lineHeight: 1.4,
              }}
            >
              ×
            </span>
          )}
          <span style={{ flex: 1 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const Comparison: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId, index } = props;
  const direction = detectDirection(blocks);

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    direction,
  };

  const colBase: CSSProperties = {
    padding: '28px 30px 30px',
    borderRadius: 'var(--deck-radius, 16px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
    transition: 'transform 0.18s ease',
  };

  const leftCol: CSSProperties = {
    ...colBase,
    background: 'transparent',
    border:
      '1px solid color-mix(in srgb, var(--deck-color-caption) 40%, transparent)',
  };
  const rightCol: CSSProperties = {
    ...colBase,
    background: 'var(--deck-bg-card)',
    border: '1px solid var(--deck-border-subtle)',
    boxShadow: 'var(--deck-shadow)',
    borderInlineStart:
      '4px solid color-mix(in srgb, var(--deck-accent) 80%, transparent)',
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
          hint="COMPARISON"
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 1fr',
            gap: 16,
            flex: 1,
            minHeight: 0,
            alignItems: 'stretch',
            marginTop: 6,
          }}
        >
          <div
            style={leftCol}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <SlotText
              slideId={slideId}
              slot="leftLabel"
              block={blocks.leftLabel}
              roleClass="deck-label"
              mode={mode}
              as="span"
              hint="LEFT LABEL"
              style={{
                color: 'var(--deck-color-caption)',
                letterSpacing: '0.18em',
              }}
            />
            <ComparisonList
              block={blocks.leftBody}
              mode={mode}
              highlight={false}
              hint="Left bullet points"
            />
          </div>

          {/* Center "VS" connector */}
          <div
            aria-hidden
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '10% auto 10% 50%',
                transform: 'translateX(-50%)',
                width: 1,
                background:
                  'color-mix(in srgb, var(--deck-accent) 20%, transparent)',
              }}
            />
            <span
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--deck-bg-page)',
                border: '2px solid var(--deck-accent)',
                color: 'var(--deck-accent)',
                fontFamily: 'var(--deck-font-display)',
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: '0.06em',
              }}
            >
              VS
            </span>
          </div>

          <div
            style={rightCol}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <SlotText
              slideId={slideId}
              slot="rightLabel"
              block={blocks.rightLabel}
              roleClass="deck-label"
              mode={mode}
              as="span"
              hint="RIGHT LABEL"
              style={{
                color: 'var(--deck-accent)',
                letterSpacing: '0.18em',
              }}
            />
            <ComparisonList
              block={blocks.rightBody}
              mode={mode}
              highlight
              hint="Right bullet points"
            />
          </div>
        </div>

        {/* Verdict line with flanking accent rules */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            justifyContent: 'center',
            maxWidth: 1300,
            alignSelf: 'center',
            marginTop: 4,
          }}
        >
          <AccentRule width={48} height={2} style={{ opacity: 0.7 }} />
          <SlotText
            slideId={slideId}
            slot="verdict"
            block={blocks.verdict}
            roleClass="deck-body"
            mode={mode}
            as="p"
            hint="Verdict (optional)"
            align="center"
            style={{
              fontStyle: 'italic',
              opacity: 0.85,
              flex: 1,
              maxWidth: 1100,
            }}
          />
          <AccentRule width={48} height={2} style={{ opacity: 0.7 }} />
        </div>
      </div>
    </div>
  );
};

export default Comparison;

registerLayout('comparison', Comparison);
