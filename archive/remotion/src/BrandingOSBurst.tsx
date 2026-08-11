import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';

export const BURST_FPS = 30;
export const BURST_DURATION = 6 * BURST_FPS; // 180 frames = 6s

const ORANGE = '#FF6A1A';
const ORANGE_DEEP = '#E8530A';
const ORANGE_SOFT = '#FFB070';
const BG = '#050507';
const INK = '#0E0E10';
const FOG = 'rgba(255,106,26,0.08)';
const CARD_BG = '#0F0F12';
const CARD_BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#F4F2EC';
const MUTED = '#9A9AA4';

const FONT =
  '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif';

// ============ TIMING KEYS (frames) ============
const F_PIXEL_IN = 0;
const F_PIXEL_HOLD = 6;
const F_BURST = 15; // pixel bursts -> logo
const F_LOGO_SETTLED = 24;
const F_LINES = 26; // all 6 lines shoot out
const F_CARDS_START = 30; // staggered per-card

const CARD_TIMINGS = [
  F_CARDS_START + 0, // color palette
  F_CARDS_START + 6, // typography
  F_CARDS_START + 14, // guidelines
  F_CARDS_START + 22, // social
  F_CARDS_START + 30, // business card
  F_CARDS_START + 36, // phone
];

const F_PULLBACK = 100;
const F_HOLD_END = 140;
const F_PULSE = 148;
const F_FREEZE = 160;
const F_TEXT_START = 162;

// ============ LAYOUT (1080x1920) ============

const CENTER = { x: 540, y: 960 };
const LOGO_SIZE = 176;

type CardSlot = {
  id: string;
  center: { x: number; y: number };
  w: number;
  h: number;
};

const SLOTS: CardSlot[] = [
  { id: 'color', center: { x: 280, y: 370 }, w: 440, h: 220 }, // top-left
  { id: 'type', center: { x: 800, y: 370 }, w: 440, h: 220 }, // top-right (rebalanced centers below)
  { id: 'guide', center: { x: 260, y: 700 }, w: 440, h: 220 }, // left-mid-upper
  { id: 'social', center: { x: 820, y: 700 }, w: 440, h: 220 }, // right-mid-upper
  { id: 'bcard', center: { x: 260, y: 1220 }, w: 440, h: 220 }, // left-lower
  { id: 'phone', center: { x: 820, y: 1220 }, w: 440, h: 220 }, // right-lower
];

// Recompute centers so cards never exit canvas (half-width = 220 → min x 220 max 860)
SLOTS[0].center = { x: 280, y: 370 };
SLOTS[1].center = { x: 800, y: 370 };
SLOTS[2].center = { x: 260, y: 700 };
SLOTS[3].center = { x: 820, y: 700 };
SLOTS[4].center = { x: 260, y: 1220 };
SLOTS[5].center = { x: 820, y: 1220 };

// Also one bottom-center anchor for the phone instead? Keep 6 to two columns.

// ============ LOGO ============

const Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pixel → burst scale
  const preBurst = interpolate(frame, [F_PIXEL_IN, F_PIXEL_HOLD], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pixelSize = preBurst * 4; // tiny dot grows to 4px

  // Burst with spring overshoot
  const burstT = spring({
    frame: frame - F_BURST,
    fps,
    config: { damping: 10, mass: 0.5, stiffness: 180 },
    from: 0,
    to: 1,
  });
  const burstScale = burstT;

  // Decide mode: pre-burst = dot; post-burst = logo
  const logoVisible = frame >= F_BURST;

  // Pulse at F_PULSE
  const pulseT = spring({
    frame: frame - F_PULSE,
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 220 },
    from: 0,
    to: 1,
  });
  const pulse = frame >= F_PULSE ? 1 + Math.sin(pulseT * Math.PI) * 0.08 : 1;

  const size = LOGO_SIZE * burstScale * pulse;
  const r = size * 0.26;

  return (
    <>
      {/* Pre-burst pixel */}
      {!logoVisible && (
        <div
          style={{
            position: 'absolute',
            left: CENTER.x - pixelSize / 2,
            top: CENTER.y - pixelSize / 2,
            width: pixelSize,
            height: pixelSize,
            borderRadius: pixelSize,
            background: '#fff',
            boxShadow: `0 0 ${12 * preBurst}px rgba(255,255,255,0.9), 0 0 ${28 * preBurst}px rgba(255,180,120,0.5)`,
          }}
        />
      )}

      {/* Logo tile */}
      {logoVisible && (
        <div
          style={{
            position: 'absolute',
            left: CENTER.x - size / 2,
            top: CENTER.y - size / 2,
            width: size,
            height: size,
            borderRadius: r,
            background: `linear-gradient(155deg, ${ORANGE} 0%, ${ORANGE_DEEP} 100%)`,
            boxShadow: `
              0 0 60px rgba(255,106,26,0.55),
              0 0 140px rgba(255,106,26,0.30),
              0 20px 50px rgba(232,83,10,0.35),
              inset 0 1px 0 rgba(255,255,255,0.4)
            `,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: r,
              background:
                'radial-gradient(120% 80% at 30% 15%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 55%)',
            }}
          />
          <svg
            width={size * 0.55}
            height={size * 0.55}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
          >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            <path d="M20 3v4" />
            <path d="M22 5h-4" />
            <path d="M4 17v2" />
            <path d="M5 18H3" />
          </svg>
        </div>
      )}
    </>
  );
};

