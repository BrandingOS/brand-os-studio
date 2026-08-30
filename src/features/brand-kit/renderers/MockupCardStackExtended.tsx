/**
 * Business Card Stack — the card as an OBJECT, not as artwork.
 *
 * The Business Card family already draws the card's design; this one draws
 * what a box of them looks like on a desk. So the scenes are about depth
 * and pairing — a stack with one card lifted off it, front beside back,
 * three fanned, a colour-painted edge — and each card face carries only
 * what you would actually read at that size.
 *
 * Ids: `mockups-ext-27 … -32`, the middle range of the shared `mockups` id
 * space (Signage 21–26, Device Screen 33–38).
 */
import type { CSSProperties, ReactNode } from 'react';
import {
  Badge,
  CastShadow,
  DeclareRest,
  Mark,
  Primary,
  Print,
  Scene,
  SceneLight,
  Secondary,
  Url,
  accentOn,
  ink,
  mutedOn,
  withIds,
  type MockupPalette,
  type MockupScene,
} from './MockupScene';
import { typePx } from './typeFloor';

/* ── The object ───────────────────────────────────────────────────── */

/** The card's own proportion, 85×55mm, expressed as a CSS ratio. */
const CARD_RATIO = '85 / 55';

/**
 * Why every card here is positioned so that `top% + width% ≤ 90`.
 *
 * `aspectRatio` on a PERCENTAGE width resolves against the scene's width,
 * and the scene is wider than it is tall — so a card's height in percent
 * comes out at roughly its width in percent on the tile shapes this kit
 * uses (260×195 in a card, ~334×205 in the drilldown). A 76%-wide card at
 * `top: 26%` was therefore 102% tall and hung off the bottom of the frame.
 * The rule is cheap, holds for both shapes, and is why these numbers look
 * conservative.
 */

/**
 * One card. `lift` is how far off the surface it sits, which is the whole
 * difference between a stack and a pile of rectangles.
 */
function Card({
  face,
  style,
  tilt = 0,
  lift = 2,
  children,
}: {
  face: string;
  style: CSSProperties;
  tilt?: number;
  lift?: number;
  children: ReactNode;
}) {
  return (
    <Print
      bg={face}
      style={{
        aspectRatio: CARD_RATIO,
        borderRadius: 2,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        boxShadow: `0 ${lift}px ${lift * 3}px rgba(0,0,0,0.24)`,
        ...style,
      }}
    >
      {children}
    </Print>
  );
}

/**
 * The edges of the cards UNDER the top one.
 *
 * Drawn as offset slivers rather than whole cards: a stack is only ever
 * seen as its top face plus a stripe of paper edges, and drawing full
 * cards behind makes it read as a fan.
 */
