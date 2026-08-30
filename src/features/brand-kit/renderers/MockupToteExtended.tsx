/**
 * Tote — the brand carried.
 *
 * Six vector scenes. The bag's canvas IS the print face: one flat opaque
 * colour from the brand's neutrals (or the brand's own), with the straps,
 * the seam and the cast shadow drawn around it in SVG. The audit found
 * three designs printing dark text on a black tote; that pairing cannot be
 * expressed here, because every ink on this family comes from `ink(face)`
 * and every accent from `accentOn(face, …)`, which refuses a brand colour
 * that does not clear AA on the cloth it is on.
 *
 * Ids `mockup-tote-ext-1 … -6` are the six kept designs; `-7 … -30` stay
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
  withIds,
  type MockupPalette,
  type MockupRendererProps,
  type MockupScene,
} from './MockupScene';
import { typePx } from './typeFloor';

/* ── The object ───────────────────────────────────────────────────── */

/**
 * A tote: two straps behind, the body in front, a seam along the top.
 *
 * The straps keep their own aspect ratio (`xMidYMid meet` on a small box)
 * — a stretched handle is the first thing that makes a vector mockup look
 * like a diagram rather than a bag.
 */
function Tote({
  canvas,
  left = 22,
  top = 30,
  width = 56,
  height = 52,
  children,
}: {
  canvas: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  children: ReactNode;
}) {
  const shade = ink(canvas) === '#ffffff' ? '#ffffff' : '#000000';
  return (
    <>
      {/* The handles, drawn behind the body. */}
      <SceneSvg
        preserve="xMidYMid meet"
        viewBox="0 0 100 60"
        style={{
          inset: 'auto',
          left: `${left + width * 0.16}%`,
          top: `${top - height * 0.44}%`,
          width: `${width * 0.68}%`,
          height: `${height * 0.5}%`,
        }}
      >
        <path
          d="M6 58 C6 14 40 4 50 4 C60 4 94 14 94 58"
          fill="none"
          stroke={canvas}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M6 58 C6 14 40 4 50 4 C60 4 94 14 94 58"
          fill="none"
          stroke={shade}
          strokeOpacity="0.16"
          strokeWidth="9"
          strokeLinecap="round"
          transform="translate(0 2)"
        />
      </SceneSvg>
      <Print
        bg={canvas}
        curve={0.13}
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
          borderRadius: '2px 2px 5px 5px',
          // A hairline edge: natural canvas is near-white and the studio
          // wall is too, so without it a light bag has no shape.
          boxShadow: `inset 0 0 0 0.5px ${shade}22`,
        }}
      >
        {/* The hem: a darker band where the canvas is folded and stitched. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: '9%',
            backgroundColor: shade,
            opacity: 0.12,
          }}
        />
        {children}
      </Print>
    </>
  );
}

/** The column a tote print uses — centred, with room under the hem. */
function Face({ children, pad = '14% 12% 10%' }: { children: ReactNode; pad?: string }) {
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
    fontSize: typePx(size),
    lineHeight: 1.05,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: ink(face),
    maxWidth: '100%',
  };
}

function noteStyle(p: MockupPalette, face: string, size = 5) {
  return {
    fontFamily: p.body,
    fontSize: typePx(size),
    lineHeight: 1.35,
    color: mutedOn(face),
    maxWidth: '100%',
  };
}

/* ── The six scenes ───────────────────────────────────────────────── */

