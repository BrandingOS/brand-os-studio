/**
 * Device Screen — the brand as software.
 *
 * Six vector scenes: a phone splash, a laptop with a site on it, a tablet,
 * two phones side by side, a desktop hero and an app icon on a home
 * screen. The device shell is a rounded slab in the brand's near-black; the
 * SCREEN is the print face, and everything the customer reads sits on it,
 * so the ink is measured against the interface colour and not against the
 * bezel.
 *
 * Ids: `mockups-ext-33 … -38`, the last range of the shared `mockups` id
 * space (Signage 21–26, Business Card Stack 27–32).
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

/* ── The object ───────────────────────────────────────────────────── */

/**
 * A device: a shell with a screen inset into it.
 *
 * The bezel is a `shell`-coloured box and the screen a `Print` inset by a
 * percentage of it, which is why a phone's bezel looks thin and a laptop's
 * looks like a lid — the SAME component, given different insets.
 */
function Device({
  shell,
  screen,
  style,
  bezel = '3%',
  radius = 10,
  screenRadius = 6,
  children,
  notch = false,
}: {
  shell: string;
  screen: string;
  style: CSSProperties;
  bezel?: string;
  radius?: number;
  screenRadius?: number;
  children: ReactNode;
  notch?: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        backgroundColor: shell,
        borderRadius: radius,
        boxShadow: '0 8px 20px rgba(0,0,0,0.26)',
        ...style,
      }}
    >
      <Print
        bg={screen}
        style={{ left: bezel, top: bezel, right: bezel, bottom: bezel, borderRadius: screenRadius }}
      >
        {children}
      </Print>
      {notch ? (
        <div
          style={{
            position: 'absolute',
            left: '38%',
            top: '3.4%',
            width: '24%',
            height: '2.6%',
            backgroundColor: shell,
            borderRadius: 999,
          }}
        />
      ) : null}
    </div>
  );
}

/** A browser chrome strip: three dots and an address field. */
function BrowserBar({ on, p, children }: { on: string; p: MockupPalette; children?: ReactNode }) {
  const dot = ink(on) === '#ffffff' ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.22)';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: '3% 4%',
        borderBottom: `1px solid ${dot}`,
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{ width: 3, height: 3, borderRadius: 999, backgroundColor: dot, flex: '0 0 auto' }}
        />
      ))}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          marginLeft: 3,
          padding: '1px 5px',
          borderRadius: 999,
          backgroundColor: dot,
          fontFamily: p.body,
          fontSize: 4,
          color: ink(on),
          overflow: 'hidden',
        }}
      >
        {children}
      </span>
    </div>
  );
}

function headingStyle(p: MockupPalette, face: string, size: number) {
  return {
    fontFamily: p.heading,
    fontSize: size,
    lineHeight: 1.06,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: ink(face),
    maxWidth: '100%',
  };
}

function noteStyle(p: MockupPalette, face: string, size = 4.5) {
  return {
    fontFamily: p.body,
    fontSize: size,
    lineHeight: 1.35,
    color: mutedOn(face),
    maxWidth: '100%',
  };
}

/** A centred splash column. */
function Splash({ children, gap = 3 }: { children: ReactNode; gap?: number }) {
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
        padding: '0 10%',
      }}
    >
      {children}
    </div>
  );
}

/* ── The six scenes ───────────────────────────────────────────────── */

