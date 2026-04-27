/**
 * TeamGrid layout — circular headshots with name + role.
 *
 * Editorial composition:
 *   - Section label + title + intro at top.
 *   - 3-column grid of member tiles.
 *   - Each tile:
 *       · 160px avatar circle with accent ring (hover deepens the ring).
 *       · Avatar empty state: initial in soft accent color (pulled from
 *         the member's name first letter, falls back to the ordinal).
 *       · Name in deck-h4.
 *       · Role with a 24×2 leading accent rule.
 *   - Decorative slide-number watermark in TR.
 */

import type { CSSProperties } from 'react';
import type { Block, LayoutComponent, LayoutComponentProps } from '../types';
import { isText } from '../types';
import {
  CHROME_TOP_INSET,
  LabelWithRule,
  NumeralWatermark,
  SlotImage,
  SlotText,
  detectDirection,
  isEmptyImage,
  isEmptyText,
} from './_helpers';
import { registerLayout } from './registry';

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

function avatarInitial(nameBlock: Block | undefined, n: number): string {
  if (isText(nameBlock) && nameBlock.text.trim().length > 0) {
    const ch = nameBlock.text.trim().charAt(0);
    return ch.toUpperCase();
  }
  return String(n);
}

const TeamGrid: LayoutComponent = (props: LayoutComponentProps) => {
  const { blocks, mode, slideId, index } = props;
  const direction = detectDirection(blocks);
  const members = collectMembers(blocks);

  const visible =
    mode === 'edit' ? members : members.filter((m) => !m.empty);

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
          hint="THE TEAM"
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

        <SlotText
          slideId={slideId}
          slot="intro"
          block={blocks.intro}
          roleClass="deck-body"
          mode={mode}
          as="p"
          hint="Optional intro"
          style={{ maxWidth: 1100, opacity: 0.85 }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--deck-gap, 32px)',
            flex: 1,
            minHeight: 0,
            marginTop: 12,
            alignContent: 'start',
          }}
        >
          {visible.map(({ n, imageBlock, nameBlock, roleBlock }) => {
            const avatarEmpty = isEmptyImage(imageBlock);
            return (
              <div
                key={n}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 18,
                  minWidth: 0,
                  padding: '12px 8px',
                  borderRadius: 'var(--deck-radius, 16px)',
                  transition: 'background 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  const ring = e.currentTarget.querySelector(
                    '[data-avatar-ring]',
                  ) as HTMLElement | null;
                  if (ring) {
                    ring.style.background =
                      'color-mix(in srgb, var(--deck-accent) 50%, transparent)';
                  }
                }}
                onMouseLeave={(e) => {
                  const ring = e.currentTarget.querySelector(
                    '[data-avatar-ring]',
                  ) as HTMLElement | null;
                  if (ring) {
                    ring.style.background =
                      'color-mix(in srgb, var(--deck-accent) 22%, transparent)';
                  }
                }}
              >
                <div
                  data-avatar-ring
                  style={{
                    width: 168,
                    height: 168,
                    borderRadius: '50%',
                    padding: 4,
                    background:
                      'color-mix(in srgb, var(--deck-accent) 22%, transparent)',
                    transition: 'background 0.18s ease',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'var(--deck-bg-card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {avatarEmpty ? (
                      <span
                        aria-hidden
                        style={{
                          fontFamily: 'var(--deck-font-display)',
                          fontWeight: 700,
                          fontSize: 64,
                          color: 'var(--deck-accent)',
                          opacity: 0.55,
                          letterSpacing: '-0.04em',
                        }}
                      >
                        {avatarInitial(nameBlock, n)}
                      </span>
                    ) : (
                      <SlotImage
                        slideId={slideId}
                        slot={`member${n}`}
                        block={imageBlock}
                        mode={mode}
                        shape="circle"
                        hint="Headshot"
                        style={{ position: 'static', borderRadius: '50%' }}
                      />
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    textAlign: 'center',
                  }}
                >
                  <SlotText
                    slideId={slideId}
                    slot={`member${n}Name`}
                    block={nameBlock}
                    roleClass="deck-h4"
                    mode={mode}
                    as="span"
                    hint="Member name"
                    align="center"
                  />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-block',
                        width: 18,
                        height: 2,
                        background: 'var(--deck-accent)',
                        borderRadius: 999,
                        opacity: 0.7,
                      }}
                    />
                    <SlotText
                      slideId={slideId}
                      slot={`member${n}Role`}
                      block={roleBlock}
                      roleClass="deck-caption"
                      mode={mode}
                      as="span"
                      hint="Role"
                      align="center"
                      style={{
                        color:
                          isText(roleBlock) && roleBlock.color
                            ? undefined
                            : 'var(--deck-color-caption)',
                        letterSpacing: '0.04em',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeamGrid;

registerLayout('team-grid', TeamGrid);
