/**
 * Signage — the brand on a building.
 *
 * Six vector scenes: a shop fascia, a blade sign hanging over a pavement,
 * window vinyl, a monument sign on a forecourt, a reception wall, and an
 * awning. Signage is the one family where the brand is applied to
 * ARCHITECTURE rather than to an object you hold, so each scene draws a
 * little of the building around the sign — a shopfront with a doorway, a
 * kerb, a floor line — and the sign is a flat opaque face on top of it.
 *
 * Ids: `mockups-ext-21 … -26`. Signage, Business Card Stack and Device
 * Screen are three modules sharing ONE id space, because the kit routes
 * all three through the `mockups` template type; `withIds(…, 21)` is what
 * assigns the range, and no two modules may overlap.
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
  withIds,
  type MockupPalette,
  type MockupScene,
} from './MockupScene';

/* ── Shared vocabulary ────────────────────────────────────────────── */

function headingStyle(p: MockupPalette, face: string, size: number) {
  return {
    fontFamily: p.heading,
    fontSize: size,
    lineHeight: 1.02,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: ink(face),
    maxWidth: '100%',
  };
}

function noteStyle(p: MockupPalette, face: string, size = 5) {
  return {
    fontFamily: p.body,
    fontSize: size,
    lineHeight: 1.3,
    color: mutedOn(face),
    maxWidth: '100%',
  };
}

