/**
 * Mug — the brand on a ceramic cylinder.
 *
 * Six scenes, all vector. The mug's body IS the print face: a flat,
 * opaque colour taken from the brand's neutrals (or the brand's own
 * colour), with the wrap-around shading painted at its edges only, so the
 * type in the middle sits on exactly the colour the contrast sweep
 * measures. The handle, the rim ellipse and the cast shadow are SVG.
 *
 * Ids `mockup-mug-ext-1 … -6` are the six kept designs; `-7 … -30` stay
 * reserved and archived (`curation/mockups.ts`).
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
  type MockupRendererProps,
  type MockupScene,
  type MockupPalette,
} from './MockupScene';

/* ── The object ───────────────────────────────────────────────────── */

/** A mug: handle behind, body in front, rim on top. Percent geometry. */
function Mug({
  body,
  left = 24,
  top = 26,
  width = 40,
  height = 48,
  children,
}: {
  body: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  children: ReactNode;
}) {
  return (
    <>
      <SceneSvg
        preserve="xMidYMid meet"
        viewBox="0 0 40 60"
        style={{
          inset: 'auto',
          left: `${left + width - 2}%`,
          top: `${top + height * 0.2}%`,
          width: `${width * 0.42}%`,
          height: `${height * 0.52}%`,
        }}
      >
        <path
          d="M4 8 C30 2 38 16 38 30 C38 44 30 58 4 52"
          fill="none"
          stroke={body}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M4 8 C30 2 38 16 38 30 C38 44 30 58 4 52"
          fill="none"
          stroke="#000000"
          strokeOpacity="0.14"
          strokeWidth="9"
          strokeLinecap="round"
          transform="translate(1.5 1.5)"
        />
      </SceneSvg>
      <Print
        bg={body}
        curve={0.2}
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
          borderRadius: '3px 3px 9px 9px',
        }}
      >
        {children}
      </Print>
      {/* The rim: an opening seen slightly from above. */}
      <SceneSvg
        style={{
          inset: 'auto',
          left: `${left}%`,
          top: `${top - 2.4}%`,
          width: `${width}%`,
          height: '5%',
        }}
      >
        <ellipse cx="50" cy="50" rx="50" ry="46" fill={body} />
        <ellipse cx="50" cy="56" rx="41" ry="34" fill="#000000" opacity="0.2" />
      </SceneSvg>
    </>
  );
}

/** The column every mug label uses — centred, generous, never clipped. */
function Label({
  children,
  pad = '0 9%',
}: {
  children: ReactNode;
  pad?: string;
}) {
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
        gap: 3,
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
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: ink(face),
    maxWidth: '100%',
  };
}

function noteStyle(p: MockupPalette, face: string, size = 5.5) {
  return {
    fontFamily: p.body,
    fontSize: size,
    lineHeight: 1.35,
    color: mutedOn(face),
    maxWidth: '100%',
  };
}

/* ── The six scenes ───────────────────────────────────────────────── */

