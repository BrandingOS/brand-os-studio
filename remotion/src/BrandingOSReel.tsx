import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';

export const FPS = 30;
export const DURATION_IN_FRAMES = 18 * FPS; // 18s

const ORANGE = '#FF6A1A';
const ORANGE_DEEP = '#E8530A';
const ORANGE_SOFT = '#FFB070';
const INK = '#0E0E10';
const INK_SOFT = '#3B3B42';
const MUTED = '#8A8A93';
const BG_TOP = '#FFFBF4';
const BG_MID = '#F6F3EC';
const BG_BOT = '#EFEAE0';
const CARD_BG = '#FFFFFF';
const BORDER = 'rgba(14,14,16,0.07)';

const FONT =
  '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif';

// ============ LOGO ============

const LogoMark: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 14, mass: 0.8 }, from: 0.55, to: 1 });
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const shine = interpolate(frame, [4, 24], [0, 1], { extrapolateRight: 'clamp' });
  const r = size * 0.28;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: `linear-gradient(155deg, ${ORANGE} 0%, ${ORANGE_DEEP} 100%)`,
        boxShadow:
          '0 30px 70px rgba(232,83,10,0.30), 0 10px 24px rgba(14,14,16,0.10), inset 0 1px 0 rgba(255,255,255,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${scale})`,
        opacity,
        position: 'relative',
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
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 100 100"
        style={{ opacity: shine, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' }}
      >
        <path
          d="M50 6 C 53 34, 66 47, 94 50 C 66 53, 53 66, 50 94 C 47 66, 34 53, 6 50 C 34 47, 47 34, 50 6 Z"
          fill="#fff"
        />
      </svg>
    </div>
  );
};

const Wordmark: React.FC = () => {
  const frame = useCurrentFrame();
  const start = 14;
  const p = interpolate(frame, [start, start + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        marginTop: 22,
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
        fontFamily: FONT,
        fontWeight: 700,
        letterSpacing: -1.2,
        fontSize: 56,
        color: INK,
        display: 'flex',
        alignItems: 'baseline',
      }}
    >
      <span>Branding</span>
      <span style={{ color: ORANGE }}>OS</span>
    </div>
  );
};

// ============ CARD LAYOUT ============

type CardDef = {
  id: string;
  title: string;
  sub: string;
  // position in canvas pixel coords (1080x1920 root)
  x: number; // top-left
  y: number;
  w: number;
  h: number;
  preview: React.ComponentType;
  // anchor point on the previous element for connector source
  fromAnchor?: { x: number; y: number };
  delay: number; // frames after global start
};

// Anchor under the wordmark
const SOURCE = { x: 540, y: 470 };

const CARDS: CardDef[] = [
  {
    id: 'palette',
    title: 'Brand Color Palette',
    sub: 'Tokens · Harmony · Contrast',
    x: 580,
    y: 540,
    w: 420,
    h: 240,
    preview: PalettePreview,
    fromAnchor: SOURCE,
    delay: 0,
  },
  {
    id: 'type',
    title: 'Typography System',
    sub: 'Display · Heading · Body',
    x: 80,
    y: 600,
    w: 460,
    h: 260,
    preview: TypographyPreview,
    fromAnchor: SOURCE,
    delay: 14,
  },
  {
    id: 'guidelines',
    title: 'Brand Guidelines',
    sub: 'Usage · Rules · Principles',
    x: 580,
    y: 830,
    w: 420,
    h: 220,
    preview: GuidelinesPreview,
    fromAnchor: { x: 790, y: 780 },
    delay: 30,
  },
  {
    id: 'social',
    title: 'Social Media Templates',
    sub: 'Posts · Stories · Reels',
    x: 80,
    y: 900,
    w: 460,
    h: 260,
    preview: SocialPreview,
    fromAnchor: { x: 310, y: 860 },
    delay: 46,
  },
  {
    id: 'mockups',
    title: 'Mockups & Print',
    sub: 'Collateral · Packaging',
    x: 580,
    y: 1100,
    w: 420,
    h: 260,
    preview: MockupPreview,
    fromAnchor: { x: 790, y: 1050 },
    delay: 62,
  },
  {
    id: 'web',
    title: 'Website & UI',
    sub: 'Sections · Components',
    x: 80,
    y: 1210,
    w: 460,
    h: 280,
    preview: WebPreview,
    fromAnchor: { x: 310, y: 1160 },
    delay: 80,
  },
  {
    id: 'ai',
    title: 'AI Generated Creative',
    sub: 'Generative outputs',
    x: 580,
    y: 1410,
    w: 420,
    h: 280,
    preview: AIPreview,
    fromAnchor: { x: 790, y: 1360 },
    delay: 96,
  },
];

const SYSTEM_START = 50; // frame when the system starts unfolding

