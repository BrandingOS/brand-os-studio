/**
 * Comparison layout — two columns side by side, optional verdict.
 *
 * Slots:
 *  - title      (text, role h1)    required
 *  - leftLabel  (text, role label) required
 *  - leftBody   (list, role body)  required
 *  - rightLabel (text, role label) required
 *  - rightBody  (list, role body)  required
 *  - verdict    (text, role body)  optional
 *
 * Right column is highlighted with the brand-card surface to suggest
 * "this side wins / current state / Us vs. Them".
 */

import type { CSSProperties } from 'react';
import type { Block, LayoutComponent, LayoutComponentProps, ListBlock } from '../types';
import { isList } from '../types';
import {
  CHROME_TOP_INSET,
  SlotText,
  detectDirection,
} from './_helpers';
import { registerLayout } from './registry';

function ComparisonList({
  block,
  mode,
  hint,
}: {
  block: Block | undefined;
  mode: LayoutComponentProps['mode'];
  hint: string;
}) {
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
        gap: 12,
      }}
    >
      {list.items.map((item, i) => (
        <li
          key={i}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'var(--deck-accent)',
              marginTop: '0.6em',
              flexShrink: 0,
            }}
          />
          <span style={{ flex: 1 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const Comparison: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId } = props;
  const direction = detectDirection(blocks);

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: `${CHROME_TOP_INSET}px 0 0 0`,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--deck-gap, 32px)',
    direction,
  };

  const colBase: CSSProperties = {
    padding: '24px 28px',
    borderRadius: 'var(--deck-radius, 16px)',
    border: '1px solid var(--deck-border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
  };

  const leftCol: CSSProperties = {
    ...colBase,
    background: 'transparent',
  };
  const rightCol: CSSProperties = {
    ...colBase,
    background: 'var(--deck-bg-card)',
    boxShadow: 'var(--deck-shadow)',
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2px 1fr',
          gap: 'var(--deck-gap, 24px)',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div style={leftCol}>
          <SlotText
            slideId={slideId}
            slot="leftLabel"
            block={blocks.leftLabel}
            roleClass="deck-label"
            mode={mode}
            as="span"
            hint="LEFT LABEL"
            style={{ color: 'var(--deck-color-label)' }}
          />
          <ComparisonList
            block={blocks.leftBody}
            mode={mode}
            hint="Left bullet points"
          />
        </div>
        <div
          aria-hidden
          style={{
            background: 'var(--deck-border-subtle)',
            width: 2,
            alignSelf: 'stretch',
            borderRadius: 999,
          }}
        />
        <div style={rightCol}>
          <SlotText
            slideId={slideId}
            slot="rightLabel"
            block={blocks.rightLabel}
            roleClass="deck-label"
            mode={mode}
            as="span"
            hint="RIGHT LABEL"
            style={{ color: 'var(--deck-accent)' }}
          />
          <ComparisonList
            block={blocks.rightBody}
            mode={mode}
            hint="Right bullet points"
          />
        </div>
      </div>
      <SlotText
        slideId={slideId}
        slot="verdict"
        block={blocks.verdict}
        roleClass="deck-body"
        mode={mode}
        as="p"
        hint="Verdict (optional)"
        style={{ textAlign: 'center', maxWidth: 1200, alignSelf: 'center' }}
      />
    </div>
  );
};

export default Comparison;

registerLayout('comparison', Comparison);