export const MUG_SCENES: ReadonlyArray<MockupScene> = [
  {
    idSuffix: 'ext-1',
    name: 'Studio Mug',
    category: 'Merch',
    tags: ['Minimal', 'Everyday', 'Studio'],
    render: ({ brand, c, p }) => {
      const face = p.paper;
      return (
        <Scene ground={p.wall}>
          <SceneLight />
          <CastShadow cx={48} cy={76} rx={25} ry={3.6} />
          <Mug body={face}>
            <Label>
              <Mark brand={brand} c={c} p={p} on={face} size={20} />
              <Primary c={c} style={nameStyle(p, face, 10)} />
              <Secondary c={c} style={noteStyle(p, face)} />
              <Badge c={c} on={face} p={p} style={{ marginTop: 2 }} />
            </Label>
          </Mug>
          <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'badge']} />
        </Scene>
      );
    },
  },
  {
    idSuffix: 'ext-2',
    name: 'Colour Block',
    category: 'Merch',
    tags: ['Bold', 'Brand-led', 'Retail'],
    render: ({ brand, c, p }) => {
      const face = p.brand;
      return (
        <Scene ground={p.paper}>
          <SceneLight strength={0.4} />
          <CastShadow cx={48} cy={77} rx={25} ry={3.6} opacity={0.22} />
          <Mug body={face}>
            <Label>
              <Mark brand={brand} c={c} p={p} on={face} size={26} />
              <Primary c={c} style={nameStyle(p, face, 9)} />
            </Label>
          </Mug>
          <Print
            bg={p.wall}
            style={{ left: '18%', right: '18%', top: '82%', height: '9%', borderRadius: 3 }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Url c={c} style={{ ...noteStyle(p, p.wall, 5.5), fontWeight: 600 }} />
              <Badge c={c} on={p.wall} p={p} variant="plain" />
            </div>
          </Print>
          <DeclareRest c={c} omit={['primaryText', 'url', 'badge']} />
        </Scene>
      );
    },
  },
  {
    idSuffix: 'ext-3',
    name: 'Enamel Camp',
    category: 'Merch',
    tags: ['Rugged', 'Outdoor', 'Contrast'],
    render: ({ brand, c, p }) => {
      const face = p.paper;
      const band = p.brand;
      return (
        <Scene ground={p.dark}>
          <SceneLight strength={0.22} floor={0.3} />
          <CastShadow cx={48} cy={77} rx={26} ry={3.8} opacity={0.5} />
          <Mug body={face} top={28} height={44}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: '18%',
                backgroundColor: band,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: '14%',
                backgroundColor: band,
              }}
            />
            <Label pad="18% 9%">
              <Mark brand={brand} c={c} p={p} on={face} size={17} />
              <Primary c={c} style={nameStyle(p, face, 9)} />
              <Url c={c} style={noteStyle(p, face, 5)} />
            </Label>
          </Mug>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '8%',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Badge c={c} on={p.dark} p={p} />
          </div>
          <DeclareRest c={c} omit={['primaryText', 'url', 'badge']} />
        </Scene>
      );
    },
  },
  {
    idSuffix: 'ext-4',
    name: 'Shelf Pair',
    category: 'Merch',
    tags: ['Range', 'Retail', 'Editorial'],
    render: ({ brand, c, p }) => {
      const left = p.paper;
      const right = p.brand;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={22} />
          <CastShadow cx={33} cy={72} rx={17} ry={2.8} />
          <CastShadow cx={68} cy={78} rx={19} ry={3} />
          <Mug body={left} left={12} top={22} width={30} height={40}>
            <Label pad="0 8%">
              <Mark brand={brand} c={c} p={p} on={left} size={16} />
              <Primary c={c} style={nameStyle(p, left, 8)} />
            </Label>
          </Mug>
          <Mug body={right} left={50} top={30} width={34} height={44}>
            <Label pad="0 9%">
              <Secondary c={c} style={{ ...noteStyle(p, right, 6), color: ink(right) }} wrap />
              <Url c={c} style={noteStyle(p, right, 5)} />
            </Label>
          </Mug>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '7%',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Badge c={c} on={p.wall} p={p} />
          </div>
        </Scene>
      );
    },
  },
  {
    idSuffix: 'ext-5',
    name: 'Mug & Coaster',
    category: 'Merch',
    tags: ['Hospitality', 'Set', 'Warm'],
    render: ({ brand, c, p }) => {
      const face = p.wall;
      const coaster = p.brand;
      return (
        <Scene ground={p.paper}>
          <SceneLight x={70} y={12} strength={0.45} />
          <CastShadow cx={44} cy={70} rx={22} ry={3.2} opacity={0.2} />
          <Mug body={face} left={20} top={18} width={38} height={44}>
            <Label>
              <Mark brand={brand} c={c} p={p} on={face} size={19} />
              <Primary c={c} style={nameStyle(p, face, 9)} />
            </Label>
          </Mug>
          <Print
            bg={coaster}
            style={{
              left: '54%',
              top: '62%',
              width: '32%',
              height: '24%',
              borderRadius: 6,
              transform: 'skewY(-6deg)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.22)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                padding: '0 8%',
                textAlign: 'center',
              }}
            >
              <Secondary c={c} style={{ ...noteStyle(p, coaster, 5.5), color: ink(coaster) }} />
              <Url c={c} style={noteStyle(p, coaster, 5)} />
              <Badge c={c} on={coaster} p={p} variant="plain" />
            </div>
          </Print>
        </Scene>
      );
    },
  },
  {
    idSuffix: 'ext-6',
    name: 'Wrap Wordmark',
    category: 'Merch',
    tags: ['Typographic', 'Bold', 'Modern'],
    render: ({ brand, c, p }) => {
      const face = p.dark;
      return (
        <Scene ground={p.paper}>
          <SceneLight x={35} y={10} strength={0.5} />
          <CastShadow cx={48} cy={78} rx={26} ry={3.6} opacity={0.24} />
          <Mug body={face} left={22} top={24} width={44} height={52}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '10% 8%',
              }}
            >
              <div
                style={{
                  height: 2,
                  width: '100%',
                  backgroundColor: accentOn(face, p),
                  borderRadius: 2,
                }}
              />
              <Primary c={c} style={{ ...nameStyle(p, face, 16), fontWeight: 800 }} />
              <div>
                <Secondary c={c} style={noteStyle(p, face, 5.5)} />
                <Url c={c} style={{ ...noteStyle(p, face, 5), marginTop: 1 }} />
              </div>
            </div>
          </Mug>
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
            <Badge c={c} on={p.paper} p={p} />
          </div>
        </Scene>
      );
    },
  },
];

export function MockupMugExtendedRenderer(props: MockupRendererProps) {
  return <>{renderScene(MUG_SCENES, props)}</>;
}

export const MOCKUP_MUG_EXTENDED = templateList(MUG_SCENES);
