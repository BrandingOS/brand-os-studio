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
export const DURATION_IN_FRAMES = 16 * FPS; // 16s

const ORANGE = '#FF6A1A';
const ORANGE_DEEP = '#E8530A';
const INK = '#0E0E10';
const INK_SOFT = '#3B3B42';
const MUTED = '#8A8A93';
const BG = '#F6F4EF'; // warm light gray
const CARD_BG = '#FFFFFF';
const BORDER = 'rgba(14,14,16,0.08)';

const FONT_STACK =
  '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif';

// ---------- Logo ----------

const LogoMark: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 14, mass: 0.8 }, from: 0.6, to: 1 });
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const shine = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: 'clamp' });

  const r = size * 0.28;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: `linear-gradient(155deg, ${ORANGE} 0%, ${ORANGE_DEEP} 100%)`,
        boxShadow:
          '0 24px 60px rgba(232,83,10,0.28), 0 8px 20px rgba(14,14,16,0.10), inset 0 1px 0 rgba(255,255,255,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${scale})`,
        opacity,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* soft inner highlight */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: r,
          background:
            'radial-gradient(120% 80% at 30% 15%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%)',
        }}
      />
      {/* spark / 4-point star */}
      <svg
        width={size * 0.52}
        height={size * 0.52}
        viewBox="0 0 100 100"
        style={{ opacity: shine, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))' }}
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
  const y = interpolate(p, [0, 1], [10, 0]);

  return (
    <div
      style={{
        marginTop: 26,
        opacity: p,
        transform: `translateY(${y}px)`,
        fontFamily: FONT_STACK,
        fontWeight: 700,
        letterSpacing: -1.2,
        fontSize: 64,
        color: INK,
        display: 'flex',
        alignItems: 'baseline',
        gap: 2,
      }}
    >
      <span>Branding</span>
      <span style={{ color: ORANGE }}>OS</span>
    </div>
  );
};

// ---------- Connector SVG ----------

type Node = { x: number; y: number; side: 'L' | 'R' };

const CARDS: Array<{
  title: string;
  sub: string;
  preview: React.ReactNode;
}> = [
  { title: 'Color Palette', sub: 'Tokens · Harmony · Contrast', preview: <PalettePreview /> },
  { title: 'Typography', sub: 'Type scale · Hierarchy', preview: <TypographyPreview /> },
  { title: 'Brand Guidelines', sub: 'Usage · Rules · Principles', preview: <GuidelinesPreview /> },
  { title: 'Social Templates', sub: 'Posts · Stories · Reels', preview: <SocialPreview /> },
  { title: 'Mockups & Print', sub: 'Collateral · Packaging', preview: <MockupPreview /> },
  { title: 'Website & UI', sub: 'Sections · Components', preview: <WebPreview /> },
  { title: 'AI Creative', sub: 'Generative outputs', preview: <AIPreview /> },
];

const NODES: Node[] = [
  { x: -110, y: 0, side: 'L' },
  { x: 110, y: 0, side: 'R' },
  { x: -110, y: 320, side: 'L' },
  { x: 110, y: 320, side: 'R' },
  { x: -110, y: 640, side: 'L' },
  { x: 110, y: 640, side: 'R' },
  { x: 0, y: 960, side: 'L' }, // last centered
];

const Connectors: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const trunkP = interpolate(frame, [startFrame, startFrame + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const trunkHeight = 1100;

  return (
    <svg
      width={900}
      height={1300}
      viewBox="-450 -40 900 1300"
      style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="spine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ORANGE} stopOpacity="0.9" />
          <stop offset="100%" stopColor={ORANGE} stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* Trunk */}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={trunkHeight * trunkP}
        stroke="url(#spine)"
        strokeWidth={2}
        strokeLinecap="round"
      />

      {/* Node dots on trunk */}
      {NODES.map((n, i) => {
        const nodeStart = startFrame + 20 + i * 14;
        const p = interpolate(frame, [nodeStart, nodeStart + 14], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const branchP = interpolate(frame, [nodeStart + 4, nodeStart + 22], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const isLast = i === NODES.length - 1;
        const branchEndX = isLast ? 0 : n.x;
        const branchStartX = 0;
        const currentX = branchStartX + (branchEndX - branchStartX) * branchP;

        return (
          <g key={i}>
            {/* trunk dot */}
            <circle cx={0} cy={n.y} r={5} fill={ORANGE} opacity={p} />
            <circle cx={0} cy={n.y} r={10} fill={ORANGE} opacity={p * 0.18} />
            {/* horizontal branch */}
            {!isLast && (
              <line
                x1={0}
                y1={n.y}
                x2={currentX}
                y2={n.y}
                stroke={ORANGE}
                strokeOpacity={0.55}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ---------- Cards ----------

function PalettePreview() {
  const swatches = [ORANGE, '#F59E0B', '#111827', '#6B7280', '#F3F4F6'];
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {swatches.map((c, i) => (
        <div
          key={i}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: c,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
          }}
        />
      ))}
    </div>
  );
}

function TypographyPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: INK }}>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1 }}>Aa</div>
      <div style={{ fontSize: 14, color: INK_SOFT }}>Display · Heading · Body</div>
    </div>
  );
}

function GuidelinesPreview() {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 46,
            height: 60,
            borderRadius: 6,
            background: '#FAFAF8',
            border: `1px solid ${BORDER}`,
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ height: 4, background: ORANGE, borderRadius: 2, width: '60%' }} />
          <div style={{ height: 3, background: '#E5E5E0', borderRadius: 2 }} />
          <div style={{ height: 3, background: '#E5E5E0', borderRadius: 2, width: '80%' }} />
          <div style={{ height: 3, background: '#E5E5E0', borderRadius: 2, width: '50%' }} />
        </div>
      ))}
    </div>
  );
}

