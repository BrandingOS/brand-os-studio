/**
 * Apparel — the brand printed on a garment.
 *
 * Six vector scenes. The tee is an SVG silhouette in ONE flat colour and
 * the print sits on a `Print` face painted that same colour, so the ink is
 * `fgOn(theGarment)` by construction. That is the fix for the defect the
 * audit found in the old file: seven designs printed white on a cream tee
 * because the garment colour and the ink were chosen in different places.
 * Here there is no branch in which a scene names both.
 *
 * Ids `mockup-tshirt-ext-1 … -6` are the six kept designs; `-7 … -30`
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

/* ── The object ───────────────────────────────────────────────────── */

/**
 * A tee, seen flat from the front (or the back — the neck moves).
 *
 * Body, sleeves and collar are one silhouette in `fabric`; the print area
 * is a child face painted `fabric` too, so nothing seams and the ink is
 * measured against the cloth it is actually on.
 */
function Tee({
  fabric,
  back = false,
  left = 16,
  top = 12,
  width = 68,
  height = 74,
  printTop = 26,
  printHeight = 34,
  children,
}: {
  fabric: string;
  back?: boolean;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  printTop?: number;
  printHeight?: number;
  children: ReactNode;
}) {
  const shade = ink(fabric) === '#ffffff' ? '#ffffff' : '#000000';
  return (
    <>
      <SceneSvg
        preserve="xMidYMid meet"
        viewBox="0 0 100 108"
        style={{
          inset: 'auto',
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
        }}
      >
        {/* Body + sleeves in one path: shoulders, sleeve caps, side seams. */}
        {/* A hairline edge, so a near-white tee still has a shape on a
            near-white ground. Without it a light colourway is a pale
            smudge — the same failure as an invisible logo, one step out. */}
        <path
          d="M34 4 L50 12 L66 4 L84 12 L96 34 L80 42 L80 104 L20 104 L20 42 L4 34 L16 12 Z"
          fill={fabric}
          stroke={shade}
          strokeOpacity="0.14"
          strokeWidth="0.8"
        />
        {/* Collar: a ribbed crew at the front, a flat band at the back. */}
        {back ? (
          <path d="M34 4 L50 8 L66 4 L64 11 L36 11 Z" fill={shade} opacity="0.14" />
        ) : (
          <path d="M34 4 C42 15 58 15 66 4 L62 3 C56 10 44 10 38 3 Z" fill={shade} opacity="0.18" />
        )}
        {/* Shading at the SLEEVES only. The two body folds that used to run
            down the chest sat UNDER the print face, so the face — the same
            colour, but unshaded — showed through as a clean rectangle on
            the cloth. Shade what the print does not cover. */}
        <path d="M20 42 L4 34 L8 30 L22 37 Z" fill={shade} opacity="0.1" />
        <path d="M80 42 L96 34 L92 30 L78 37 Z" fill={shade} opacity="0.1" />
        <path d="M20 96 L80 96 L80 104 L20 104 Z" fill={shade} opacity="0.06" />
      </SceneSvg>
      <Print
        bg={fabric}
        style={{
          left: `${left + width * 0.24}%`,
          top: `${top + height * (printTop / 100)}%`,
          width: `${width * 0.52}%`,
          height: `${height * (printHeight / 100)}%`,
        }}
      >
        {children}
      </Print>
    </>
  );
}

