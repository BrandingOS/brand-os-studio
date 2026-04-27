/**
 * Process layout — numbered steps.
 *
 * Slots:
 *  - title       (text, role h1) required
 *  - step1..stepN     (text, role h3)  step title
 *  - step1Body..stepNBody (text, role body) step description
 *
 * Slot-discovery choice:
 *   Same parallel-keys pattern as TeamGrid. Scan step1..stepMAX. Steps
 *   layout horizontally for ≤4 steps, vertically for 5+.
 */

import type { CSSProperties } from 'react';
import type { Block, LayoutComponent, LayoutComponentProps } from '../types';
import { isText } from '../types';
import {
  CHROME_TOP_INSET,
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
  const { blocks, mode } = props;
  const direction = detectDirection(blocks);
  const all = collectSteps(blocks);
  const populated = all.filter((s) => !s.empty);
  const steps = mode === 'edit' && populated.length === 0 ? all.slice(0, 3) : populated;

  const horizontal = steps.length > 0 && steps.length <= 4;

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: `${CHROME_TOP_INSET}px 0 0 0`,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--deck-gap, 32px)',
    direction,
  };

  const cardBase: CSSProperties = {
    background: 'var(--deck-bg-card)',
    border: '1px solid var(--deck-border-subtle)',
    borderRadius: 'var(--deck-radius, 16px)',
    boxShadow: 'var(--deck-shadow)',
    padding: '24px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minWidth: 0,
  };

  return (
    <div style={wrapper}>
      <SlotText
        block={blocks.title}
        roleClass="deck-h1"
        mode={mode}
        as="h1"
        hint="Slide title"
      />

      <div
        style={{
          display: horizontal ? 'grid' : 'flex',
          gridTemplateColumns: horizontal
            ? `repeat(${Math.max(1, steps.length)}, 1fr)`
            : undefined,
          flexDirection: horizontal ? undefined : 'column',
          gap: 'var(--deck-gap, 24px)',
          flex: 1,
          minHeight: 0,
          alignItems: horizontal ? 'stretch' : 'stretch',
        }}
      >
        {steps.map(({ n, titleBlock, bodyBlock }, i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'stretch', gap: 16 }}>
            <div style={{ ...cardBase, flex: 1 }}>
              <span
                className="deck-label"
                style={{ color: 'var(--deck-accent)' }}
              >
                STEP {String(n).padStart(2, '0')}
              </span>
              <SlotText
                block={titleBlock}
                roleClass="deck-h3"
                mode={mode}
                as="h3"
                hint={`Step ${n} title`}
              />
              <SlotText
                block={bodyBlock}
                roleClass="deck-body"
                mode={mode}
                as="p"
                hint="What happens at this step"
                style={{
                  color:
                    isText(bodyBlock) && bodyBlock.color
                      ? undefined
                      : 'var(--deck-color-body)',
                }}
              />
            </div>
            {horizontal && i < steps.length - 1 && (
              <span
                aria-hidden
                style={{
                  alignSelf: 'center',
                  color: 'var(--deck-accent)',
                  fontSize: 32,
                  fontWeight: 700,
                }}
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Process;

registerLayout('process', Process);
