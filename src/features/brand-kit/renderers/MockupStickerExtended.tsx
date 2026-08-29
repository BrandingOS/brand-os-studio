/**
 * Sticker — the brand as a die-cut object.
 *
 * Six vector scenes. A sticker is the one mockup where the artwork and the
 * object are the same shape, so the scene is mostly about the CUT: a
 * circle, a rounded square, a keyline badge, a sheet of them, one applied
 * to a laptop lid, and a long banner. Every face is flat and opaque, and
 * the paper edge is drawn as a ring around the face rather than a border
 * inside it — a border would eat into the printable area the type is
 * centred in.
 *
 * Ids `mockup-sticker-ext-1 … -6` are the six kept designs; `-7 … -30`
 * stay reserved and archived (`curation/mockups.ts`).
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
  SceneSvg,
  Secondary,
  Url,
  accentOn,
  ink,
  mutedOn,
  renderScene,
  templateList,
  withIds,
  type MockupPalette,
  type MockupRendererProps,
  type MockupScene,
} from './MockupScene';

/* ── The object ───────────────────────────────────────────────────── */

/**
 * A die-cut sticker: a flat face with a paper border and a lifted shadow.
 *
 * `cut` is the white-ish paper margin every die-cut sticker has. It is a
 * ring OUTSIDE the printed face (an outline plus padding on the wrapper),
 * so the face itself stays the full printable area.
 */
function Sticker({
  face,
  cut,
  style,
  radius = 999,
  children,
  tilt = 0,
  centre = false,
}: {
  face: string;
  /** The paper edge. Omit for a sticker printed edge to edge. */
  cut?: string;
  style: CSSProperties;
  radius?: number | string;
  children: ReactNode;
  tilt?: number;
  /**
   * Centre it horizontally on `left`.
   *
   * A round sticker is sized by its HEIGHT — `aspectRatio` on a percentage
   * WIDTH resolves against the scene's width, so on a landscape tile a
   * 56%-wide circle came out 91% tall and hung off the bottom of the card.
   * Height is the dimension a scene actually has to spare, so the width
   * follows from it and the object is centred rather than positioned.
   */
  centre?: boolean;
}) {
  // The ring is drawn by INSETTING the face inside a `cut`-coloured box,
  // not by a border on the face: a border would be laid inside the face's
  // own box and the type centred in it would sit off-centre by half the
  // ring.
  const ring = cut ? '4%' : '0%';
  return (
    <div
      style={{
        position: 'absolute',
        backgroundColor: cut,
        borderRadius: radius,
        transform: [centre ? 'translateX(-50%)' : '', tilt ? `rotate(${tilt}deg)` : '']
          .filter(Boolean)
          .join(' ') || undefined,
        boxShadow: '0 3px 9px rgba(0,0,0,0.24)',
        ...style,
      }}
    >
      <Print
        bg={face}
        style={{ left: ring, top: ring, right: ring, bottom: ring, borderRadius: radius }}
      >
        {children}
      </Print>
    </div>
  );
}

/** The centred column every sticker face uses. */
function Art({ children, gap = 2, pad = '0 12%' }: { children: ReactNode; gap?: number; pad?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap,
        padding: pad,
      }}
    >
      {children}
    </div>
  );
}

function nameStyle(p: MockupPalette, face: string, size: number) {
  return {
    fontFamily: p.heading,
    fontSize: size,
    lineHeight: 1.05,
    fontWeight: 800,
    letterSpacing: '-0.01em',
    color: ink(face),
    maxWidth: '100%',
  };
}

function noteStyle(p: MockupPalette, face: string, size = 4.5) {
  return {
    fontFamily: p.body,
    fontSize: size,
    lineHeight: 1.3,
    color: mutedOn(face),
    maxWidth: '100%',
  };
}

/* ── The six scenes ───────────────────────────────────────────────── */