export const DEVICE_SCENES: ReadonlyArray<MockupScene> = withIds(
  [
    {
      name: 'Phone Splash',
      category: 'Digital',
      tags: ['App', 'Launch', 'Bold'],
      render: ({ brand, c, p }) => {
        const screen = p.brand;
        return (
          <Scene ground={p.wall}>
            <SceneLight x={30} y={12} strength={0.4} />
            <CastShadow cx={50} cy={90} rx={18} ry={2.4} opacity={0.2} />
            <Device
              shell={p.dark}
              screen={screen}
              notch
              style={{ left: '32%', top: '8%', width: '36%', height: '84%' }}
              bezel="4%"
              radius={14}
              screenRadius={10}
            >
              <Splash>
                <Mark brand={brand} c={c} p={p} on={screen} size={24} />
                <Primary c={c} style={headingStyle(p, screen, 11)} />
                <Secondary c={c} style={{ ...noteStyle(p, screen, 5), color: ink(screen) }} wrap />
              </Splash>
            </Device>
            <DeclareRest c={c} omit={['primaryText', 'secondaryText']} />
          </Scene>
        );
      },
    },
    {
      name: 'Laptop Site',
      category: 'Digital',
      tags: ['Web', 'Marketing', 'Product'],
      render: ({ brand, c, p }) => {
        const screen = p.paper;
        return (
          <Scene ground={p.wall}>
            <SceneLight x={40} y={10} strength={0.36} />
            <CastShadow cx={50} cy={84} rx={38} ry={3} opacity={0.2} />
            <Device
              shell={p.dark}
              screen={screen}
              style={{ left: '8%', top: '16%', width: '84%', height: '58%' }}
              bezel="2.5%"
              radius={6}
              screenRadius={2}
            >
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
                <BrowserBar on={screen} p={p}>
                  <Url c={c} style={{ fontFamily: p.body, fontSize: 4, color: ink(screen) }} />
                </BrowserBar>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 3,
                    padding: '0 8%',
                  }}
                >
                  <Mark brand={brand} c={c} p={p} on={screen} size={13} />
                  <Primary c={c} style={headingStyle(p, screen, 13)} />
                  <Secondary c={c} style={noteStyle(p, screen, 5)} wrap />
                  {/* The call to action IS the badge — its pill already
                      picks a brand colour that reads on this screen and
                      inks itself against that pill. */}
                  <Badge c={c} on={screen} p={p} style={{ alignSelf: 'flex-start' }} />
                </div>
              </div>
            </Device>
            {/* The base the lid hinges on. */}
            <div
              style={{
                position: 'absolute',
                left: '2%',
                top: '74%',
                width: '96%',
                height: '5%',
                backgroundColor: p.dark,
                borderRadius: '0 0 6px 6px',
              }}
            />
          </Scene>
        );
      },
    },
    {
      name: 'Tablet Reader',
      category: 'Digital',
      tags: ['Editorial', 'Content', 'Calm'],
      render: ({ brand, c, p }) => {
        const screen = p.paper;
        const band = p.brand;
        return (
          <Scene ground={p.wall}>
            <SceneLight x={64} y={12} strength={0.4} />
            <CastShadow cx={50} cy={88} rx={28} ry={2.8} opacity={0.18} />
            <Device
              shell={p.dark}
              screen={screen}
              style={{ left: '18%', top: '8%', width: '64%', height: '80%' }}
              bezel="3.5%"
              radius={10}
              screenRadius={5}
            >
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    backgroundColor: band,
                    padding: '6% 8%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Mark brand={brand} c={c} p={p} on={band} size={11} />
                  <Primary c={c} style={headingStyle(p, band, 8)} />
                </div>
                <div style={{ flex: 1, padding: '7% 8%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Secondary c={c} style={{ ...noteStyle(p, screen, 5.5), color: ink(screen) }} wrap />
                  {/* Body copy as ruled lines — a reader, not lorem. */}
                  {[92, 100, 86, 96, 70].map((w, i) => (
                    <div
                      key={i}
                      style={{
                        height: 2,
                        width: `${w}%`,
                        backgroundColor: mutedOn(screen),
                        opacity: 0.32,
                        borderRadius: 2,
                      }}
                    />
                  ))}
                  <Url c={c} style={{ ...noteStyle(p, screen, 4.5), marginTop: 'auto' }} />
                </div>
              </div>
            </Device>
            <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
          </Scene>
        );
      },
    },
    {
      name: 'Two Screens',
      category: 'Digital',
      tags: ['App', 'Flow', 'Product'],
      render: ({ brand, c, p }) => {
        const back = p.dark;
        const front = p.brand;
        return (
          <Scene ground={p.paper}>
            <SceneLight x={44} y={10} strength={0.32} />
            <CastShadow cx={34} cy={86} rx={14} ry={2} opacity={0.16} />
            <CastShadow cx={68} cy={92} rx={15} ry={2.2} opacity={0.2} />
            {/* A silver shell, because this phone's SCREEN is the brand's
                near-black: on a near-black shell there is no bezel and the
                device reads as a flat rectangle rather than a phone. */}
            <Device
              shell={p.wall}
              screen={back}
              style={{ left: '10%', top: '6%', width: '38%', height: '78%' }}
              bezel="4%"
              radius={12}
              screenRadius={8}
            >
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
                <Mark brand={brand} c={c} p={p} on={back} size={12} />
                <div>
                  <Primary c={c} style={headingStyle(p, back, 8)} />
                  <Url c={c} style={noteStyle(p, back, 4)} />
                </div>
              </div>
            </Device>
            <Device
              shell={p.dark}
              screen={front}
              notch
              style={{ left: '50%', top: '16%', width: '40%', height: '80%' }}
              bezel="4%"
              radius={12}
              screenRadius={8}
            >
              <Splash gap={2}>
                <Badge c={c} on={front} p={p} />
                <Secondary c={c} style={{ ...noteStyle(p, front, 5.5), color: ink(front) }} wrap />
              </Splash>
            </Device>
            <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url', 'badge']} />
          </Scene>
        );
      },
    },
    {
      name: 'Desktop Hero',
      category: 'Digital',
      tags: ['Web', 'Hero', 'Statement'],
      render: ({ brand, c, p }) => {
        const screen = p.dark;
        return (
          <Scene ground={p.wall}>
            <SceneLight x={50} y={10} strength={0.3} />
            <CastShadow cx={50} cy={90} rx={22} ry={2.4} opacity={0.2} />
            <Device
              shell={p.dark}
              screen={screen}
              style={{ left: '5%', top: '14%', width: '90%', height: '58%' }}
              bezel="2%"
              radius={5}
              screenRadius={2}
            >
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '3% 5%',
                  }}
                >
                  <Mark brand={brand} c={c} p={p} on={screen} size={9} />
                  <Url c={c} style={noteStyle(p, screen, 4)} />
                </div>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    gap: 3,
                    padding: '0 12%',
                  }}
                >
                  <Primary c={c} style={headingStyle(p, screen, 16)} />
                  <Secondary c={c} style={noteStyle(p, screen, 5)} wrap />
                  <Badge c={c} on={screen} p={p} style={{ marginTop: 2 }} />
                </div>
              </div>
            </Device>
            {/* Stand: a neck and a foot. */}
            <div
              style={{
                position: 'absolute',
                left: '46%',
                top: '72%',
                width: '8%',
                height: '10%',
                backgroundColor: p.dark,
                opacity: 0.85,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '34%',
                top: '82%',
                width: '32%',
                height: '3%',
                backgroundColor: p.dark,
                borderRadius: 3,
              }}
            />
          </Scene>
        );
      },
    },
    {
      name: 'App Icon',
      category: 'Digital',
      tags: ['App', 'Icon', 'Home Screen'],
      render: ({ brand, c, p }) => {
        const screen = p.paper;
        const tile = p.brand;
        const neighbour = p.wall;
        return (
          <Scene ground={p.wall}>
            <SceneLight x={30} y={12} strength={0.38} />
            <CastShadow cx={50} cy={90} rx={18} ry={2.4} opacity={0.2} />
            <Device
              shell={p.dark}
              screen={screen}
              notch
              style={{ left: '30%', top: '6%', width: '40%', height: '86%' }}
              bezel="4%"
              radius={14}
              screenRadius={10}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '14% 12%',
                }}
              >
                {/* The brand's icon, large, with the neighbours it lives beside. */}
                <div
                  style={{
                    width: '58%',
                    aspectRatio: '1 / 1',
                    backgroundColor: tile,
                    borderRadius: '22%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.22)',
                  }}
                >
                  <Mark brand={brand} c={c} p={p} on={tile} size={20} />
                </div>
                <Primary c={c} style={{ ...headingStyle(p, screen, 7), textAlign: 'center' }} />
                <div style={{ display: 'flex', gap: 4, width: '100%', marginTop: 2 }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        aspectRatio: '1 / 1',
                        backgroundColor: neighbour,
                        borderRadius: '22%',
                      }}
                    />
                  ))}
                </div>
                <div style={{ marginTop: 'auto', textAlign: 'center' }}>
                  <Secondary c={c} style={noteStyle(p, screen, 4.5)} wrap />
                  <Url c={c} style={noteStyle(p, screen, 4)} />
                </div>
              </div>
            </Device>
            <DeclareRest c={c} omit={['primaryText', 'secondaryText', 'url']} />
          </Scene>
        );
      },
    },
  ],
  33,
);