function SocialPreview() {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DEEP})`,
        }}
      />
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 10,
          background: '#111',
        }}
      />
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 10,
          background: '#FAFAF8',
          border: `1px solid ${BORDER}`,
        }}
      />
    </div>
  );
}

function MockupPreview() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      <div style={{ width: 36, height: 60, borderRadius: 6, background: '#EFEDE7', border: `1px solid ${BORDER}` }} />
      <div style={{ width: 30, height: 44, borderRadius: 4, background: ORANGE, opacity: 0.9 }} />
      <div style={{ width: 44, height: 30, borderRadius: 4, background: '#111' }} />
    </div>
  );
}

function WebPreview() {
  return (
    <div
      style={{
        width: 180,
        borderRadius: 8,
        background: '#FAFAF8',
        border: `1px solid ${BORDER}`,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: '#E5E5E0' }} />
        <div style={{ width: 6, height: 6, borderRadius: 3, background: '#E5E5E0' }} />
        <div style={{ width: 6, height: 6, borderRadius: 3, background: '#E5E5E0' }} />
      </div>
      <div style={{ height: 6, background: '#111', borderRadius: 3, width: '40%' }} />
      <div style={{ height: 4, background: '#E5E5E0', borderRadius: 2 }} />
      <div style={{ height: 4, background: '#E5E5E0', borderRadius: 2, width: '80%' }} />
      <div
        style={{
          height: 18,
          background: ORANGE,
          borderRadius: 4,
          width: 60,
          marginTop: 2,
        }}
      />
    </div>
  );
}

function AIPreview() {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: 36,
            height: 48,
            borderRadius: 6,
            background:
              i % 2 === 0
                ? `linear-gradient(135deg, ${ORANGE}, #FFB070)`
                : 'linear-gradient(135deg, #111, #444)',
            opacity: 0.95,
          }}
        />
      ))}
    </div>
  );
}

const Card: React.FC<{
  title: string;
  sub: string;
  preview: React.ReactNode;
  startFrame: number;
  node: Node;
}> = ({ title, sub, preview, startFrame, node }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 16, mass: 0.7 },
    from: 0,
    to: 1,
  });
  const opacity = interpolate(frame, [startFrame, startFrame + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Place card aligned outward from the branch node
  const cardW = 380;
  const cardH = 210;
  const gap = 30; // horizontal gap from trunk node end

  const isLast = node.y === 960 && node.x === 0;
  const xBase = isLast ? -cardW / 2 : node.side === 'L' ? node.x - cardW - gap : node.x + gap;

  return (
    <div
      style={{
        position: 'absolute',
        top: node.y - cardH / 2,
        left: `calc(50% + ${xBase}px)`,
        width: cardW,
        height: cardH,
        transform: `translateY(${(1 - reveal) * 18}px) scale(${0.96 + reveal * 0.04})`,
        opacity,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: CARD_BG,
          borderRadius: 20,
          border: `1px solid ${BORDER}`,
          boxShadow:
            '0 20px 40px rgba(14,14,16,0.06), 0 6px 14px rgba(14,14,16,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          fontFamily: FONT_STACK,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, color: INK, letterSpacing: -0.3 }}>{title}</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{sub}</div>
          </div>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              background: ORANGE,
              boxShadow: `0 0 0 4px ${ORANGE}22`,
            }}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>{preview}</div>
      </div>
    </div>
  );
};

// ---------- Scene ----------

export const BrandingOSReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const logoTop = 180;
  const logoSize = 180;
  const systemTop = logoTop + logoSize + 260; // start of trunk

  const outroP = interpolate(frame, [DURATION_IN_FRAMES - 40, DURATION_IN_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 80% at 50% 0%, #FFFBF4 0%, ${BG} 55%, #EFEDE7 100%)`,
        fontFamily: FONT_STACK,
      }}
    >
      {/* Subtle grid texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(14,14,16,0.05) 1px, transparent 0)',
          backgroundSize: '28px 28px',
          opacity: 0.4,
          maskImage: 'linear-gradient(to bottom, black, transparent 90%)',
        }}
      />

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

      {/* Connector system */}
      <div style={{ position: 'absolute', top: systemTop, left: 0, right: 0 }}>
        <Connectors startFrame={48} />

        {/* Cards */}
        {CARDS.map((c, i) => {
          const node = NODES[i];
          const start = 48 + 20 + i * 14 + 6;
          return (
            <Card
              key={i}
              title={c.title}
              sub={c.sub}
              preview={c.preview}
              startFrame={start}
              node={node}
            />
          );
        })}
      </div>

      {/* Outro tagline */}
      <Sequence from={DURATION_IN_FRAMES - 90}>
        <Tagline />
      </Sequence>

      {/* Gentle fade out */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          opacity: outroP * 0.0, // keep bright — disable black fade
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

const Tagline: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(p, [0, 1], [14, 0]);
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        opacity: p,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT_STACK,
          fontSize: 26,
          fontWeight: 500,
          color: INK_SOFT,
          letterSpacing: -0.3,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 3, background: ORANGE }} />
        One logo. An entire brand system.
      </div>
    </div>
  );
};
