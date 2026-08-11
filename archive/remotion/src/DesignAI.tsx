import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';

export const DESIGN_AI_FPS = 30;
export const DESIGN_AI_DURATION = 18 * DESIGN_AI_FPS; // 540

const ORANGE = '#FF6A1A';
const ORANGE_DEEP = '#E8530A';
const ORANGE_SOFT = '#FFB070';
const ORANGE_TINT = '#FFF1E4';
const INK = '#0E0E10';
const INK_SOFT = '#3B3B42';
const MUTED = '#8A8A93';
const BG_TOP = '#FFFCF6';
const BG_MID = '#F6F3EC';
const BG_BOT = '#EFEAE0';
const CARD_BG = '#FFFFFF';
const BORDER = 'rgba(14,14,16,0.07)';

const FONT =
  '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif';

// ================ SHARED GLYPHS ================

const SparkleMark: React.FC<{ size: number; color?: string }> = ({ size, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" />
    <path d="M22 5h-4" />
    <path d="M4 17v2" />
    <path d="M5 18H3" />
  </svg>
);

const LogoTile: React.FC<{ size: number; radius?: number }> = ({ size, radius }) => {
  const r = radius ?? size * 0.28;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: `linear-gradient(155deg, ${ORANGE} 0%, ${ORANGE_DEEP} 100%)`,
        boxShadow: `0 10px 24px rgba(232,83,10,0.22), inset 0 1px 0 rgba(255,255,255,0.35)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: r,
          background:
            'radial-gradient(120% 80% at 30% 15%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%)',
        }}
      />
      <SparkleMark size={size * 0.55} />
    </div>
  );
};

const WordmarkInline: React.FC<{ fontSize: number }> = ({ fontSize }) => (
  <div style={{ fontSize, fontWeight: 700, letterSpacing: -0.02 * fontSize, color: INK, lineHeight: 1 }}>
    Branding<span style={{ color: ORANGE }}>OS</span>
  </div>
);

// ================ TIMELINE ================

const F_HEADER_IN = 0; // logo+wordmark reveal
const F_CORE_IN = 42; // brand core card appears
const F_TOOLS_IN = 90; // 6 tool modules + connectors
const F_GEN_IN = 200; // 9 branded outputs cascade
const F_PULLBACK = 420;
const F_TAGLINE = 460;

// ================ HEADER ================

const Header: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame: frame - F_HEADER_IN, fps, config: { damping: 14, mass: 0.7 }, from: 0.7, to: 1 });
  const logoOp = interpolate(frame, [F_HEADER_IN, F_HEADER_IN + 12], [0, 1], { extrapolateRight: 'clamp' });
  const wmOp = interpolate(frame, [F_HEADER_IN + 10, F_HEADER_IN + 24], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        top: 100,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 22,
      }}
    >
      <div style={{ opacity: logoOp, transform: `scale(${scale})` }}>
        <LogoTile size={92} />
      </div>
      <div style={{ opacity: wmOp, transform: `translateX(${(1 - wmOp) * -10}px)` }}>
        <WordmarkInline fontSize={52} />
      </div>
    </div>
  );
};

// ================ BRAND CORE CARD ================

const BrandCore: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({ frame: frame - F_CORE_IN, fps, config: { damping: 16, mass: 0.8 }, from: 0, to: 1 });
  const op = interpolate(frame, [F_CORE_IN, F_CORE_IN + 18], [0, 1], { extrapolateRight: 'clamp' });

  // Ambient shimmer pulse
  const pulse = (Math.sin(frame / 30) + 1) / 2;

  // Token stagger
  const t = (offset: number) =>
    interpolate(frame, [F_CORE_IN + 10 + offset, F_CORE_IN + 22 + offset], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  return (
    <div
      style={{
        position: 'absolute',
        top: 260,
        left: 80,
        right: 80,
        transform: `translateY(${(1 - reveal) * 24}px) scale(${0.95 + reveal * 0.05})`,
        opacity: op,
      }}
    >
      <div
        style={{
          width: '100%',
          background: CARD_BG,
          borderRadius: 24,
          border: `1px solid ${BORDER}`,
          boxShadow: `
            0 40px 80px rgba(14,14,16,0.10),
            0 12px 30px rgba(14,14,16,0.06),
            0 0 ${40 + pulse * 20}px rgba(255,106,26,${0.10 + pulse * 0.06})
          `,
          padding: 26,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: FONT,
        }}
      >
        {/* Subtle orange aura on core */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: `radial-gradient(closest-side, rgba(255,106,26,0.18), rgba(255,106,26,0))`,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 12, color: ORANGE, fontWeight: 600, letterSpacing: 1.6, textTransform: 'uppercase' }}>
              Brand Core · AI Workspace
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: INK, letterSpacing: -0.6, marginTop: 4 }}>
              One identity. Every output.
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              color: MUTED,
              padding: '6px 12px',
              borderRadius: 999,
              background: ORANGE_TINT,
              border: `1px solid ${BORDER}`,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 3, background: ORANGE, boxShadow: `0 0 6px ${ORANGE}` }} />
            <span style={{ color: INK, fontWeight: 500 }}>AI Ready</span>
          </div>
        </div>

        {/* DNA tokens grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, zIndex: 1 }}>
          {/* Logo token */}
          <div
            style={{
              ...dnaCard,
              opacity: t(0),
              transform: `translateY(${(1 - t(0)) * 10}px)`,
            }}
          >
            <div style={{ fontSize: 10, color: MUTED, fontWeight: 500, letterSpacing: 0.8, textTransform: 'uppercase' }}>Logo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <LogoTile size={48} />
              <WordmarkInline fontSize={18} />
            </div>
          </div>

          {/* Colors token */}
          <div
            style={{
              ...dnaCard,
              opacity: t(4),
              transform: `translateY(${(1 - t(4)) * 10}px)`,
            }}
          >
            <div style={{ fontSize: 10, color: MUTED, fontWeight: 500, letterSpacing: 0.8, textTransform: 'uppercase' }}>Palette</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[ORANGE, INK, '#F59E0B', '#F3F2ED'].map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: c,
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Type token */}
          <div
            style={{
              ...dnaCard,
              opacity: t(8),
              transform: `translateY(${(1 - t(8)) * 10}px)`,
            }}
          >
            <div style={{ fontSize: 10, color: MUTED, fontWeight: 500, letterSpacing: 0.8, textTransform: 'uppercase' }}>Type</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: INK, letterSpacing: -1, lineHeight: 1 }}>Aa</div>
              <div style={{ fontSize: 11, color: MUTED }}>Inter</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const dnaCard: React.CSSProperties = {
  borderRadius: 14,
  border: `1px solid ${BORDER}`,
  background: '#FAFAF6',
  padding: '14px 14px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

// ================ AI TOOL MODULES + CONNECTORS ================

type Tool = { id: string; label: string; x: number; y: number };

const TOOLS: Tool[] = [
  { id: 'logo', label: 'Logo Gen', x: 60, y: 130 },
  { id: 'color', label: 'Color System', x: 320, y: 70 },
  { id: 'type', label: 'Typography', x: 620, y: 70 },
  { id: 'guide', label: 'Guidelines', x: 860, y: 130 },
  { id: 'social', label: 'Social Design', x: 60, y: 300 },
  { id: 'mock', label: 'Mockups', x: 860, y: 300 },
  { id: 'web', label: 'Website UI', x: 320, y: 360 },
  { id: 'ai', label: 'AI Create', x: 620, y: 360 },
];
// These x/y are relative to an anchor area around the core card.

const CORE_ANCHOR = { x: 540, y: 520 }; // center point of brand core

const TOOLS_AREA_TOP = 680;

const AIToolsLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ position: 'absolute', top: TOOLS_AREA_TOP, left: 0, right: 0, height: 460 }}>
      {/* Connectors layer */}
      <svg
        width={1080}
        height={460}
        viewBox="0 0 1080 460"
        style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
      >
        {TOOLS.map((tool, i) => {
          const start = F_TOOLS_IN + i * 5;
          const p = interpolate(frame, [start, start + 18], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });
          // Lines emanate from core anchor (above this layer) down to tool pill center
          // Core anchor y in this layer's coordinate system: CORE_ANCHOR.y - TOOLS_AREA_TOP
          const fromX = 540;
          const fromY = CORE_ANCHOR.y - TOOLS_AREA_TOP; // above the svg, negative
          const toX = tool.x + 120; // pill center
          const toY = tool.y + 26;
          const dy = toY - fromY;
          const c1x = fromX;
          const c1y = fromY + dy * 0.55;
          const c2x = toX;
          const c2y = fromY + dy * 0.7;
          const d = `M ${fromX} ${fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toX} ${toY}`;
          const len =
            Math.hypot(c1x - fromX, c1y - fromY) +
            Math.hypot(c2x - c1x, c2y - c1y) +
            Math.hypot(toX - c2x, toY - c2y);
          return (
            <g key={tool.id}>
              <path
                d={d}
                fill="none"
                stroke={ORANGE}
                strokeOpacity={0.45}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeDasharray={len}
                strokeDashoffset={len * (1 - p)}
              />
            </g>
          );
        })}
      </svg>

      {/* Tool pills */}
      {TOOLS.map((tool, i) => {
        const start = F_TOOLS_IN + i * 5 + 10;
        const t = spring({
          frame: frame - start,
          fps,
          config: { damping: 16, mass: 0.6 },
          from: 0,
          to: 1,
        });
        const op = interpolate(frame, [start, start + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div
            key={tool.id}
            style={{
              position: 'absolute',
              left: tool.x,
              top: tool.y,
              width: 240,
              height: 52,
              transform: `translateY(${(1 - t) * 12}px) scale(${0.9 + t * 0.1})`,
              opacity: op,
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background: CARD_BG,
                borderRadius: 14,
                border: `1px solid ${BORDER}`,
                boxShadow: '0 12px 24px rgba(14,14,16,0.06), 0 4px 10px rgba(14,14,16,0.04)',
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontFamily: FONT,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: `linear-gradient(155deg, ${ORANGE}, ${ORANGE_DEEP})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(232,83,10,0.25)',
                }}
              >
                <SparkleMark size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK, letterSpacing: -0.1 }}>{tool.label}</div>
                <div style={{ fontSize: 10, color: MUTED }}>AI Module</div>
              </div>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: ORANGE,
                  boxShadow: `0 0 6px ${ORANGE}`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ================ GENERATION GRID ================

