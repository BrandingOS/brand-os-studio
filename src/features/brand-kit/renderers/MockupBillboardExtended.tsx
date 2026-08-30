/**
 * Billboard — the brand at a hundred metres.
 *
 * Six vector scenes. A billboard is read from a moving car, so these are
 * the only mockups in the family where the type is deliberately huge and
 * the copy deliberately short: the primary line carries the design and
 * everything else is a supporting mark. The board is a flat opaque face
 * with a frame and posts drawn around it; the sky is the brand's own
 * lightest neutral rather than a photographic gradient, so a board reads
 * the same in every brand.
 *
 * Ids `mockup-billboard-ext-1 … -6` are the six kept designs; `-7 … -30`
 * stay reserved and archived (`curation/mockups.ts`).
 */
import type { ReactNode } from 'react';
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
import { typePx } from './typeFloor';

/* ── The object ───────────────────────────────────────────────────── */

/**
 * A board on posts: the printed face, a frame around it, two legs under.
 *
 * The frame is a `cut`-coloured box the face is inset into (the same
 * device the sticker family uses) rather than a border on the face, so the
 * printable area is exactly what the type is centred in.
 */
function Board({
  face,
  frame,
  posts = true,
  left = 6,
  top = 14,
  width = 88,
  height = 48,
  children,
}: {
  face: string;
  frame: string;
  posts?: boolean;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  children: ReactNode;
}) {
  return (
    <>
      {posts ? (
        <SceneSvg style={{ inset: 'auto', left: `${left}%`, top: `${top + height}%`, width: `${width}%`, height: `${94 - top - height}%` }}>
          <rect x="26" y="0" width="7" height="100" fill={frame} />
          <rect x="67" y="0" width="7" height="100" fill={frame} />
          <rect x="20" y="0" width="60" height="9" fill={frame} opacity="0.7" />
        </SceneSvg>
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
          backgroundColor: frame,
          borderRadius: 3,
          boxShadow: '0 6px 14px rgba(0,0,0,0.22)',
        }}
      >
        <Print bg={face} style={{ left: '2.5%', top: '4%', right: '2.5%', bottom: '4%' }}>
          {children}
        </Print>
      </div>
    </>
  );
}

/** The layout a board's copy uses: one big line, one supporting row. */
function Copy({
  children,
  align = 'center',
  pad = '6% 7%',
  justify = 'center',
}: {
  children: ReactNode;
  align?: 'center' | 'flex-start';
  pad?: string;
  justify?: 'center' | 'space-between';
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: align,
        justifyContent: justify,
        textAlign: align === 'center' ? 'center' : 'left',
        gap: 3,
        padding: pad,
      }}
    >
      {children}
    </div>
  );
}

function headlineStyle(p: MockupPalette, face: string, size: number) {
  return {
    fontFamily: p.heading,
    fontSize: typePx(size),
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: '-0.025em',
    color: ink(face),
    maxWidth: '100%',
  };
}

function noteStyle(p: MockupPalette, face: string, size = 5) {
  return {
    fontFamily: p.body,
    fontSize: typePx(size),
    lineHeight: 1.3,
    color: mutedOn(face),
    maxWidth: '100%',
  };
}

/* ── The six scenes ───────────────────────────────────────────────── */

