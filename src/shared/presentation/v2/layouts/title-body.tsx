/**
 * TitleBody layout — standard text slide with editorial polish.
 *
 * Composition:
 *   - Asymmetric grid: title takes ~60% leading, body flows below.
 *   - Section label with accent rule above title.
 *   - Body has a leading accent stripe (vertical 2px line) suggesting
 *     a pull-quote / editorial column.
 *   - Decorative slide-number watermark in the trailing-top corner.
 *
 * Slots:
 *  - label (text, role label)  optional
 *  - title (text, role h1)     required
 *  - body  (text, role body)   required
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
  isEmptyText,
} from './_helpers';

const TitleBody: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId, index } = props;
  const direction = detectDirection(blocks);
  const bodyEmpty = isEmptyText(blocks.body);

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    direction,
  };

  return (
    <div style={wrapper}>
      {/* Watermark numeral in TR */}
      <NumeralWatermark
        index={index}
        size={18}
        opacity={0.05}
        style={{ right: '5%', top: '14%' }}
      />

      <div
        style={{
          position: 'absolute',
          inset: `${CHROME_TOP_INSET}px 0 0 0`,
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr',
          gap: 28,
          alignContent: 'center',
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
          style={{
            maxWidth: '85%',
            letterSpacing: '-0.02em',
            lineHeight: 1.04,
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 24,
            maxWidth: 1100,
            marginTop: 4,
          }}
        >
          {/* Leading vertical accent stripe */}
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              flexShrink: 0,
              width: 2,
              alignSelf: 'stretch',
              minHeight: 80,
              background: 'var(--deck-accent)',
              borderRadius: 999,
              opacity: 0.85,
              marginTop: 8,
            }}
          />
          <SlotText
            slideId={slideId}
            slot="body"
            block={blocks.body}
            roleClass="deck-body"
            mode={mode}
            as="p"
            hint="Body copy goes here…"
            style={{
              flex: 1,
              maxWidth: 980,
              opacity: bodyEmpty ? 0.55 : 0.92,
              lineHeight: 1.55,
            }}
          />
        </div>

        <AccentRule
          width={48}
          height={3}
          style={{ marginTop: 12, opacity: 0.7 }}
        />
      </div>
    </div>
  );
};

export default TitleBody;

registerLayout('title-body', TitleBody);
