/**
 * TeamGrid layout — circular headshots with name + role.
 *
 * Slots:
 *  - title       (text, role h1)    required
 *  - intro       (text, role body)  optional
 *  - member1..member6     (image)         headshot
 *  - member1Name..6Name   (text, role h4) display name
 *  - member1Role..6Role   (text, role caption) title / role
 *
 * Slot-discovery choice:
 *   Following the same pattern as stats-grid — three parallel keys per
 *   member: `member{N}` (image), `member{N}Name` (text), `member{N}Role`
 *   (text). We scan member1..memberMAX, and render a tile for any slot
 *   that has at least one of (image, name, role) populated. Default
 *   max is 6.
 */

import type { CSSProperties } from 'react';
import type { Block, LayoutComponent, LayoutComponentProps } from '../types';
import { isText } from '../types';
import {
  CHROME_TOP_INSET,
  SlotImage,
  SlotText,
  detectDirection,
  isEmptyImage,
  isEmptyText,
} from './_helpers';
import { registerLayout } from './index';

const MAX_MEMBERS = 6;

interface Member {
  n: number;
  imageBlock: Block | undefined;
  nameBlock: Block | undefined;
  roleBlock: Block | undefined;
  empty: boolean;
}

function collectMembers(blocks: Record<string, Block>): Member[] {
  const out: Member[] = [];
  for (let i = 1; i <= MAX_MEMBERS; i++) {
    const imageBlock = blocks[`member${i}`];
    const nameBlock = blocks[`member${i}Name`];
    const roleBlock = blocks[`member${i}Role`];
    const empty =
      isEmptyImage(imageBlock) &&
      isEmptyText(nameBlock) &&
      isEmptyText(roleBlock);
    out.push({ n: i, imageBlock, nameBlock, roleBlock, empty });
  }
  return out;
}

const TeamGrid: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode } = props;
  const direction = detectDirection(blocks);
  const members = collectMembers(blocks);

  const visible =
    mode === 'edit' ? members : members.filter((m) => !m.empty);

  const wrapper: CSSProperties = {
    position: 'absolute',
    inset: `${CHROME_TOP_INSET}px 0 0 0`,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--deck-gap, 32px)',
    direction,
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
      <SlotText
        block={blocks.intro}
        roleClass="deck-body"
        mode={mode}
        as="p"
        hint="Optional intro"
        style={{ maxWidth: 1100 }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--deck-gap, 32px)',
          flex: 1,
          minHeight: 0,
          marginTop: 8,
        }}
      >
        {visible.map(({ n, imageBlock, nameBlock, roleBlock }) => (
          <div
            key={n}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'var(--deck-bg-card)',
                border: '1px solid var(--deck-border-subtle)',
              }}
            >
              <SlotImage
                block={imageBlock}
                mode={mode}
                shape="circle"
                hint="Headshot"
                style={{ position: 'static', borderRadius: '50%' }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                textAlign: 'center',
              }}
            >
              <SlotText
                block={nameBlock}
                roleClass="deck-h4"
                mode={mode}
                as="span"
                hint="Member name"
              />
              <SlotText
                block={roleBlock}
                roleClass="deck-caption"
                mode={mode}
                as="span"
                hint="Role"
                style={{
                  color:
                    isText(roleBlock) && roleBlock.color
                      ? undefined
                      : 'var(--deck-color-caption)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamGrid;

registerLayout('team-grid', TeamGrid);