// 9 outputs, each a small branded asset. All share: orange palette, sparkle mark, same type, rounded corners.

const OUT_TOP = 1180;
const OUT_GRID_GAP = 16;
const OUT_W = 300;
const OUT_H = 220;

type Output = {
  id: string;
  label: string;
  render: () => React.ReactNode;
};

function OutGuidelinesCover() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 10,
        background: '#FAFAF6',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: `1px solid ${BORDER}`,
      }}
    >
      <LogoTile size={34} />
      <div>
        <div style={{ fontSize: 10, color: ORANGE, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase' }}>
          Guidelines
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: INK, letterSpacing: -0.4, marginTop: 4, lineHeight: 1.05 }}>
          Brand Manual <span style={{ color: ORANGE }}>’26</span>
        </div>
      </div>
      <div style={{ height: 4, background: ORANGE, borderRadius: 2, width: '30%' }} />
    </div>
  );
}

function OutSocialOrange() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 10,
        background: `linear-gradient(155deg, ${ORANGE} 0%, ${ORANGE_DEEP} 100%)`,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#fff',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', right: -30, bottom: -30, opacity: 0.18 }}>
        <SparkleMark size={180} />
      </div>
      <SparkleMark size={26} />
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.1, zIndex: 1 }}>
        Design at the speed of thought.
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase', zIndex: 1, opacity: 0.9 }}>
        BrandingOS · 01
      </div>
    </div>
  );
}

