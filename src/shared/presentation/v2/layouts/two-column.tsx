/**
 * TwoColumn layout — title with two card columns below.
 *
 * Editorial composition:
 *   - Title row with section label + accent rule.
 *   - Two cards with elevated background, rounded corners, soft shadow.
 *   - Each card carries:
 *       · Numeric corner (01 / 02) in deck-label style + accent color.
 *       · "PART 01" / "PART 02" small-caps label above the title.
 *       · Card-level accent rule (32×3 px) above the body.
 *   - Hover lift on each card (CSS transition).
 *   - Decorative slide-number watermark in TR.
 *
 * Slots:
 *  - label      (text, role label)  optional
 *  - title      (text, role h1)     required
 *  - leftTitle  (text, role h3)     required
 *  - leftBody   (text, role body)   required
 *  - rightTitle (text, role h3)     required
 *  - rightBody  (text, role body)   required
 */

import type { CSSProperties } from 'react';
import type { LayoutComponent, LayoutComponentProps } from '../types';
import { registerLayout } from './registry';
import {
  AccentRule,
  CHROME_TOP_INSET,
  LabelWithRule,
  NumeralWatermark,
  SlotText,
  detectDirection,
} from './_helpers';

interface CardProps {
  slideId: string;
  numeralSlot: '01' | '02';
  partLabel: string;
  titleSlot: string;
  bodySlot: string;
  titleBlock: LayoutComponentProps['blocks'][string] | undefined;
  bodyBlock: LayoutComponentProps['blocks'][string] | undefined;
  mode: LayoutComponentProps['mode'];
}

function Card({
  slideId,
  numeralSlot,
  partLabel,
  titleSlot,
  bodySlot,
  titleBlock,
  bodyBlock,
  mode,
}: CardProps) {
  const cardStyle: CSSProperties = {
    position: 'relative',
    background: 'var(--deck-bg-card)',
    border: '1px solid var(--deck-border-subtle)',
    borderRadius: 'var(--deck-radius, 16px)',
    boxShadow: 'var(--deck-shadow)',
    padding: 'calc(var(--deck-pad-y, 32px) + 4px) var(--deck-pad-x, 32px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minWidth: 0,
    overflow: 'hidden',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  };

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
      {/* Big numeric watermark in trailing-top corner of the card */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: 22,
          top: 14,
          fontFamily: 'var(--deck-font-display)',
          fontWeight: 800,
          fontSize: '5.5rem',
          lineHeight: 0.85,
          color: 'var(--deck-accent)',
          opacity: 0.1,
          letterSpacing: '-0.04em',
        }}
      >
        {numeralSlot}
      </span>

      <span
        className="deck-label"
        style={{
          color: 'var(--deck-accent)',
          letterSpacing: '0.18em',
        }}
      >
        {partLabel}
      </span>

      <SlotText
        slideId={slideId}
        slot={titleSlot}
        block={titleBlock}
        roleClass="deck-h3"
        mode={mode}
        as="h3"
        hint={`${partLabel} title`}
      />

      <AccentRule width={32} height={3} style={{ opacity: 0.85 }} />

      <SlotText
        slideId={slideId}
        slot={bodySlot}
        block={bodyBlock}
        roleClass="deck-body"
        mode={mode}
        as="p"
        hint="Body copy"
        style={{ opacity: 0.92, lineHeight: 1.55 }}
      />
    </div>
  );
}

const TwoColumn: LayoutComponent = (props: LayoutComponentProps) => {
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
        size={16}
        opacity={0.05}
        style={{ right: '4%', top: '10%' }}
      />

      <div
        style={{
          position: 'absolute',
          inset: `${CHROME_TOP_INSET}px 0 0 0`,
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        <LabelWithRule
          slideId={slideId}
          slot="label"
          block={blocks.label}
          mode={mode}
          hint="SECTION LABEL"
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
            gridTemplateColumns: '1fr 56px 1fr',
            gap: 16,
            flex: 1,
            minHeight: 0,
            alignItems: 'stretch',
          }}
        >
          <Card
            slideId={slideId}
            numeralSlot="01"
            partLabel="PART 01"
            titleSlot="leftTitle"
            bodySlot="leftBody"
            titleBlock={blocks.leftTitle}
            bodyBlock={blocks.leftBody}
            mode={mode}
          />

          {/* Decorative connector — vertical accent line + center pill */}
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
                inset: '12% auto 12% 50%',
                transform: 'translateX(-50%)',
                width: 1,
                background:
                  'color-mix(in srgb, var(--deck-accent) 25%, transparent)',
              }}
            />
            <span
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--deck-bg-page)',
                border:
                  '2px solid color-mix(in srgb, var(--deck-accent) 60%, transparent)',
                color: 'var(--deck-accent)',
                fontFamily: 'var(--deck-font-label)',
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.08em',
              }}
            >
              +
            </span>
          </div>

          <Card
            slideId={slideId}
            numeralSlot="02"
            partLabel="PART 02"
            titleSlot="rightTitle"
            bodySlot="rightBody"
            titleBlock={blocks.rightTitle}
            bodyBlock={blocks.rightBody}
            mode={mode}
          />
        </div>
      </div>
    </div>
  );
};

export default TwoColumn;

registerLayout('two-column', TwoColumn);