/** The centred column a chest print uses. */
function Chest({ children, gap = 3 }: { children: ReactNode; gap?: number }) {
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

function noteStyle(p: MockupPalette, face: string, size = 5) {
  return {
    fontFamily: p.body,
    fontSize: size,
    lineHeight: 1.35,
    color: mutedOn(face),
    maxWidth: '100%',
  };
}

/* ── The six scenes ───────────────────────────────────────────────── */

export const TSHIRT_SCENES: ReadonlyArray<MockupScene> = withIds([
  {
    name: 'Chest Mark',
    category: 'Apparel',
    tags: ['Minimal', 'Everyday', 'Uniform'],
    render: ({ brand, c, p }) => {
      const fabric = p.dark;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={30} y={14} strength={0.4} />
          <CastShadow cx={50} cy={88} rx={30} ry={3} opacity={0.2} />
          <Tee fabric={fabric}>
            <Chest>
              <Mark brand={brand} c={c} p={p} on={fabric} size={20} />
              <Primary c={c} style={nameStyle(p, fabric, 9)} />
              <Secondary c={c} style={noteStyle(p, fabric)} />
            </Chest>
          </Tee>
          <DeclareRest c={c} omit={['primaryText', 'secondaryText']} />
        </Scene>
      );
    },
  },
  {
    name: 'Colourway Tee',
    category: 'Apparel',
    tags: ['Bold', 'Brand-led', 'Retail'],
    render: ({ brand, c, p }) => {
      const fabric = p.brand;
      return (
        <Scene ground={p.paper}>
          <SceneLight x={26} y={12} strength={0.36} />
          <CastShadow cx={50} cy={88} rx={30} ry={3} opacity={0.18} />
          <Tee fabric={fabric} printTop={24} printHeight={38}>
            <Chest gap={4}>
              <Mark brand={brand} c={c} p={p} on={fabric} size={24} />
              <Primary c={c} style={{ ...nameStyle(p, fabric, 11), fontWeight: 800 }} />
              <Badge c={c} on={fabric} p={p} />
            </Chest>
          </Tee>
          <DeclareRest c={c} omit={['primaryText', 'badge']} />
        </Scene>
      );
    },
  },
  {
    name: 'Left Chest',
    category: 'Apparel',
    tags: ['Quiet', 'Workwear', 'Classic'],
    render: ({ brand, c, p }) => {
      const fabric = p.paper;
      // The room is dark BECAUSE the garment is white. A near-white tee on
      // the brand's near-white wall is a pale smudge with a shadow under it.
      return (
        <Scene ground={p.dark}>
          <SceneLight x={70} y={14} strength={0.22} floor={0.3} />
          <CastShadow cx={50} cy={88} rx={30} ry={3} opacity={0.4} />
          <Tee fabric={fabric} printTop={24} printHeight={16}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Mark brand={brand} c={c} p={p} on={fabric} size={13} />
              <div style={{ minWidth: 0 }}>
                <Primary c={c} style={nameStyle(p, fabric, 7)} />
                <Url c={c} style={noteStyle(p, fabric, 4.5)} />
              </div>
            </div>
          </Tee>
          <DeclareRest c={c} omit={['primaryText', 'url']} />
        </Scene>
      );
    },
  },
  {
    name: 'Back Print',
    category: 'Apparel',
    tags: ['Editorial', 'Crew', 'Typographic'],
    render: ({ brand, c, p }) => {
      const fabric = p.dark;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={50} y={10} strength={0.32} />
          <CastShadow cx={50} cy={88} rx={30} ry={3} opacity={0.22} />
          <Tee fabric={fabric} back printTop={20} printHeight={50}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'center',
                padding: '4% 0',
              }}
            >
              <Primary c={c} style={{ ...nameStyle(p, fabric, 10), fontWeight: 800 }} />
              <div
                style={{
                  width: '62%',
                  height: 1.5,
                  backgroundColor: accentOn(fabric, p),
                  borderRadius: 2,
                }}
              />
              <Secondary c={c} style={noteStyle(p, fabric, 5)} wrap />
              <Url c={c} style={noteStyle(p, fabric, 4.5)} />
            </div>
          </Tee>
          <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
        </Scene>
      );
    },
  },
  {
    name: 'Two Colourways',
    category: 'Apparel',
    tags: ['Range', 'Retail', 'Comparison'],
    render: ({ brand, c, p }) => {
      const light = p.paper;
      const dark = p.dark;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={50} y={8} strength={0.3} />
          <CastShadow cx={28} cy={82} rx={17} ry={2.4} opacity={0.16} />
          <CastShadow cx={72} cy={86} rx={18} ry={2.6} opacity={0.2} />
          <Tee fabric={light} left={2} top={14} width={46} height={62} printTop={26} printHeight={26}>
            <Chest gap={2}>
              <Mark brand={brand} c={c} p={p} on={light} size={13} />
              <Primary c={c} style={nameStyle(p, light, 6.5)} />
            </Chest>
          </Tee>
          <Tee fabric={dark} left={50} top={20} width={48} height={64} printTop={26} printHeight={26}>
            <Chest gap={2}>
              <Secondary c={c} style={{ ...noteStyle(p, dark, 5.5), color: ink(dark) }} wrap />
              <Url c={c} style={noteStyle(p, dark, 4.5)} />
            </Chest>
          </Tee>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '4%',
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
    name: 'Folded Flat Lay',
    category: 'Apparel',
    tags: ['Product', 'Studio', 'Packaging'],
    render: ({ brand, c, p }) => {
      const fabric = p.brand;
      const card = p.paper;
      return (
        <Scene ground={p.wall}>
          <SceneLight x={34} y={16} strength={0.42} />
          <CastShadow cx={50} cy={74} rx={30} ry={4} opacity={0.22} />
          {/* A folded garment reads as a stacked slab, not a silhouette. */}
          <Print
            bg={fabric}
            curve={0.14}
            style={{ left: '14%', top: '24%', width: '72%', height: '44%', borderRadius: 4 }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '7% 8%',
              }}
            >
              <Mark brand={brand} c={c} p={p} on={fabric} size={16} />
              <div>
                <Primary c={c} style={{ ...nameStyle(p, fabric, 11), fontWeight: 800 }} />
                <Secondary c={c} style={noteStyle(p, fabric, 5)} />
              </div>
            </div>
          </Print>
          {/* The band that holds the fold — a paper wrap with the label. */}
          {/* The wrap sits to the RIGHT of the label, not across it. */}
          <Print
            bg={card}
            style={{ left: '62%', top: '24%', width: '20%', height: '44%' }}
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
                padding: '0 6%',
                textAlign: 'center',
              }}
            >
              <Badge c={c} on={card} p={p} />
              <Url c={c} style={noteStyle(p, card, 4.5)} />
            </div>
          </Print>
        </Scene>
      );
    },
  },
]);

export function MockupTShirtExtendedRenderer(props: MockupRendererProps) {
  return <>{renderScene(TSHIRT_SCENES, props)}</>;
}

export const MOCKUP_TSHIRT_EXTENDED = templateList(TSHIRT_SCENES);