function OutSocialDark() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 10,
        background: INK,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LogoTile size={24} />
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: -0.1 }}>
          Branding<span style={{ color: ORANGE }}>OS</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.1 }}>
          One core. <span style={{ color: ORANGE }}>Infinite outputs.</span>
        </div>
        <div style={{ fontSize: 11, color: '#B8B8C0', marginTop: 6 }}>AI branding · Consistent DNA</div>
      </div>
    </div>
  );
}

function OutPhone() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 10,
        background: '#F3F0EA',
        padding: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 90,
          height: 170,
          borderRadius: 14,
          background: INK,
          padding: 4,
          boxShadow: '0 10px 20px rgba(0,0,0,0.18)',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 10,
            background: '#FFF',
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
        >
          <div
            style={{
              height: 42,
              borderRadius: 6,
              background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DEEP})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SparkleMark size={18} />
          </div>
          <div style={{ height: 5, background: INK, borderRadius: 2, width: '70%' }} />
          <div style={{ height: 3, background: '#E5E5DD', borderRadius: 2 }} />
          <div style={{ height: 3, background: '#E5E5DD', borderRadius: 2, width: '75%' }} />
          <div style={{ marginTop: 'auto', height: 14, width: 40, background: ORANGE, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

function OutBusinessCard() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 10,
        background: '#E9E6DE',
        padding: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 220,
          height: 130,
          borderRadius: 10,
          background: INK,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#fff',
          boxShadow: '0 10px 24px rgba(0,0,0,0.25)',
          transform: 'rotate(-3deg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LogoTile size={26} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            Branding<span style={{ color: ORANGE }}>OS</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>Hamza Ezzat</div>
          <div style={{ fontSize: 9, color: '#9A9AA4', marginTop: 2 }}>brandingos.ai</div>
        </div>
      </div>
    </div>
  );
}