export const BILLBOARD_SCENES: ReadonlyArray<MockupScene> = withIds([
  {
    name: 'Roadside Board',
    category: 'Environment',
    tags: ['Outdoor', 'Bold', 'Awareness'],
    render: ({ brand, c, p }) => {
      const face = p.brand;
      return (
        <Scene ground={p.paper}>
          <SceneLight x={70} y={10} strength={0.5} />
          <CastShadow cx={50} cy={92} rx={26} ry={2.4} opacity={0.18} />
          <Board face={face} frame={p.dark}>
            <Copy justify="space-between" align="flex-start">
              <Mark brand={brand} c={c} p={p} on={face} size={16} />
              <Primary c={c} style={headlineStyle(p, face, 20)} />
              <Url c={c} style={{ ...noteStyle(p, face, 6), color: ink(face) }} />
            </Copy>
          </Board>
          <DeclareRest c={c} omit={['primaryText', 'url']} />
        </Scene>
      );
    },
  },
  {
    name: 'Colour Field',
    category: 'Environment',
    tags: ['Minimal', 'Brand-led', 'Statement'],
    render: ({ brand, c, p }) => {
      const face = p.dark;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={30} y={12} strength={0.32} />
          <CastShadow cx={50} cy={92} rx={26} ry={2.4} opacity={0.22} />
          <Board face={face} frame={p.brand}>
            <Copy>
              <Mark brand={brand} c={c} p={p} on={face} size={22} />
              <Primary c={c} style={headlineStyle(p, face, 16)} />
              <Secondary c={c} style={noteStyle(p, face, 6)} />
            </Copy>
          </Board>
          <DeclareRest c={c} omit={['primaryText', 'secondaryText']} />
        </Scene>
      );
    },
  },
  {
    name: 'Split Board',
    category: 'Environment',
    tags: ['Editorial', 'Launch', 'Contrast'],
    render: ({ brand, c, p }) => {
      const left = p.brand;
      const right = p.paper;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={50} y={8} strength={0.36} />
          <CastShadow cx={50} cy={92} rx={26} ry={2.4} opacity={0.2} />
          <Board face={right} frame={p.dark}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '38%',
                backgroundColor: left,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mark brand={brand} c={c} p={p} on={left} size={22} />
            </div>
            <div
              style={{
                position: 'absolute',
                left: '38%',
                right: 0,
                top: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 3,
                padding: '0 7%',
              }}
            >
              <Primary c={c} style={headlineStyle(p, right, 14)} />
              <Secondary c={c} style={noteStyle(p, right, 5.5)} wrap />
              <Url c={c} style={noteStyle(p, right, 5)} />
            </div>
          </Board>
          <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
        </Scene>
      );
    },
  },
  {
    name: 'Transit Panel',
    category: 'Environment',
    tags: ['Transit', 'Wide', 'Urban'],
    render: ({ brand, c, p }) => {
      const face = p.paper;
      const rule = accentOn(face, p);
      return (
        <Scene ground={p.dark}>
          <SceneLight x={50} y={16} strength={0.2} floor={0.28} />
          <Board face={face} frame={p.wall} posts={false} left={4} top={30} width={92} height={30}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 6%',
              }}
            >
              <Mark brand={brand} c={c} p={p} on={face} size={18} />
              <div style={{ width: 1.5, alignSelf: 'stretch', backgroundColor: rule, margin: '8% 0' }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <Primary c={c} style={headlineStyle(p, face, 11)} />
                <Secondary c={c} style={noteStyle(p, face, 5)} />
              </div>
              <Badge c={c} on={face} p={p} />
            </div>
          </Board>
          <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'badge']} />
        </Scene>
      );
    },
  },
  {
    name: 'Digital Screen',
    category: 'Environment',
    tags: ['Night', 'Retail', 'Modern'],
    render: ({ brand, c, p }) => {
      const face = p.brand;
      return (
        <Scene ground={p.dark}>
          <SceneLight x={50} y={40} strength={0.18} floor={0.34} />
          <Board face={face} frame={p.dark} left={10} top={16} width={80} height={44}>
            <Copy justify="space-between">
              <Badge c={c} on={face} p={p} />
              <Primary c={c} style={headlineStyle(p, face, 18)} />
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                <Secondary c={c} style={{ ...noteStyle(p, face, 5.5), color: ink(face) }} />
                <Url c={c} style={noteStyle(p, face, 5)} />
              </div>
            </Copy>
          </Board>
          {/* The screen's spill on the ground under it — below the posts,
              faint enough to read as light rather than as a second panel. */}
          <SceneSvg style={{ inset: 'auto', left: '16%', top: '78%', width: '68%', height: '14%' }}>
            <rect width="100" height="100" fill={face} opacity="0.1" />
          </SceneSvg>
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
            <Mark brand={brand} c={c} p={p} on={p.dark} size={10} />
          </div>
        </Scene>
      );
    },
  },
  {
    name: 'Wall Poster',
    category: 'Environment',
    tags: ['Street', 'Typographic', 'Culture'],
    render: ({ c, p }) => {
      const face = p.paper;
      const bar = p.brand;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={24} y={10} strength={0.3} />
          <Board face={face} frame={p.dark} posts={false} left={16} top={8} width={68} height={80}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '8% 8%',
              }}
            >
              <Primary c={c} style={headlineStyle(p, face, 22)} />
              <div
                style={{
                  backgroundColor: bar,
                  padding: '4% 6%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <Secondary c={c} style={{ ...noteStyle(p, bar, 5.5), color: ink(bar) }} wrap />
                <Url c={c} style={{ ...noteStyle(p, bar, 5), color: ink(bar) }} />
              </div>
            </div>
          </Board>
          <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
        </Scene>
      );
    },
  },
]);

export function MockupBillboardExtendedRenderer(props: MockupRendererProps) {
  return <>{renderScene(BILLBOARD_SCENES, props)}</>;
}

export const MOCKUP_BILLBOARD_EXTENDED = templateList(BILLBOARD_SCENES);