function StackEdges({
  paper,
  left,
  top,
  width,
  count = 5,
  step = 0.9,
}: {
  paper: string;
  left: number;
  top: number;
  width: number;
  count?: number;
  step?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${left + (count - i) * step * 0.4}%`,
            top: `${top + (count - i) * step}%`,
            width: `${width}%`,
            aspectRatio: CARD_RATIO,
            backgroundColor: paper,
            borderRadius: 2,
            boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
          }}
        />
      ))}
    </>
  );
}

function nameStyle(p: MockupPalette, face: string, size: number) {
  return {
    fontFamily: p.heading,
    fontSize: typePx(size),
    lineHeight: 1.05,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: ink(face),
    maxWidth: '100%',
  };
}

function noteStyle(p: MockupPalette, face: string, size = 4.5) {
  return {
    fontFamily: p.body,
    fontSize: typePx(size),
    lineHeight: 1.3,
    color: mutedOn(face),
    maxWidth: '100%',
  };
}

/** The face layout most of these cards use: mark up, copy down. */
function Face({
  children,
  pad = '9%',
  justify = 'space-between',
  align = 'flex-start',
}: {
  children: ReactNode;
  pad?: string;
  justify?: CSSProperties['justifyContent'];
  align?: CSSProperties['alignItems'];
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: justify,
        alignItems: align,
        gap: 2,
        padding: pad,
      }}
    >
      {children}
    </div>
  );
}

/* ── The six scenes ───────────────────────────────────────────────── */

export const CARD_STACK_SCENES: ReadonlyArray<MockupScene> = withIds(
  [
    {
      name: 'Stack & Face',
      category: 'Stationery',
      tags: ['Desk', 'Classic', 'Print'],
      render: ({ brand, c, p }) => {
        const face = p.paper;
        return (
          <Scene ground={p.wall}>
            <SceneLight x={30} y={14} strength={0.42} />
            <CastShadow cx={52} cy={78} rx={30} ry={3} opacity={0.18} />
            <StackEdges paper={face} left={8} top={28} width={50} />
            <Card face={face} style={{ left: '8%', top: '28%', width: '50%' }} lift={3}>
              <Face>
                <Mark brand={brand} c={c} p={p} on={face} size={12} />
                <div>
                  <Primary c={c} style={nameStyle(p, face, 8)} />
                  <Secondary c={c} style={noteStyle(p, face)} />
                </div>
              </Face>
            </Card>
            {/* The lifted card, standing away from the stack. */}
            <Card
              face={p.brand}
              style={{ left: '48%', top: '12%', width: '44%' }}
              tilt={-6}
              lift={5}
            >
              <Face justify="center" align="center">
                <Mark brand={brand} c={c} p={p} on={p.brand} size={14} />
                <Url c={c} style={{ ...noteStyle(p, p.brand), color: ink(p.brand) }} />
              </Face>
            </Card>
            <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
          </Scene>
        );
      },
    },
    {
      name: 'Front & Back',
      category: 'Stationery',
      tags: ['Pair', 'Studio', 'Editorial'],
      render: ({ brand, c, p }) => {
        const front = p.paper;
        const back = p.dark;
        return (
          <Scene ground={p.wall}>
            <SceneLight x={50} y={10} strength={0.38} />
            <CastShadow cx={32} cy={62} rx={20} ry={2.4} opacity={0.16} />
            <CastShadow cx={68} cy={78} rx={20} ry={2.4} opacity={0.18} />
            <Card face={front} style={{ left: '5%', top: '12%', width: '48%' }} tilt={-3} lift={4}>
              <Face>
                <Mark brand={brand} c={c} p={p} on={front} size={12} />
                <div>
                  <Primary c={c} style={nameStyle(p, front, 8)} />
                  <Url c={c} style={noteStyle(p, front)} />
                </div>
              </Face>
            </Card>
            <Card face={back} style={{ left: '46%', top: '40%', width: '48%' }} tilt={4} lift={4}>
              <Face justify="center" align="center" pad="8%">
                <Secondary
                  c={c}
                  style={{ ...noteStyle(p, back, 5), color: ink(back), textAlign: 'center' }}
                  wrap
                />
                <Badge c={c} on={back} p={p} />
              </Face>
            </Card>
            <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url', 'badge']} />
          </Scene>
        );
      },
    },
    {
      name: 'Fanned Three',
      category: 'Stationery',
      tags: ['Range', 'Playful', 'Colourway'],
      render: ({ brand, c, p }) => {
        const a = p.paper;
        const b = p.brand;
        const d = p.dark;
        return (
          <Scene ground={p.wall}>
            <SceneLight x={34} y={12} strength={0.36} />
            <CastShadow cx={50} cy={76} rx={32} ry={3} opacity={0.2} />
            <Card face={d} style={{ left: '3%', top: '26%', width: '42%' }} tilt={-12} lift={3}>
              <Face justify="center" align="center">
                <Url c={c} style={{ ...noteStyle(p, d), color: ink(d) }} />
              </Face>
            </Card>
            <Card face={b} style={{ left: '29%', top: '24%', width: '42%' }} tilt={-3} lift={4}>
              <Face justify="center" align="center">
                <Mark brand={brand} c={c} p={p} on={b} size={14} />
              </Face>
            </Card>
            <Card face={a} style={{ left: '55%', top: '26%', width: '42%' }} tilt={9} lift={5}>
              <Face>
                <Primary c={c} style={nameStyle(p, a, 7.5)} />
                <Secondary c={c} style={noteStyle(p, a)} />
              </Face>
            </Card>
            <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
          </Scene>
        );
      },
    },
    {
      name: 'Painted Edge',
      category: 'Stationery',
      tags: ['Premium', 'Detail', 'Print'],
      render: ({ brand, c, p }) => {
        const face = p.paper;
        const edge = p.brand;
        return (
          <Scene ground={p.wall}>
            <SceneLight x={26} y={16} strength={0.4} />
            <CastShadow cx={50} cy={74} rx={30} ry={3} opacity={0.18} />
            {/* The painted edge: a coloured slab the top card sits on. */}
            <div
              style={{
                position: 'absolute',
                left: '14%',
                top: '30%',
                width: '54%',
                aspectRatio: CARD_RATIO,
                backgroundColor: edge,
                borderRadius: 2,
                boxShadow: '0 6px 12px rgba(0,0,0,0.22)',
              }}
            />
            <Card face={face} style={{ left: '14%', top: '24%', width: '54%' }} lift={3}>
              <Face pad="10%">
                <Mark brand={brand} c={c} p={p} on={face} size={13} />
                <div>
                  <Primary c={c} style={nameStyle(p, face, 9)} />
                  <div
                    style={{
                      height: 1.5,
                      width: '26%',
                      backgroundColor: accentOn(face, p),
                      margin: '2px 0',
                    }}
                  />
                  <Secondary c={c} style={noteStyle(p, face)} />
                  <Url c={c} style={noteStyle(p, face, 4)} />
                </div>
              </Face>
            </Card>
            <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
          </Scene>
        );
      },
    },
    {
      name: 'Boxed Set',
      category: 'Stationery',
      tags: ['Packaging', 'Gift', 'Retail'],
      render: ({ brand, c, p }) => {
        const box = p.dark;
        const face = p.paper;
        return (
          <Scene ground={p.paper}>
            <SceneLight x={38} y={12} strength={0.34} />
            <CastShadow cx={50} cy={80} rx={30} ry={3} opacity={0.22} />
            {/* The box: a lidless tray with the cards standing in it. */}
            {/* The tray overlaps the cards' bottom edge, so they sit IN it
                rather than floating over a separate black bar. */}
            <Print bg={box} style={{ left: '12%', top: '50%', width: '76%', height: '32%', borderRadius: 3 }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 7%',
                }}
              >
                <Primary c={c} style={nameStyle(p, box, 8)} />
                <Badge c={c} on={box} p={p} />
              </div>
            </Print>
            <StackEdges paper={face} left={27} top={8} width={46} count={4} step={1.2} />
            <Card face={face} style={{ left: '27%', top: '8%', width: '46%' }} lift={3}>
              <Face justify="center" align="center" pad="8%">
                <Mark brand={brand} c={c} p={p} on={face} size={14} />
                <Secondary c={c} style={{ ...noteStyle(p, face), textAlign: 'center' }} />
                <Url c={c} style={noteStyle(p, face, 4)} />
              </Face>
            </Card>
            <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url', 'badge']} />
          </Scene>
        );
      },
    },
    {
      name: 'Single, Held',
      category: 'Stationery',
      tags: ['Minimal', 'Hero', 'Quiet'],
      render: ({ brand, c, p }) => {
        const face = p.brand;
        return (
          <Scene ground={p.wall}>
            <SceneLight x={54} y={12} strength={0.44} />
            <CastShadow cx={50} cy={72} rx={28} ry={3.2} opacity={0.2} />
            <Card face={face} style={{ left: '17%', top: '18%', width: '66%' }} tilt={-2} lift={6}>
              <Face pad="8%">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                >
                  <Mark brand={brand} c={c} p={p} on={face} size={15} />
                  <Badge c={c} on={face} p={p} />
                </div>
                <div>
                  <Primary c={c} style={{ ...nameStyle(p, face, 11), fontWeight: 800 }} />
                  <Secondary c={c} style={{ ...noteStyle(p, face, 5), color: ink(face) }} />
                  <Url c={c} style={noteStyle(p, face, 4.5)} />
                </div>
              </Face>
            </Card>
          </Scene>
        );
      },
    },
  ],
  27,
);