function OutWebHero() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 10,
        background: '#FAFAF6',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        border: `1px solid ${BORDER}`,
      }}
    >
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: '#E5E5DD' }} />
        <div style={{ width: 6, height: 6, borderRadius: 3, background: '#E5E5DD' }} />
        <div style={{ width: 6, height: 6, borderRadius: 3, background: '#E5E5DD' }} />
        <div style={{ flex: 1, marginLeft: 6, height: 8, background: '#fff', borderRadius: 4, border: `1px solid ${BORDER}` }} />
      </div>
      <div style={{ display: 'flex', gap: 10, flex: 1 }}>
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 6, padding: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogoTile size={18} />
            <div style={{ fontSize: 10, fontWeight: 700, color: INK }}>
              Branding<span style={{ color: ORANGE }}>OS</span>
            </div>
          </div>
          <div style={{ height: 10, background: INK, borderRadius: 4, width: '85%' }} />
          <div style={{ height: 6, background: '#E5E5DD', borderRadius: 3 }} />
          <div style={{ height: 6, background: '#E5E5DD', borderRadius: 3, width: '70%' }} />
          <div style={{ marginTop: 'auto', height: 18, width: 70, background: ORANGE, borderRadius: 5 }} />
        </div>
        <div
          style={{
            flex: 1,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${ORANGE_SOFT}, ${ORANGE})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SparkleMark size={28} />
        </div>
      </div>
    </div>
  );
}

function OutAdBanner() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 10,
        background: ORANGE_TINT,
        padding: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        border: `1px solid ${BORDER}`,
      }}
    >
      <LogoTile size={44} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: ORANGE, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          AI Branding
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: INK, letterSpacing: -0.4, lineHeight: 1.1, marginTop: 3 }}>
          Ship your brand. Today.
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            fontWeight: 600,
            color: '#fff',
            background: INK,
            display: 'inline-block',
            padding: '6px 10px',
            borderRadius: 6,
          }}
        >
          Try Free →
        </div>
      </div>
    </div>
  );
}