export const TOTE_SCENES: ReadonlyArray<MockupScene> = withIds([
  {
    name: 'Natural Canvas',
    category: 'Merch',
    tags: ['Minimal', 'Everyday', 'Craft'],
    render: ({ brand, c, p }) => {
      const canvas = p.paper;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={30} y={12} strength={0.45} />
          <CastShadow cx={50} cy={84} rx={26} ry={3} opacity={0.2} />
          <Tote canvas={canvas}>
            <Face>
              <Mark brand={brand} c={c} p={p} on={canvas} size={20} />
              <Primary c={c} style={nameStyle(p, canvas, 10)} />
              <Secondary c={c} style={noteStyle(p, canvas)} />
            </Face>
          </Tote>
          <DeclareRest c={c} omit={['primaryText', 'secondaryText']} />
        </Scene>
      );
    },
  },
  {
    name: 'Colour Drop',
    category: 'Merch',
    tags: ['Bold', 'Brand-led', 'Retail'],
    render: ({ brand, c, p }) => {
      const canvas = p.brand;
      return (
        <Scene ground={p.paper}>
          <SceneLight x={26} y={10} strength={0.34} />
          <CastShadow cx={50} cy={84} rx={26} ry={3} opacity={0.18} />
          <Tote canvas={canvas}>
            <Face>
              <Mark brand={brand} c={c} p={p} on={canvas} size={26} />
              <Primary c={c} style={{ ...nameStyle(p, canvas, 11), fontWeight: 800 }} />
              <Badge c={c} on={canvas} p={p} style={{ marginTop: 2 }} />
            </Face>
          </Tote>
          <DeclareRest c={c} omit={['primaryText', 'badge']} />
        </Scene>
      );
    },
  },
  {
    name: 'Market Band',
    category: 'Merch',
    tags: ['Grocery', 'Warm', 'Set'],
    render: ({ brand, c, p }) => {
      const canvas = p.paper;
      const band = p.brand;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={62} y={14} strength={0.42} />
          <CastShadow cx={50} cy={84} rx={26} ry={3} opacity={0.2} />
          <Tote canvas={canvas}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '34%',
                height: '30%',
                backgroundColor: band,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                padding: '0 8%',
                textAlign: 'center',
              }}
            >
              <Primary c={c} style={{ ...nameStyle(p, band, 9), fontWeight: 800 }} />
              <Url c={c} style={{ ...noteStyle(p, band, 4.5), color: ink(band) }} />
            </div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: '8%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Secondary c={c} style={noteStyle(p, canvas, 5)} />
            </div>
          </Tote>
          <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
        </Scene>
      );
    },
  },
  {
    name: 'Wordmark Carry',
    category: 'Merch',
    tags: ['Typographic', 'Modern', 'Statement'],
    render: ({ c, p }) => {
      const canvas = p.dark;
      return (
        <Scene ground={p.paper}>
          <SceneLight x={38} y={10} strength={0.4} />
          <CastShadow cx={50} cy={86} rx={27} ry={3.2} opacity={0.22} />
          <Tote canvas={canvas} left={18} top={26} width={64} height={58}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '16% 9% 10%',
              }}
            >
              <Primary c={c} style={{ ...nameStyle(p, canvas, 17), fontWeight: 800 }} />
              <div>
                <div
                  style={{
                    height: 1.5,
                    width: '40%',
                    backgroundColor: accentOn(canvas, p),
                    borderRadius: 2,
                    marginBottom: 3,
                  }}
                />
                <Secondary c={c} style={noteStyle(p, canvas, 5)} />
                <Url c={c} style={noteStyle(p, canvas, 4.5)} />
              </div>
            </div>
          </Tote>
          <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
        </Scene>
      );
    },
  },
  {
    name: 'Swing Tag',
    category: 'Merch',
    tags: ['Product', 'Retail', 'Detail'],
    render: ({ brand, c, p }) => {
      const canvas = p.paper;
      const tag = p.brand;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={30} y={16} strength={0.4} />
          <CastShadow cx={46} cy={84} rx={24} ry={3} opacity={0.18} />
          <Tote canvas={canvas} left={16} top={28} width={52} height={50}>
            <Face pad="16% 10% 10%">
              <Mark brand={brand} c={c} p={p} on={canvas} size={18} />
              <Primary c={c} style={nameStyle(p, canvas, 9)} />
            </Face>
          </Tote>
          {/* The tag hangs off the near strap. */}
          <SceneSvg
            preserve="xMidYMid meet"
            viewBox="0 0 20 40"
            style={{ inset: 'auto', left: '66%', top: '30%', width: '6%', height: '16%' }}
          >
            <path d="M10 0 L10 38" stroke={p.dark} strokeOpacity="0.55" strokeWidth="5" />
          </SceneSvg>
          <Print
            bg={tag}
            style={{
              left: '62%',
              top: '44%',
              width: '26%',
              height: '26%',
              borderRadius: 3,
              transform: 'rotate(-4deg)',
              boxShadow: '0 3px 8px rgba(0,0,0,0.22)',
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
                gap: 2,
                padding: '0 8%',
                textAlign: 'center',
              }}
            >
              <Badge c={c} on={tag} p={p} variant="plain" />
              <Secondary c={c} style={{ ...noteStyle(p, tag, 5), color: ink(tag) }} wrap />
              <Url c={c} style={noteStyle(p, tag, 4.5)} />
            </div>
          </Print>
        </Scene>
      );
    },
  },
  {
    name: 'Pair on a Rail',
    category: 'Merch',
    tags: ['Range', 'Editorial', 'Studio'],
    render: ({ brand, c, p }) => {
      const light = p.paper;
      const dark = p.dark;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={50} y={8} strength={0.3} />
          {/* The rail the bags hang from. */}
          <SceneSvg style={{ inset: 'auto', left: 0, top: '16%', width: '100%', height: '2%' }}>
            <rect width="100" height="100" fill={p.dark} opacity="0.35" />
          </SceneSvg>
          <CastShadow cx={30} cy={80} rx={16} ry={2.4} opacity={0.16} />
          <CastShadow cx={70} cy={84} rx={17} ry={2.6} opacity={0.2} />
          <Tote canvas={light} left={6} top={34} width={36} height={40}>
            <Face pad="16% 8% 8%">
              <Mark brand={brand} c={c} p={p} on={light} size={13} />
              <Primary c={c} style={nameStyle(p, light, 6.5)} />
            </Face>
          </Tote>
          <Tote canvas={dark} left={56} top={38} width={38} height={42}>
            <Face pad="16% 8% 8%">
              <Secondary c={c} style={{ ...noteStyle(p, dark, 5.5), color: ink(dark) }} wrap />
              <Url c={c} style={noteStyle(p, dark, 4.5)} />
            </Face>
          </Tote>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '4%',
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
]);

export function MockupToteExtendedRenderer(props: MockupRendererProps) {
  return <>{renderScene(TOTE_SCENES, props)}</>;
}

export const MOCKUP_TOTE_EXTENDED = templateList(TOTE_SCENES);