export const STICKER_SCENES: ReadonlyArray<MockupScene> = withIds([
  {
    name: 'Circle Die-Cut',
    category: 'Print',
    tags: ['Minimal', 'Classic', 'Giveaway'],
    render: ({ brand, c, p }) => {
      const face = p.brand;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={30} y={18} strength={0.4} />
          <CastShadow cx={50} cy={80} rx={22} ry={2.6} opacity={0.18} />
          <Sticker
            face={face}
            cut={p.paper}
            centre
            style={{ left: '50%', top: '10%', height: '76%', aspectRatio: '1 / 1' }}
          >
            <Art gap={3}>
              <Mark brand={brand} c={c} p={p} on={face} size={22} />
              <Primary c={c} style={nameStyle(p, face, 10)} />
              <Secondary c={c} style={{ ...noteStyle(p, face, 5), color: ink(face) }} />
            </Art>
          </Sticker>
          <DeclareRest c={c} omit={['primaryText', 'secondaryText']} />
        </Scene>
      );
    },
  },
  {
    name: 'Rounded Square',
    category: 'Print',
    tags: ['Modern', 'Bold', 'Merch'],
    render: ({ brand, c, p }) => {
      const face = p.dark;
      return (
        <Scene ground={p.paper}>
          <SceneLight x={26} y={14} strength={0.36} />
          <CastShadow cx={50} cy={82} rx={24} ry={2.8} opacity={0.2} />
          <Sticker
            face={face}
            cut={p.paper}
            radius={14}
            tilt={-4}
            centre
            style={{ left: '50%', top: '11%', height: '74%', aspectRatio: '1 / 1' }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '10%',
              }}
            >
              <Mark brand={brand} c={c} p={p} on={face} size={18} />
              <div>
                <Primary c={c} style={nameStyle(p, face, 12)} />
                <Url c={c} style={{ ...noteStyle(p, face, 5), marginTop: 1 }} />
              </div>
            </div>
          </Sticker>
          <DeclareRest c={c} omit={['primaryText', 'url']} />
        </Scene>
      );
    },
  },
  {
    name: 'Keyline Badge',
    category: 'Print',
    tags: ['Craft', 'Heritage', 'Quiet'],
    render: ({ brand, c, p }) => {
      const face = p.paper;
      const rule = accentOn(face, p);
      return (
        <Scene ground={p.wall}>
          <SceneLight x={70} y={16} strength={0.44} />
          <CastShadow cx={50} cy={80} rx={22} ry={2.6} opacity={0.16} />
          <Sticker
            face={face}
            centre
            style={{ left: '50%', top: '10%', height: '76%', aspectRatio: '1 / 1' }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '9%',
                border: `1.5px solid ${rule}`,
                borderRadius: 999,
              }}
            />
            <Art gap={2} pad="0 18%">
              <Mark brand={brand} c={c} p={p} on={face} size={16} />
              <Primary c={c} style={nameStyle(p, face, 8)} />
              <div style={{ height: 1, width: '34%', backgroundColor: rule }} />
              <Secondary c={c} style={noteStyle(p, face, 4.5)} />
            </Art>
          </Sticker>
          <DeclareRest c={c} omit={['primaryText', 'secondaryText']} />
        </Scene>
      );
    },
  },
  {
    name: 'Sticker Sheet',
    category: 'Print',
    tags: ['Set', 'Packaging', 'Playful'],
    render: ({ brand, c, p }) => {
      const sheet = p.paper;
      const a = p.brand;
      const b = p.dark;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={34} y={12} strength={0.4} />
          <CastShadow cx={50} cy={84} rx={30} ry={3} opacity={0.2} />
          <Print
            bg={sheet}
            style={{ left: '10%', top: '12%', width: '80%', height: '72%', borderRadius: 4 }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: '1fr 1fr',
                gap: '5%',
                padding: '7%',
              }}
            >
              <div
                style={{
                  backgroundColor: a,
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Mark brand={brand} c={c} p={p} on={a} size={16} />
              </div>
              <div
                style={{
                  backgroundColor: b,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 8%',
                }}
              >
                <Primary c={c} style={nameStyle(p, b, 7)} />
              </div>
              <div
                style={{
                  backgroundColor: b,
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 8%',
                }}
              >
                <Url c={c} style={{ ...noteStyle(p, b, 4.5), color: ink(b) }} />
              </div>
              <div
                style={{
                  backgroundColor: a,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 8%',
                  textAlign: 'center',
                }}
              >
                <Secondary c={c} style={{ ...noteStyle(p, a, 4.5), color: ink(a) }} wrap />
              </div>
            </div>
          </Print>
          <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
        </Scene>
      );
    },
  },
  {
    name: 'Laptop Lid',
    category: 'Print',
    tags: ['Lifestyle', 'Tech', 'Applied'],
    render: ({ brand, c, p }) => {
      const lid = p.dark;
      const face = p.brand;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={32} y={12} strength={0.34} />
          <CastShadow cx={50} cy={82} rx={34} ry={3.4} opacity={0.24} />
          {/* The lid, seen slightly from above. */}
          <Print
            bg={lid}
            curve={0.1}
            style={{ left: '10%', top: '18%', width: '80%', height: '58%', borderRadius: 6 }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: '6%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Badge c={c} on={lid} p={p} />
            </div>
          </Print>
          <Sticker
            face={face}
            cut={p.paper}
            radius={10}
            tilt={-6}
            centre
            style={{ left: '50%', top: '30%', height: '34%', aspectRatio: '5 / 4' }}
          >
            <Art gap={2} pad="0 10%">
              <Mark brand={brand} c={c} p={p} on={face} size={14} />
              <Primary c={c} style={nameStyle(p, face, 8)} />
              <Url c={c} style={{ ...noteStyle(p, face, 4.5), color: ink(face) }} />
            </Art>
          </Sticker>
          <DeclareRest c={c} omit={['primaryText', 'url', 'badge']} />
        </Scene>
      );
    },
  },
  {
    name: 'Long Banner',
    category: 'Print',
    tags: ['Typographic', 'Statement', 'Bumper'],
    render: ({ c, p }) => {
      const face = p.brand;
      const second = p.dark;
      return (
        <Scene ground={p.paper}>
          <SceneLight x={50} y={18} strength={0.34} />
          <CastShadow cx={50} cy={62} rx={34} ry={2.4} opacity={0.16} />
          <Sticker
            face={face}
            cut={p.paper}
            radius={999}
            tilt={-3}
            style={{ left: '8%', top: '26%', width: '84%', height: '20%' }}
          >
            <Art gap={0} pad="0 8%">
              <Primary
                c={c}
                style={{ ...nameStyle(p, face, 13), letterSpacing: '0.02em' }}
              />
            </Art>
          </Sticker>
          <Sticker
            face={second}
            cut={p.paper}
            radius={999}
            tilt={2}
            style={{ left: '18%', top: '54%', width: '64%', height: '15%' }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '0 8%',
              }}
            >
              <Secondary c={c} style={{ ...noteStyle(p, second, 5), color: ink(second) }} />
              <Url c={c} style={noteStyle(p, second, 4.5)} />
            </div>
          </Sticker>
          <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
        </Scene>
      );
    },
  },
]);

export function MockupStickerExtendedRenderer(props: MockupRendererProps) {
  return <>{renderScene(STICKER_SCENES, props)}</>;
}

export const MOCKUP_STICKER_EXTENDED = templateList(STICKER_SCENES);