function OutSlide() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 10,
        background: '#FFFFFF',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        border: `1px solid ${BORDER}`,
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <LogoTile size={18} />
        <div style={{ fontSize: 9, color: MUTED, fontWeight: 600 }}>01 / 24</div>
      </div>
      <div style={{ fontSize: 10, color: ORANGE, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase' }}>
        Keynote · Deck
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: INK, letterSpacing: -0.3, lineHeight: 1.15 }}>
        Why one brand DNA changes everything.
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 38,
              borderRadius: 6,
              background: i === 0 ? ORANGE : '#F3F0EA',
              border: `1px solid ${BORDER}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function OutPackaging() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 10,
        background: '#E9E6DE',
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 90,
          height: 140,
          borderRadius: 8,
          background: `linear-gradient(160deg, ${ORANGE_SOFT}, ${ORANGE} 60%, ${ORANGE_DEEP})`,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 14px 30px rgba(232,83,10,0.25)',
          color: '#fff',
        }}
      >
        <SparkleMark size={20} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1 }}>BrandingOS</div>
          <div style={{ fontSize: 8, opacity: 0.85, marginTop: 2 }}>Starter Kit · 01</div>
        </div>
      </div>
    </div>
  );
}

const OUTPUTS: Output[] = [
  { id: 'guide', label: 'Guidelines', render: OutGuidelinesCover },
  { id: 'post1', label: 'Social · Orange', render: OutSocialOrange },
  { id: 'post2', label: 'Social · Dark', render: OutSocialDark },
  { id: 'phone', label: 'App Screen', render: OutPhone },
  { id: 'bcard', label: 'Business Card', render: OutBusinessCard },
  { id: 'web', label: 'Website', render: OutWebHero },
  { id: 'ad', label: 'Ad Banner', render: OutAdBanner },
  { id: 'slide', label: 'Presentation', render: OutSlide },
  { id: 'pack', label: 'Packaging', render: OutPackaging },
];

const GenerationGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gridLeft = (1080 - (OUT_W * 3 + OUT_GRID_GAP * 2)) / 2;

  return (
    <div style={{ position: 'absolute', top: OUT_TOP, left: 0, right: 0 }}>
      {/* Section header */}
      <div style={{ textAlign: 'center', marginBottom: 20, fontFamily: FONT }}>
        <SectionLabel />
      </div>

      {/* Grid */}
      <div style={{ position: 'relative', width: 1080, height: OUT_H * 3 + OUT_GRID_GAP * 2 + 40 }}>
        {OUTPUTS.map((out, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const x = gridLeft + col * (OUT_W + OUT_GRID_GAP);
          const y = row * (OUT_H + OUT_GRID_GAP);

          const start = F_GEN_IN + i * 10;
          const t = spring({
            frame: frame - start,
            fps,
            config: { damping: 16, mass: 0.7 },
            from: 0,
            to: 1,
          });
          const op = interpolate(frame, [start, start + 14], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          // Subtle float on each card after reveal
          const bob = Math.sin((frame - start) / 40 + i * 0.6) * 2;

          return (
            <div
              key={out.id}
              style={{
                position: 'absolute',
                left: x,
                top: y + bob,
                width: OUT_W,
                height: OUT_H,
                transform: `translateY(${(1 - t) * 22}px) scale(${0.9 + t * 0.1})`,
                opacity: op,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: CARD_BG,
                  borderRadius: 16,
                  border: `1px solid ${BORDER}`,
                  boxShadow: '0 14px 30px rgba(14,14,16,0.06), 0 4px 12px rgba(14,14,16,0.04)',
                  padding: 8,
                  overflow: 'hidden',
                  fontFamily: FONT,
                }}
              >
                {out.render()}
              </div>
              {/* Tiny label below card */}
              <div
                style={{
                  fontSize: 10,
                  color: MUTED,
                  fontWeight: 500,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  marginTop: 6,
                  textAlign: 'left',
                  paddingLeft: 4,
                  fontFamily: FONT,
                }}
              >
                {out.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SectionLabel: React.FC = () => {
  const frame = useCurrentFrame();
  const start = F_GEN_IN - 10;
  const t = interpolate(frame, [start, start + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${(1 - t) * 10}px)`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 20px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.7)',
        border: `1px solid ${BORDER}`,
        boxShadow: '0 6px 18px rgba(14,14,16,0.04)',
        fontFamily: FONT,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 3, background: ORANGE, boxShadow: `0 0 6px ${ORANGE}` }} />
      <span style={{ fontSize: 14, color: INK, fontWeight: 600, letterSpacing: -0.1 }}>
        Generating · 9 cohesive brand outputs
      </span>
    </div>
  );
};

// ================ TAGLINE ================

const Tagline: React.FC = () => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [F_TAGLINE, F_TAGLINE + 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        opacity: t,
        transform: `translateY(${(1 - t) * 14}px)`,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 28px',
          borderRadius: 999,
          background: INK,
          color: '#fff',
          boxShadow: '0 20px 40px rgba(14,14,16,0.2)',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `linear-gradient(155deg, ${ORANGE}, ${ORANGE_DEEP})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SparkleMark size={16} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>
          One brand DNA. <span style={{ color: ORANGE }}>Infinite cohesive outputs.</span>
        </div>
      </div>
    </div>
  );
};

// ================ SCENE ================

export const DesignAI: React.FC = () => {
  const frame = useCurrentFrame();

  // Gentle upward camera drift during generation to show more of the grid
  const camDrift = interpolate(frame, [F_GEN_IN, F_PULLBACK], [0, -140], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  // Pullback scales everything down slightly
  const pullScale = interpolate(frame, [F_PULLBACK, F_PULLBACK + 30], [1, 0.92], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${BG_TOP} 0%, ${BG_MID} 50%, ${BG_BOT} 100%)`,
        fontFamily: FONT,
      }}
    >
      {/* Dotted canvas grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(14,14,16,0.06) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          opacity: 0.4,
          maskImage: 'linear-gradient(to bottom, black, transparent 97%)',
        }}
      />

      {/* Camera stage */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${camDrift}px) scale(${pullScale})`,
          transformOrigin: '50% 40%',
        }}
      >
        <Header />
        <BrandCore />
        {frame >= F_TOOLS_IN - 4 && <AIToolsLayer />}
        {frame >= F_GEN_IN - 20 && <GenerationGrid />}
      </div>

      <Tagline />
    </AbsoluteFill>
  );
};
