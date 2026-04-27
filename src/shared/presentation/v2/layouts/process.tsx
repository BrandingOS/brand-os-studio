/**
 * Process layout — numbered steps with editorial polish.
 *
 * Composition:
 *   - Section label + title at top.
 *   - Steps in a horizontal row (≤4 steps) or vertical column (5+).
 *   - Each step:
 *       · Massive numeral (display weight 800) in accent color.
 *       · Step title (h3).
 *       · Step body (caption).
 *       · Top accent rule.
 *   - Connecting "▸" arrows between steps (with accent fill).
 *   - Hover lift on each step.
 *   - Decorative slide-number watermark in TR.
 *
 * Slot-discovery: scan step1..step6.
 */

import type { CSSProperties } from 'react';
import type { Block, LayoutComponent, LayoutComponentProps } from '../types';
import { isText } from '../types';
import {
  AccentRule,
  CHROME_TOP_INSET,
  LabelWithRule,
  NumeralWatermark,
  SlotText,
  detectDirection,
  isEmptyText,
} from './_helpers';
import { registerLayout } from './registry';

const MAX_STEPS = 6;

interface Step {
  n: number;
  titleBlock: Block | undefined;
  bodyBlock: Block | undefined;
  empty: boolean;
}

function collectSteps(blocks: Record<string, Block>): Step[] {
  const out: Step[] = [];
  for (let i = 1; i <= MAX_STEPS; i++) {
    const titleBlock = blocks[`step${i}`];
    const bodyBlock = blocks[`step${i}Body`];
    const empty = isEmptyText(titleBlock) && isEmptyText(bodyBlock);
    out.push({ n: i, titleBlock, bodyBlock, empty });
  }
  return out;
}

const Process: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId, index } = props;
  const direction = detectDirection(blocks);
  const all = collectSteps(blocks);
  const populated = all.filter((s) => !s.empty);
  const steps = mode === 'edit' && populated.length === 0 ? all.slice(0, 3) : populated;

  const horizontal = steps.length > 0 && steps.length <= 4;

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
          hint="HOW IT WORKS"
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
            display: horizontal ? 'grid' : 'flex',
            gridTemplateColumns: horizontal
              ? `repeat(${Math.max(1, steps.length)}, 1fr)`
              : undefined,
            flexDirection: horizontal ? undefined : 'column',
            gap: horizontal ? 20 : 16,
            flex: 1,
            minHeight: 0,
            alignItems: 'stretch',
            marginTop: 8,
          }}
        >
          {steps.map(({ n, titleBlock, bodyBlock }, i) => {
            const cardStyle: CSSProperties = {
              position: 'relative',
              flex: 1,
              background: 'var(--deck-bg-card)',
              border: '1px solid var(--deck-border-subtle)',
              borderRadius: 'var(--deck-radius, 16px)',
              boxShadow: 'var(--deck-shadow)',
              padding: '24px 26px 22px',
              display: 'flex',
              flexDirection: horizontal ? 'column' : 'row',
              gap: horizontal ? 12 : 24,
              minWidth: 0,
              overflow: 'hidden',
              transition: 'transform 0.18s ease',
              alignItems: horizontal ? 'flex-start' : 'flex-start',
            };

            const numeral = (
              <span
                aria-hidden
                style={{
                  fontFamily: 'var(--deck-font-display)',
                  fontWeight: 800,
                  fontSize: horizontal ? '4.2rem' : '3.6rem',
                  lineHeight: 0.9,
                  color: 'var(--deck-accent)',
                  letterSpacing: '-0.04em',
                  flexShrink: 0,
                }}
              >
                {String(n).padStart(2, '0')}
              </span>
            );

            const stepBody = (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span
                  className="deck-label"
                  style={{
                    color: 'var(--deck-accent)',
                    letterSpacing: '0.18em',
                  }}
                >
                  STEP {String(n).padStart(2, '0')}
                </span>
                <SlotText
                  slideId={slideId}
                  slot={`step${n}`}
                  block={titleBlock}
                  roleClass="deck-h3"
                  mode={mode}
                  as="h3"
                  hint={`Step ${n} title`}
                />
                <AccentRule width={28} height={2} style={{ opacity: 0.85 }} />
                <SlotText
                  slideId={slideId}
                  slot={`step${n}Body`}
                  block={bodyBlock}
                  roleClass="deck-body"
                  mode={mode}
                  as="p"
                  hint="What happens at this step"
                  style={{
                    opacity: 0.92,
                    lineHeight: 1.5,
                    color:
                      isText(bodyBlock) && bodyBlock.color
                        ? undefined
                        : 'var(--deck-color-body)',
                  }}
                />
              </div>
            );

            return (
              <div
                key={n}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: 14,
                  flexShrink: 0,
                }}
              >
                <div
                  style={cardStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {numeral}
                  {stepBody}
                </div>
                {horizontal && i < steps.length - 1 && (
                  <span
                    aria-hidden
                    style={{
                      alignSelf: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background:
                        'color-mix(in srgb, var(--deck-accent) 18%, transparent)',
                      color: 'var(--deck-accent)',
                      fontSize: 18,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    ▸
                  </span>
                )}
                {!horizontal && i < steps.length - 1 && (
                  <span
                    aria-hidden
                    style={{
                      width: 2,
                      alignSelf: 'stretch',
                      background:
                        'color-mix(in srgb, var(--deck-accent) 25%, transparent)',
                      borderRadius: 999,
                      marginInline: 8,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Process;

registerLayout('process', Process);