/** A row or column of sign copy, centred in its face. */
function SignCopy({
  children,
  row = false,
  gap = 3,
  pad = '0 8%',
}: {
  children: ReactNode;
  row?: boolean;
  gap?: number;
  pad?: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: row ? 'row' : 'column',
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

/* ── The six scenes ───────────────────────────────────────────────── */

export const SIGNAGE_SCENES: ReadonlyArray<MockupScene> = withIds(
  [
    {
      name: 'Shop Fascia',
      category: 'Signage',
      tags: ['Retail', 'Street', 'Classic'],
      render: ({ brand, c, p }) => {
        const fascia = p.dark;
        // Glazing is the DARK half of a shopfront and the doorway the lit
        // one. Painting the glass in the brand's mid neutral on its light
        // one left the whole building as an empty white box.
        const glass = p.dark;
        return (
          <Scene ground={p.paper}>
            <SceneLight x={30} y={10} strength={0.4} />
            {/* The shopfront: glazing under the sign band, a doorway in it. */}
            <Print bg={glass} style={{ left: '6%', top: '40%', right: '6%', bottom: '8%' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '38%',
                  top: '14%',
                  width: '24%',
                  bottom: 0,
                  backgroundColor: p.wall,
                }}
              />
              {/* The mullions between the panes. */}
              <div
                style={{
                  position: 'absolute',
                  left: '30%',
                  top: 0,
                  bottom: 0,
                  width: '1.5%',
                  backgroundColor: p.paper,
                  opacity: 0.28,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '68%',
                  top: 0,
                  bottom: 0,
                  width: '1.5%',
                  backgroundColor: p.paper,
                  opacity: 0.28,
                }}
              />
            </Print>
            {/* A light reveal under the fascia. The sign band and the
                glazing are BOTH the brand's near-black — correct for a
                shopfront, and without a line between them the building
                reads as one black mass. */}
            <Print
              bg={fascia}
              style={{
                left: '6%',
                top: '18%',
                right: '6%',
                height: '22%',
                borderBottom: `2px solid ${p.wall}`,
              }}
            >
              <SignCopy row gap={5}>
                <Mark brand={brand} c={c} p={p} on={fascia} size={16} />
                <Primary c={c} style={headingStyle(p, fascia, 13)} />
              </SignCopy>
            </Print>
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
              <Badge c={c} on={p.paper} p={p} />
            </div>
            <DeclareRest c={c} omit={['primaryText', 'badge']} />
          </Scene>
        );
      },
    },
    {
      name: 'Blade Sign',
      category: 'Signage',
      tags: ['Hospitality', 'Street', 'Craft'],
      render: ({ brand, c, p }) => {
        const wall = p.wall;
        const face = p.brand;
        return (
          <Scene ground={wall}>
            <SceneLight x={20} y={12} strength={0.34} />
            {/* The wall's coursing, so the sign has something to hang off. */}
            <SceneSvg style={{ inset: 0 }}>
              <rect x="0" y="0" width="100" height="100" fill={p.dark} opacity="0.05" />
              <rect x="0" y="30" width="100" height="0.6" fill={p.dark} opacity="0.14" />
              <rect x="0" y="62" width="100" height="0.6" fill={p.dark} opacity="0.14" />
            </SceneSvg>
            {/* The bracket. */}
            <SceneSvg style={{ inset: 'auto', left: '8%', top: '16%', width: '26%', height: '16%' }}>
              {/* The arm meets the sign's top edge; the post carries down
                  past it. A bracket floating above what it holds is the
                  detail that makes a vector scene read as clip art. */}
              <rect x="0" y="34" width="100" height="14" fill={p.dark} opacity="0.65" />
              <rect x="0" y="0" width="12" height="100" fill={p.dark} opacity="0.65" />
            </SceneSvg>
            <Print
              bg={face}
              style={{
                left: '30%',
                top: '22%',
                width: '46%',
                height: '46%',
                borderRadius: 4,
                boxShadow: '0 8px 18px rgba(0,0,0,0.24)',
              }}
            >
              <SignCopy gap={3}>
                <Mark brand={brand} c={c} p={p} on={face} size={20} />
                <Primary c={c} style={headingStyle(p, face, 11)} />
                <Secondary c={c} style={{ ...noteStyle(p, face, 5), color: ink(face) }} />
              </SignCopy>
            </Print>
            <DeclareRest c={c} omit={['primaryText', 'secondaryText']} />
          </Scene>
        );
      },
    },
    {
      name: 'Window Vinyl',
      category: 'Signage',
      tags: ['Retail', 'Minimal', 'Studio'],
      render: ({ brand, c, p }) => {
        const glass = p.dark;
        return (
          <Scene ground={p.wall}>
            <SceneLight x={72} y={12} strength={0.28} />
            <Print bg={glass} style={{ left: '8%', top: '10%', right: '8%', bottom: '10%', borderRadius: 2 }}>
              {/* The reflection: a pale diagonal, kept clear of the type. */}
              <SceneSvg style={{ inset: 0 }}>
                <path d="M0 100 L34 0 L52 0 L18 100 Z" fill="#ffffff" opacity="0.06" />
              </SceneSvg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 3,
                  padding: '0 12%',
                }}
              >
                <Mark brand={brand} c={c} p={p} on={glass} size={18} />
                <Primary c={c} style={headingStyle(p, glass, 12)} />
                <div style={{ height: 1.5, width: '30%', backgroundColor: accentOn(glass, p) }} />
                <Secondary c={c} style={noteStyle(p, glass, 5)} wrap />
                <Url c={c} style={noteStyle(p, glass, 4.5)} />
              </div>
            </Print>
            <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
          </Scene>
        );
      },
    },
    {
      name: 'Monument Sign',
      category: 'Signage',
      tags: ['Corporate', 'Outdoor', 'Formal'],
      render: ({ brand, c, p }) => {
        // A monument is stone, and stone is DARK. In the brand's mid
        // neutral it disappeared into the forecourt behind it.
        const stone = p.dark;
        const plate = p.brand;
        return (
          <Scene ground={p.paper}>
            <SceneLight x={34} y={14} strength={0.42} />
            <CastShadow cx={50} cy={84} rx={28} ry={3} opacity={0.18} />
            <Print bg={stone} style={{ left: '14%', top: '26%', width: '72%', height: '56%', borderRadius: '4px 4px 0 0' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '8%',
                  right: '8%',
                  top: '12%',
                  height: '44%',
                  backgroundColor: plate,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  padding: '0 8%',
                  textAlign: 'center',
                }}
              >
                <Mark brand={brand} c={c} p={p} on={plate} size={15} />
                <Primary c={c} style={headingStyle(p, plate, 10)} />
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: '8%',
                  right: '8%',
                  bottom: '12%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  textAlign: 'center',
                }}
              >
                <Secondary c={c} style={noteStyle(p, stone, 5)} wrap />
                <Url c={c} style={noteStyle(p, stone, 4.5)} />
              </div>
            </Print>
            <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
          </Scene>
        );
      },
    },
    {
      name: 'Reception Wall',
      category: 'Signage',
      tags: ['Office', 'Interior', 'Quiet'],
      render: ({ brand, c, p }) => {
        const wall = p.paper;
        return (
          <Scene ground={wall}>
            <SceneLight x={64} y={10} strength={0.36} />
            {/* The floor line, so the wall reads as a room. */}
            <Print bg={p.wall} style={{ left: 0, right: 0, top: '78%', bottom: 0 }}>
              <span style={{ display: 'block', width: 0, height: 0 }} />
            </Print>
            <div
              style={{
                position: 'absolute',
                left: '12%',
                top: '22%',
                right: '12%',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {/* Cut letters stand off the wall — a shadow, not a panel. */}
              <div style={{ filter: 'drop-shadow(2px 3px 3px rgba(0,0,0,0.28))' }}>
                <Mark brand={brand} c={c} p={p} on={wall} size={22} />
              </div>
              <Primary
                c={c}
                style={{
                  ...headingStyle(p, wall, 15),
                  filter: 'drop-shadow(2px 3px 3px rgba(0,0,0,0.24))',
                }}
              />
              <Secondary c={c} style={noteStyle(p, wall, 5.5)} wrap />
            </div>
            <div style={{ position: 'absolute', left: '12%', bottom: '10%' }}>
              <Badge c={c} on={p.wall} p={p} />
            </div>
            <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'badge']} />
          </Scene>
        );
      },
    },
    {
      name: 'Awning',
      category: 'Signage',
      tags: ['Hospitality', 'Street', 'Warm'],
      render: ({ c, p }) => {
        const awning = p.brand;
        const wall = p.wall;
        return (
          <Scene ground={wall}>
            <SceneLight x={40} y={8} strength={0.34} />
            {/* The awning's slope, drawn under its flat valance. */}
            <SceneSvg style={{ inset: 'auto', left: '6%', top: '20%', width: '88%', height: '26%' }}>
              <path d="M0 100 L10 0 L90 0 L100 100 Z" fill={awning} />
              <path d="M0 100 L10 0 L20 0 L12 100 Z" fill="#000000" opacity="0.1" />
              <path d="M88 0 L90 0 L100 100 L88 100 Z" fill="#000000" opacity="0.1" />
            </SceneSvg>
            <Print bg={awning} style={{ left: '6%', top: '46%', right: '6%', height: '16%' }}>
              <SignCopy row gap={6}>
                <Primary c={c} style={headingStyle(p, awning, 11)} />
                <Url c={c} style={{ ...noteStyle(p, awning, 5), color: ink(awning) }} />
              </SignCopy>
            </Print>
            {/* The pavement under it. */}
            <Print bg={p.paper} style={{ left: 0, right: 0, top: '82%', bottom: 0 }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Secondary c={c} style={noteStyle(p, p.paper, 5)} />
              </div>
            </Print>
            <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
          </Scene>
        );
      },
    },
  ],
  21,
);