// ============ RIPPLES ============

const Ripples: React.FC = () => {
  const frame = useCurrentFrame();
  const ripples = [0, 6, 12];
  return (
    <>
      {ripples.map((delay, i) => {
        const start = F_BURST + delay;
        const t = interpolate(frame, [start, start + 30], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
        if (t <= 0 || t >= 1) return null;
        const r = 40 + t * 520;
        const op = (1 - t) * 0.6;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: CENTER.x - r,
              top: CENTER.y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              border: `2px solid rgba(255,106,26,${op})`,
              boxShadow: `0 0 30px rgba(255,106,26,${op * 0.6})`,
            }}
          />
        );
      })}
    </>
  );
};

// ============ CONNECTOR LINES ============

const Lines: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg
      width={1080}
      height={1920}
      viewBox="0 0 1080 1920"
      style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
    >
      <defs>
        <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {SLOTS.map((slot, i) => {
        const t = interpolate(frame, [F_LINES, F_LINES + 8], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
        // Endpoint: just outside nearest card edge toward center
        const dx = slot.center.x - CENTER.x;
        const dy = slot.center.y - CENTER.y;
        const len = Math.hypot(dx, dy);
        const nx = dx / len;
        const ny = dy / len;
        // line from logo edge (radius ~88) to card edge
        const startR = 92;
        const endR = len - 120;
        const sx = CENTER.x + nx * startR;
        const sy = CENTER.y + ny * startR;
        const ex = CENTER.x + nx * (startR + (endR - startR) * t);
        const ey = CENTER.y + ny * (startR + (endR - startR) * t);

        // fade out once card has landed
        const cardLand = CARD_TIMINGS[i] + 12;
        const fade = interpolate(frame, [cardLand, cardLand + 20], [1, 0.35], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <g key={slot.id} filter="url(#lineGlow)" opacity={fade}>
            <line
              x1={sx}
              y1={sy}
              x2={ex}
              y2={ey}
              stroke={ORANGE}
              strokeWidth={2.2}
              strokeLinecap="round"
            />
            {t > 0.1 && (
              <circle cx={ex} cy={ey} r={3.5} fill="#fff" opacity={1 - t * 0.5} />
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ============ CARD CONTENTS ============

function ColorPaletteContent() {
  const frame = useCurrentFrame();
  const startF = CARD_TIMINGS[0] + 8;
  const swatches = [ORANGE, '#F59E0B', '#111827', '#E5E5DD', '#6B7280'];
  return (
    <div style={{ display: 'flex', gap: 10, width: '100%' }}>
      {swatches.map((c, i) => {
        const t = interpolate(frame, [startF + i * 3, startF + i * 3 + 8], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: 80,
              borderRadius: 12,
              background: c,
              transform: `scale(${0.6 + t * 0.4})`,
              opacity: t,
              boxShadow: `0 0 20px ${c}55, inset 0 0 0 1px rgba(255,255,255,0.08)`,
            }}
          />
        );
      })}
    </div>
  );
}

function TypographyContent() {
  const frame = useCurrentFrame();
  const startF = CARD_TIMINGS[1] + 8;
  const text = 'BrandingOS';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ fontSize: 42, fontWeight: 700, color: TEXT, letterSpacing: -1.2, lineHeight: 1 }}>
        {text.split('').map((ch, i) => {
          const t = interpolate(frame, [startF + i * 2, startF + i * 2 + 5], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                opacity: t,
                transform: `translateY(${(1 - t) * 10}px)`,
                color: i >= 8 ? ORANGE : TEXT,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {['Display', 'Body', 'Caption'].map((s, i) => (
          <div
            key={i}
            style={{
              fontSize: 11,
              color: MUTED,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: 999,
              border: `1px solid ${CARD_BORDER}`,
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

function GuidelinesContent() {
  const frame = useCurrentFrame();
  const startF = CARD_TIMINGS[2] + 10;
  return (
    <div style={{ display: 'flex', gap: 10, perspective: 600 }}>
      {[0, 1, 2, 3].map((i) => {
        const t = spring({
          frame: frame - (startF + i * 3),
          fps: BURST_FPS,
          config: { damping: 12, mass: 0.7 },
          from: 0,
          to: 1,
        });
        const rot = (i - 1.5) * 8 * t;
        return (
          <div
            key={i}
            style={{
              width: 70,
              height: 100,
              borderRadius: 6,
              background: i === 0 ? `linear-gradient(160deg, ${ORANGE}, ${ORANGE_DEEP})` : '#1A1A1F',
              border: `1px solid ${CARD_BORDER}`,
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              transform: `translateY(${(1 - t) * -30}px) rotate(${rot}deg) scale(${0.8 + t * 0.2})`,
              transformOrigin: 'bottom center',
              opacity: t,
              boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ height: 5, width: '55%', background: i === 0 ? '#fff' : ORANGE, borderRadius: 2 }} />
            <div style={{ height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }} />
            <div style={{ height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2, width: '80%' }} />
            <div style={{ height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2, width: '55%' }} />
          </div>
        );
      })}
    </div>
  );
}

function SocialContent() {
  const frame = useCurrentFrame();
  const startF = CARD_TIMINGS[3] + 6;
  // Two halves slide from left and right, meet in middle
  const t = spring({
    frame: frame - startF,
    fps: BURST_FPS,
    config: { damping: 16, mass: 0.7 },
    from: 0,
    to: 1,
  });
  const leftX = (1 - t) * -80;
  const rightX = (1 - t) * 80;
  return (
    <div style={{ display: 'flex', gap: 6, width: '100%', alignItems: 'stretch' }}>
      {/* Left half — 3 feed tiles */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 6,
          transform: `translateX(${leftX}px)`,
          opacity: t,
        }}
      >
        {[
          `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DEEP})`,
          '#1A1A1F',
          `linear-gradient(160deg, ${ORANGE_SOFT}, ${ORANGE})`,
          '#0E0E10',
        ].map((bg, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1 / 1',
              background: bg,
              borderRadius: 8,
              border: `1px solid ${CARD_BORDER}`,
            }}
          />
        ))}
      </div>
      {/* Right half — story preview */}
      <div
        style={{
          width: 78,
          transform: `translateX(${rightX}px)`,
          opacity: t,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 70,
            height: 126,
            borderRadius: 10,
            background: `linear-gradient(165deg, ${ORANGE_DEEP}, ${ORANGE} 55%, ${ORANGE_SOFT})`,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 18px rgba(232,83,10,0.35)',
          }}
        >
          <div style={{ display: 'flex', gap: 3 }}>
            <div style={{ flex: 1, height: 2, background: '#fff', borderRadius: 1 }} />
            <div style={{ flex: 1, height: 2, background: '#fff', borderRadius: 1, opacity: 0.4 }} />
          </div>
          <div
            style={{
              alignSelf: 'center',
              width: 24,
              height: 24,
              borderRadius: 12,
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: `7px solid ${ORANGE_DEEP}`,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                marginLeft: 2,
              }}
            />
          </div>
          <div style={{ height: 3, background: '#fff', borderRadius: 2, width: '70%' }} />
        </div>
      </div>
    </div>
  );
}

function BusinessCardContent() {
  const frame = useCurrentFrame();
  const startF = CARD_TIMINGS[4];
  // One-shot Y-axis flip then freeze at sharp angle
  const flipT = interpolate(frame, [startF, startF + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const rotY = (1 - flipT) * 180 + 8; // rests at 8° sharp angle
  const opacity = interpolate(frame, [startF, startF + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', perspective: 900 }}>
      <div
        style={{
          width: 250,
          height: 140,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #1A1A1F 0%, #0A0A0C 100%)',
          border: `1px solid ${CARD_BORDER}`,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transform: `rotateY(${rotY}deg) rotateX(-6deg)`,
          transformStyle: 'preserve-3d',
          opacity,
          boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 40px rgba(255,106,26,0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* catch-light highlight */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(115deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0) 60%)',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, zIndex: 1 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: `linear-gradient(155deg, ${ORANGE}, ${ORANGE_DEEP})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
          </div>
          <div style={{ color: TEXT, fontWeight: 700, fontSize: 16, letterSpacing: -0.4 }}>
            Branding<span style={{ color: ORANGE }}>OS</span>
          </div>
        </div>
        <div style={{ zIndex: 1 }}>
          <div style={{ color: TEXT, fontSize: 13, fontWeight: 500 }}>Hamza Ezzat</div>
          <div style={{ color: MUTED, fontSize: 10 }}>Founder · brandingos.ai</div>
        </div>
      </div>
    </div>
  );
}

function PhoneContent() {
  const frame = useCurrentFrame();
  const startF = CARD_TIMINGS[5];
  const riseT = spring({
    frame: frame - startF,
    fps: BURST_FPS,
    config: { damping: 16, mass: 0.7 },
    from: 0,
    to: 1,
  });
  const scrollT = interpolate(frame, [startF + 12, startF + 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scrollY = -scrollT * 60;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
      <div
        style={{
          width: 90,
          height: 170,
          borderRadius: 16,
          background: '#0A0A0C',
          padding: 4,
          border: `1px solid ${CARD_BORDER}`,
          transform: `translateY(${(1 - riseT) * 80}px)`,
          opacity: riseT,
          boxShadow: '0 20px 40px rgba(0,0,0,0.7), 0 0 30px rgba(255,106,26,0.25)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 12,
            background: '#FAFAF6',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Scrolling content */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translateY(${scrollY}px)`,
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div
              style={{
                height: 46,
                borderRadius: 6,
                background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DEEP})`,
              }}
            />
            <div style={{ height: 6, background: '#111', borderRadius: 2, width: '60%' }} />
            <div style={{ height: 4, background: '#E5E5DD', borderRadius: 2 }} />
            <div style={{ height: 4, background: '#E5E5DD', borderRadius: 2, width: '75%' }} />
            <div style={{ height: 20, width: 40, background: ORANGE, borderRadius: 4, marginTop: 4 }} />
            <div style={{ height: 36, background: '#F3F3ED', borderRadius: 6, marginTop: 6 }} />
            <div style={{ height: 36, background: '#0E0E10', borderRadius: 6 }} />
            <div style={{ height: 36, background: '#F3F3ED', borderRadius: 6 }} />
            <div style={{ height: 36, background: `linear-gradient(135deg, ${ORANGE_SOFT}, ${ORANGE})`, borderRadius: 6 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ CARD WRAPPER ============

const CardShell: React.FC<{
  slot: CardSlot;
  title: string;
  sub: string;
  children: React.ReactNode;
  landFrame: number;
  landStyle: 'snap' | 'fromRight' | 'fromAbove' | 'fromSides' | 'flip' | 'fromBelow';
}> = ({ slot, title, sub, children, landFrame, landStyle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const t = spring({
    frame: frame - landFrame,
    fps,
    config: { damping: 18, mass: 0.7, stiffness: 220 },
    from: 0,
    to: 1,
  });
  const op = interpolate(frame, [landFrame, landFrame + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  let transform = '';
  switch (landStyle) {
    case 'snap':
      transform = `scale(${0.4 + t * 0.6})`;
      break;
    case 'fromRight':
      transform = `translateX(${(1 - t) * 120}px) scale(${0.85 + t * 0.15})`;
      break;
    case 'fromAbove':
      transform = `translateY(${(1 - t) * -80}px) rotate(${(1 - t) * -6}deg)`;
      break;
    case 'fromSides':
      transform = `scale(${0.7 + t * 0.3})`;
      break;
    case 'flip':
      transform = `scale(${0.85 + t * 0.15})`;
      break;
    case 'fromBelow':
      transform = `translateY(${(1 - t) * 100}px) scale(${0.85 + t * 0.15})`;
      break;
  }

  // Pulse at F_PULSE — all elements pulse in unison
  const pulseT = spring({
    frame: frame - F_PULSE,
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 220 },
    from: 0,
    to: 1,
  });
  const pulse = frame >= F_PULSE ? 1 + Math.sin(pulseT * Math.PI) * 0.04 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: slot.center.x - slot.w / 2,
        top: slot.center.y - slot.h / 2,
        width: slot.w,
        height: slot.h,
        transform: `${transform} scale(${pulse})`,
        opacity: op,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: CARD_BG,
          borderRadius: 18,
          border: `1px solid ${CARD_BORDER}`,
          boxShadow: `
            0 30px 60px rgba(0,0,0,0.55),
            0 10px 30px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.04),
            0 0 40px rgba(255,106,26,${0.08 + (frame >= F_PULSE ? Math.sin(pulseT * Math.PI) * 0.12 : 0)})
          `,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          fontFamily: FONT,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, letterSpacing: -0.2 }}>{title}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{sub}</div>
          </div>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: ORANGE,
              boxShadow: `0 0 10px ${ORANGE}, 0 0 0 3px rgba(255,106,26,0.2)`,
              marginTop: 4,
            }}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ============ END TEXT ============

const EndText: React.FC = () => {
  const frame = useCurrentFrame();
  const text = 'Built in 5 minutes.';
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        fontFamily: FONT,
        fontSize: 36,
        fontWeight: 600,
        color: TEXT,
        letterSpacing: -0.6,
      }}
    >
      {text.split('').map((ch, i) => {
        const t = interpolate(frame, [F_TEXT_START + i * 1.2, F_TEXT_START + i * 1.2 + 4], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <span
            key={i}
            style={{
              opacity: t,
              transform: `translateY(${(1 - t) * 8}px)`,
              display: 'inline-block',
              whiteSpace: 'pre',
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// ============ SCENE ============

export const BrandingOSBurst: React.FC = () => {
  const frame = useCurrentFrame();

  // Camera pullback from F_PULLBACK to F_HOLD_END (scales stage slightly)
  const camT = interpolate(frame, [F_PULLBACK, F_PULLBACK + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const cameraScale = 1 - camT * 0.12; // 1 → 0.88

  // Background radial glow pulses with final heartbeat
  const heartbeat = frame >= F_PULSE ? Math.sin(((frame - F_PULSE) / 8) * Math.PI) : 0;
  const glowOpacity = 0.4 + heartbeat * 0.25;

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      {/* Vignette + radial glow behind logo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, rgba(255,106,26,${glowOpacity * 0.15}) 0%, rgba(0,0,0,0) 40%)`,
        }}
      />
      {/* Faint grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)',
          backgroundSize: '36px 36px',
          opacity: frame >= F_BURST ? 0.8 : 0,
          transition: 'opacity 0.3s',
        }}
      />

      {/* Camera stage */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${cameraScale})`,
          transformOrigin: '50% 50%',
        }}
      >
        {/* Ripples behind logo */}
        <Ripples />

        {/* Lines */}
        {frame >= F_LINES && <Lines />}

        {/* Cards */}
        {frame >= CARD_TIMINGS[0] && (
          <CardShell
            slot={SLOTS[0]}
            title="Color Palette"
            sub="Primary · Accent · Neutral"
            landFrame={CARD_TIMINGS[0]}
            landStyle="snap"
          >
            <ColorPaletteContent />
          </CardShell>
        )}
        {frame >= CARD_TIMINGS[1] && (
          <CardShell
            slot={SLOTS[1]}
            title="Typography"
            sub="Scale · Hierarchy"
            landFrame={CARD_TIMINGS[1]}
            landStyle="fromRight"
          >
            <TypographyContent />
          </CardShell>
        )}
        {frame >= CARD_TIMINGS[2] && (
          <CardShell
            slot={SLOTS[2]}
            title="Brand Guidelines"
            sub="Usage · Rules"
            landFrame={CARD_TIMINGS[2]}
            landStyle="fromAbove"
          >
            <GuidelinesContent />
          </CardShell>
        )}
        {frame >= CARD_TIMINGS[3] && (
          <CardShell
            slot={SLOTS[3]}
            title="Social Templates"
            sub="Posts · Stories"
            landFrame={CARD_TIMINGS[3]}
            landStyle="fromSides"
          >
            <SocialContent />
          </CardShell>
        )}
        {frame >= CARD_TIMINGS[4] && (
          <CardShell
            slot={SLOTS[4]}
            title="Business Card"
            sub="Print collateral"
            landFrame={CARD_TIMINGS[4]}
            landStyle="flip"
          >
            <BusinessCardContent />
          </CardShell>
        )}
        {frame >= CARD_TIMINGS[5] && (
          <CardShell
            slot={SLOTS[5]}
            title="Website UI"
            sub="Responsive · Live"
            landFrame={CARD_TIMINGS[5]}
            landStyle="fromBelow"
          >
            <PhoneContent />
          </CardShell>
        )}

        {/* Logo on top */}
        <Logo />
      </div>

      {/* End text */}
      {frame >= F_TEXT_START && <EndText />}
    </AbsoluteFill>
  );
};