// ============ CONNECTORS ============

const Connector: React.FC<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  delay: number;
  curveSide?: 'L' | 'R' | 'auto';
}> = ({ from, to, delay, curveSide = 'auto' }) => {
  const frame = useCurrentFrame();
  const start = SYSTEM_START + delay;
  const p = interpolate(frame, [start, start + 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // S-curve via cubic bezier
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const side =
    curveSide === 'auto' ? (dx >= 0 ? 'R' : 'L') : curveSide;
  const bend = Math.min(140, Math.abs(dy) * 0.45);

  // Two control points to make a soft S
  const c1x = from.x + (side === 'R' ? bend : -bend);
  const c1y = from.y + dy * 0.35;
  const c2x = to.x - (side === 'R' ? bend : -bend);
  const c2y = from.y + dy * 0.65;

  const d = `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`;

  // We use dashoffset to "draw" the line. Approximate length via straight segments.
  const approxLen =
    Math.hypot(c1x - from.x, c1y - from.y) +
    Math.hypot(c2x - c1x, c2y - c1y) +
    Math.hypot(to.x - c2x, to.y - c2y);

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={ORANGE}
        strokeOpacity={0.55}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={approxLen}
        strokeDashoffset={approxLen * (1 - p)}
      />
      {/* end dot */}
      <circle
        cx={to.x}
        cy={to.y}
        r={5}
        fill={ORANGE}
        opacity={interpolate(frame, [start + 18, start + 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
      />
      <circle
        cx={to.x}
        cy={to.y}
        r={11}
        fill={ORANGE}
        opacity={interpolate(frame, [start + 18, start + 26], [0, 0.18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
      />
    </g>
  );
};

const ConnectorLayer: React.FC = () => {
  return (
    <svg
      width={1080}
      height={1920}
      viewBox="0 0 1080 1920"
      style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
    >
      {CARDS.map((c) => {
        if (!c.fromAnchor) return null;
        // To = nearest top-edge of card (centered)
        const to = { x: c.x + c.w / 2, y: c.y };
        return (
          <Connector
            key={c.id}
            from={c.fromAnchor}
            to={to}
            delay={c.delay}
            curveSide={to.x >= c.fromAnchor.x ? 'R' : 'L'}
          />
        );
      })}
    </svg>
  );
};

// ============ CARD WRAPPER ============

const Card: React.FC<{ def: CardDef; index: number }> = ({ def, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = SYSTEM_START + def.delay + 18;
  const reveal = spring({
    frame: frame - start,
    fps,
    config: { damping: 16, mass: 0.7 },
    from: 0,
    to: 1,
  });
  const opacity = interpolate(frame, [start, start + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // subtle float
  const bob = Math.sin((frame - start) / 30 + index) * 2.5;

  const Preview = def.preview;

  return (
    <div
      style={{
        position: 'absolute',
        left: def.x,
        top: def.y,
        width: def.w,
        height: def.h,
        transform: `translateY(${(1 - reveal) * 22 + bob}px) scale(${0.95 + reveal * 0.05})`,
        opacity,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: CARD_BG,
          borderRadius: 22,
          border: `1px solid ${BORDER}`,
          boxShadow:
            '0 24px 50px rgba(14,14,16,0.07), 0 8px 18px rgba(14,14,16,0.05), inset 0 1px 0 rgba(255,255,255,0.95)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          fontFamily: FONT,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, color: INK, letterSpacing: -0.3 }}>{def.title}</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>{def.sub}</div>
          </div>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              background: ORANGE,
              boxShadow: `0 0 0 4px ${ORANGE}22`,
              marginTop: 6,
            }}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Preview />
        </div>
      </div>
    </div>
  );
};

// ============ PREVIEWS ============

function PalettePreview() {
  const swatches = [
    { c: ORANGE, name: 'Primary' },
    { c: '#111827', name: 'Ink' },
    { c: '#F59E0B', name: 'Accent' },
    { c: '#F3F4F6', name: 'Surface' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, width: '100%' }}>
      {swatches.map((s, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: s.c,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06), 0 6px 14px rgba(0,0,0,0.08)',
            }}
          />
          <div style={{ fontSize: 11, color: MUTED }}>{s.name}</div>
        </div>
      ))}
    </div>
  );
}

function TypographyPreview() {
  const samples = [
    { weight: 700, label: 'Display' },
    { weight: 500, label: 'Heading' },
    { weight: 400, label: 'Body' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, width: '100%' }}>
      {samples.map((s, i) => (
        <div
          key={i}
          style={{
            background: '#FAFAF6',
            borderRadius: 12,
            padding: '14px 10px',
            border: `1px solid ${BORDER}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 44,
              fontWeight: s.weight,
              color: INK,
              letterSpacing: -1.2,
              lineHeight: 1,
            }}
          >
            Aa
          </div>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>{s.label}</div>
          <div style={{ fontSize: 10, color: '#B5B5BD' }}>Inter</div>
        </div>
      ))}
    </div>
  );
}

function GuidelinesPreview() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: 70,
            height: 92,
            borderRadius: 8,
            background: '#FAFAF6',
            border: `1px solid ${BORDER}`,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            boxShadow: '0 4px 10px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ height: 6, background: i === 0 ? ORANGE : '#111', borderRadius: 2, width: '55%' }} />
          <div style={{ height: 3, background: '#E5E5DD', borderRadius: 2 }} />
          <div style={{ height: 3, background: '#E5E5DD', borderRadius: 2, width: '85%' }} />
          <div style={{ height: 3, background: '#E5E5DD', borderRadius: 2, width: '60%' }} />
          <div style={{ flex: 1 }} />
          <div
            style={{
              height: 18,
              borderRadius: 4,
              background: i % 2 === 0 ? `linear-gradient(135deg, ${ORANGE}, ${ORANGE_SOFT})` : '#EFEDE7',
            }}
          />
        </div>
      ))}
    </div>
  );
}

function SocialPreview() {
  const tiles = [
    { bg: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DEEP})`, label: 'BO' },
    { bg: '#111', label: '◆' },
    { bg: '#FAFAF6', label: 'Aa', dark: true },
    { bg: `linear-gradient(160deg, #FFD9B8, ${ORANGE_SOFT})`, label: '' },
    { bg: '#1F1F22', label: '★' },
    { bg: `linear-gradient(135deg, ${ORANGE}, #FFA45C)`, label: '' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%' }}>
      {tiles.map((t, i) => (
        <div
          key={i}
          style={{
            aspectRatio: '1 / 1',
            borderRadius: 10,
            background: t.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: t.dark ? INK : '#fff',
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: -0.5,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
          }}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}

function MockupPreview() {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      {/* Phone */}
      <div
        style={{
          width: 70,
          height: 130,
          borderRadius: 14,
          background: '#0E0E10',
          padding: 4,
          boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 10,
            background: `linear-gradient(160deg, ${ORANGE}, ${ORANGE_DEEP})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width={28} height={28} viewBox="0 0 100 100">
            <path
              d="M50 6 C 53 34, 66 47, 94 50 C 66 53, 53 66, 50 94 C 47 66, 34 53, 6 50 C 34 47, 47 34, 50 6 Z"
              fill="#fff"
            />
          </svg>
        </div>
      </div>
      {/* Card stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            width: 110,
            height: 64,
            borderRadius: 8,
            background: '#FAFAF6',
            border: `1px solid ${BORDER}`,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ height: 6, width: 30, background: ORANGE, borderRadius: 2 }} />
          <div style={{ height: 4, background: '#E5E5DD', borderRadius: 2, width: '80%' }} />
          <div style={{ height: 4, background: '#E5E5DD', borderRadius: 2, width: '60%' }} />
        </div>
        <div
          style={{
            width: 110,
            height: 64,
            borderRadius: 8,
            background: '#0E0E10',
            border: `1px solid ${BORDER}`,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            color: '#fff',
          }}
        >
          <div style={{ height: 6, width: 30, background: ORANGE, borderRadius: 2 }} />
          <div style={{ height: 4, background: '#3a3a40', borderRadius: 2, width: '70%' }} />
          <div style={{ height: 4, background: '#3a3a40', borderRadius: 2, width: '50%' }} />
        </div>
      </div>
      {/* Box */}
      <div
        style={{
          width: 60,
          height: 80,
          borderRadius: 6,
          background: `linear-gradient(160deg, ${ORANGE_SOFT}, ${ORANGE})`,
          padding: 6,
          boxShadow: '0 8px 18px rgba(232,83,10,0.25)',
        }}
      >
        <div style={{ width: 16, height: 4, background: '#fff', borderRadius: 2, opacity: 0.85 }} />
      </div>
    </div>
  );
}

function WebPreview() {
  return (
    <div
      style={{
        width: '100%',
        borderRadius: 12,
        background: '#FAFAF6',
        border: `1px solid ${BORDER}`,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: '0 6px 14px rgba(0,0,0,0.05)',
      }}
    >
      {/* browser chrome */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <div style={{ width: 8, height: 8, borderRadius: 4, background: '#E5E5DD' }} />
        <div style={{ width: 8, height: 8, borderRadius: 4, background: '#E5E5DD' }} />
        <div style={{ width: 8, height: 8, borderRadius: 4, background: '#E5E5DD' }} />
        <div style={{ flex: 1, marginLeft: 8, height: 10, background: '#fff', borderRadius: 5, border: `1px solid ${BORDER}` }} />
      </div>
      {/* hero row */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 6, padding: 6 }}>
          <div style={{ height: 10, background: '#111', borderRadius: 4, width: '70%' }} />
          <div style={{ height: 6, background: '#E5E5DD', borderRadius: 3 }} />
          <div style={{ height: 6, background: '#E5E5DD', borderRadius: 3, width: '85%' }} />
          <div
            style={{
              height: 24,
              width: 90,
              borderRadius: 6,
              background: ORANGE,
              marginTop: 4,
              boxShadow: '0 4px 10px rgba(232,83,10,0.25)',
            }}
          />
        </div>
        <div
          style={{
            flex: 1,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${ORANGE_SOFT}, ${ORANGE})`,
            minHeight: 90,
          }}
        />
      </div>
      {/* component row */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 28,
              borderRadius: 6,
              background: i === 0 ? ORANGE : '#fff',
              border: `1px solid ${BORDER}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AIPreview() {
  const tiles = [
    `linear-gradient(135deg, ${ORANGE}, #FFB070)`,
    'linear-gradient(135deg, #1F1F22, #44444A)',
    `linear-gradient(160deg, #FFE4CC, ${ORANGE_SOFT})`,
    `linear-gradient(135deg, #0E0E10, ${ORANGE_DEEP})`,
    `linear-gradient(135deg, ${ORANGE_DEEP}, #FFA45C)`,
    'linear-gradient(135deg, #2A2A2E, #666)',
    `linear-gradient(160deg, ${ORANGE}, #FFD9B8)`,
    'linear-gradient(135deg, #111, #2A2A2E)',
  ];
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, width: '100%' }}>
      {tiles.map((t, i) => {
        const shimmer = (Math.sin(frame / 10 + i) + 1) / 2;
        return (
          <div
            key={i}
            style={{
              aspectRatio: '3 / 4',
              borderRadius: 8,
              background: t,
              border: `1px solid ${BORDER}`,
              boxShadow: `0 4px 10px rgba(0,0,0,${0.06 + shimmer * 0.04})`,
              opacity: 0.92 + shimmer * 0.08,
            }}
          />
        );
      })}
    </div>
  );
}

// ============ FLOATING DOTS (background life) ============

const FloatingDots: React.FC = () => {
  const frame = useCurrentFrame();
  const dots = Array.from({ length: 18 });
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {dots.map((_, i) => {
        const seedX = (i * 73) % 1080;
        const seedY = ((i * 137) % 1700) + 200;
        const drift = Math.sin(frame / 40 + i) * 6;
        const opacity = 0.15 + ((i * 13) % 20) / 100;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: seedX,
              top: seedY + drift,
              width: 4,
              height: 4,
              borderRadius: 2,
              background: i % 4 === 0 ? ORANGE : '#0E0E10',
              opacity,
            }}
          />
        );
      })}
    </div>
  );
};

// ============ TAGLINE ============

const Tagline: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        opacity: p,
        transform: `translateY(${(1 - p) * 14}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 26,
          fontWeight: 500,
          color: INK_SOFT,
          letterSpacing: -0.3,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 24px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${BORDER}`,
          boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 4, background: ORANGE }} />
        One logo. An entire brand operating system.
      </div>
    </div>
  );
};

// ============ SCENE ============

export const BrandingOSReel: React.FC = () => {
  const frame = useCurrentFrame();
  const logoTop = 130;
  const logoSize = 160;

  // Subtle parallax / camera ease — pulls slightly upward to suggest scroll
  const camera = interpolate(frame, [200, DURATION_IN_FRAMES - 60], [0, -60], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${BG_TOP} 0%, ${BG_MID} 50%, ${BG_BOT} 100%)`,
        fontFamily: FONT,
      }}
    >
      {/* dotted canvas grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(14,14,16,0.06) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          opacity: 0.45,
          maskImage: 'linear-gradient(to bottom, black, transparent 95%)',
        }}
      />

      {/* Soft orange aura behind logo */}
      <div
        style={{
          position: 'absolute',
          top: logoTop - 80,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(255,106,26,0.18), rgba(255,106,26,0))',
          filter: 'blur(20px)',
          opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      />

      <FloatingDots />

      {/* Camera-translated stage */}
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${camera}px)` }}>
        {/* Logo + wordmark */}
        <div
          style={{
            position: 'absolute',
            top: logoTop,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <LogoMark size={logoSize} />
          <Wordmark />
        </div>

        {/* Connectors (under cards) */}
        <ConnectorLayer />

        {/* Cards */}
        {CARDS.map((c, i) => (
          <Card key={c.id} def={c} index={i} />
        ))}
      </div>

      {/* Outro tagline */}
      <Sequence from={DURATION_IN_FRAMES - 110}>
        <Tagline />
      </Sequence>
    </AbsoluteFill>
  );
};
