/**
 * Foundations slide variants — 5 visually-distinct layouts for the
 * 4-pillar foundations slide (slide 6 of the uniex pitch deck).
 *
 * Variant A is the original implementation extracted from
 * `slides/UniexPitchSlides.tsx` — kept identical so it stays the
 * canonical "default" look. B–E are alt directions.
 *
 * All variants read identical content from `uniexPitchContent.ts`.
 */

import type { CSSProperties, ReactNode } from 'react';
import { FitText } from '@/features/case-study-deck/styles/FitText';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';
import { FOUNDATIONS } from '../uniexPitchContent';
import { ReplaceableArtwork } from '../artwork/ReplaceableArtwork';

const NAVY = '#001563';
const NAVY_DEEP = '#0A0F2E';
const GREEN = '#68BE69';
const GREEN_SOFT = 'rgba(104, 190, 105, 0.12)';
const PAPER = '#F5F7FB';
const WHITE = '#FFFFFF';

// FitText sizes itself dynamically; reach the theme font family via the var.
const HEADING_FAMILY = 'var(--deck-font-heading)';
const RTL_DIR: CSSProperties = { direction: 'rtl', textAlign: 'right' };

interface SlideProps {
  index: number;
  total: number;
}

function PageChrome({
  pageNum,
  total,
  variant,
}: {
  pageNum: number;
  total: number;
  variant: 'light' | 'dark' | 'flood';
}) {
  const isDark = variant !== 'light';
  const wordmarkColor = isDark ? WHITE : undefined;
  const chromeColor = isDark ? 'rgba(255, 255, 255, 0.7)' : undefined;
  const ruleColor = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,21,99,0.10)';
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 64,
          left: 96,
          right: 96,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span className="deck-label" style={{ color: wordmarkColor, letterSpacing: '0.06em' }}>uniex</span>
        <span className="deck-caption" style={{ ...RTL_DIR, fontWeight: 600, color: chromeColor }}>الأسس</span>
        <span className="deck-caption" style={{ fontVariantNumeric: 'tabular-nums', color: chromeColor }}>
          {String(pageNum).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 96,
          right: 96,
          top: 88,
          height: 1,
          background: ruleColor,
        }}
      />
    </>
  );
}

function Frame({
  index,
  variant,
  children,
  bg,
}: {
  index: number;
  variant: 'light' | 'dark' | 'flood';
  children: ReactNode;
  bg?: string;
}) {
  const fallback = variant === 'flood' ? NAVY : variant === 'dark' ? NAVY_DEEP : PAPER;
  const ink = variant === 'light' ? NAVY : WHITE;
  return (
    <div
      data-pitch-slide={index}
      data-pitch-kind="foundations"
      style={{
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
        background: bg ?? fallback,
        color: ink,
      }}
    >
      {children}
    </div>
  );
}

/* ──────────────────  A — original 4-col cards ────────────────── */

export function FoundationsA({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 36, ...RTL_DIR }}>
        <div>
          <FitText as="div" maxSize={80} minSize={36} width={SLIDE_WIDTH - 192} height={110} style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, color: NAVY, lineHeight: 1.18, ...RTL_DIR }}>
            {FOUNDATIONS.title}
          </FitText>
          <div className="deck-body" style={{ marginTop: 14, color: 'rgba(0,21,99,0.65)', maxWidth: 1200 }}>{FOUNDATIONS.intro}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22, flex: 1 }}>
          {FOUNDATIONS.pillars.map((p, i) => (
            <div
              key={i}
              style={{
                background: WHITE,
                borderTop: `6px solid ${i % 2 === 0 ? NAVY : GREEN}`,
                borderRadius: '4px 4px 18px 18px',
                padding: 30,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                boxShadow: '0 8px 24px -10px rgba(0, 21, 99, 0.14)',
                ...RTL_DIR,
              }}
            >
              <span className="deck-label" style={{ letterSpacing: '0.18em', color: i % 2 === 0 ? NAVY : GREEN }}>0{i + 1}</span>
              <span className="deck-h3" style={{ fontWeight: 800, color: NAVY }}>{p.title}</span>
              <span className="deck-body" style={{ color: 'rgba(0,21,99,0.78)' }}>{p.body}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ──────────────────  B — 2x2 grid with iconmarks ────────────────── */

export function FoundationsB({ index, total }: SlideProps) {
  const icons = ['/brands/uniex/logos/iconBlue.svg', '/brands/uniex/logos/iconGreen.svg', '/brands/uniex/logos/iconBlue.svg', '/brands/uniex/logos/iconGreen.svg'];
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 30, ...RTL_DIR }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
          <FitText as="div" maxSize={84} minSize={36} width={1200} height={120} style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, color: NAVY, lineHeight: 1.18, ...RTL_DIR }}>
            {FOUNDATIONS.title}
          </FitText>
          <div className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>FOUNDATIONS · 04</div>
        </div>
        <div className="deck-body" style={{ color: 'rgba(0,21,99,0.65)', maxWidth: 1200 }}>{FOUNDATIONS.intro}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 24, flex: 1 }}>
          {FOUNDATIONS.pillars.map((p, i) => (
            <div
              key={i}
              style={{
                background: i % 3 === 0 ? NAVY : WHITE,
                color: i % 3 === 0 ? WHITE : NAVY,
                border: i % 3 === 0 ? 'none' : '1px solid rgba(0,21,99,0.10)',
                borderRadius: 26,
                padding: 36,
                display: 'flex',
                gap: 28,
                alignItems: 'center',
                boxShadow: i % 3 === 0 ? 'none' : '0 12px 36px -16px rgba(0, 21, 99, 0.16)',
                position: 'relative',
                overflow: 'hidden',
                ...RTL_DIR,
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 24,
                  background: i % 3 === 0 ? 'rgba(255,255,255,0.08)' : GREEN_SOFT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <img src={icons[i]} alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0 }}>
                <span className="deck-label" style={{ letterSpacing: '0.32em', color: i % 3 === 0 ? GREEN : 'rgba(0,21,99,0.55)' }}>0{i + 1}</span>
                <span className="deck-h3" style={{ fontWeight: 800, color: i % 3 === 0 ? WHITE : NAVY }}>{p.title}</span>
                <span className="deck-body" style={{ opacity: 0.85, color: i % 3 === 0 ? WHITE : NAVY }}>{p.body}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ──────────────────  C — image #3 watermark + horizontal rows ────────────────── */

export function FoundationsC({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 720,
          height: SLIDE_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.45,
          maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
        }}
      >
        <ReplaceableArtwork
          slotId="foundations-C-graduation"
          defaultQuery="graduation cap"
          style={{ width: 680, height: 680 }}
        >
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,21,99,0.04)', borderRadius: 16,
            color: 'rgba(0,21,99,0.35)',
            fontFamily: 'var(--deck-font-body)', fontSize: 13, fontWeight: 600,
            textAlign: 'center', padding: 12,
          }}>
            Click to add illustration
          </div>
        </ReplaceableArtwork>
      </div>
      <PageChrome pageNum={index} total={total} variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 30, ...RTL_DIR }}>
        <FitText as="div" maxSize={84} minSize={36} width={SLIDE_WIDTH - 192} height={120} style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, color: NAVY, lineHeight: 1.18, ...RTL_DIR }}>
          {FOUNDATIONS.title}
        </FitText>
        <div className="deck-body" style={{ color: 'rgba(0,21,99,0.65)', maxWidth: 1200 }}>{FOUNDATIONS.intro}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, marginTop: 8 }}>
          {FOUNDATIONS.pillars.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 360px 1fr',
                alignItems: 'center',
                gap: 28,
                padding: '22px 32px',
                background: WHITE,
                borderRadius: 16,
                borderRight: `5px solid ${i % 2 === 0 ? NAVY : GREEN}`,
                boxShadow: '0 6px 18px -10px rgba(0, 21, 99, 0.14)',
                ...RTL_DIR,
              }}
            >
              {/* Decorative giant numeral */}
              <span style={{ fontFamily: HEADING_FAMILY, fontSize: 64, fontWeight: 800, color: i % 2 === 0 ? NAVY : GREEN, lineHeight: 1, letterSpacing: '-0.02em' }}>0{i + 1}</span>
              <span className="deck-h3" style={{ fontWeight: 800, color: NAVY }}>{p.title}</span>
              <span className="deck-body" style={{ color: 'rgba(0,21,99,0.78)' }}>{p.body}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ──────────────────  D — navy flood, floating tinted cards ────────────────── */

export function FoundationsD({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="flood">
      <div style={{ position: 'absolute', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: 'rgba(104,190,105,0.12)', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: -150, right: -150, width: 500, height: 500, borderRadius: '50%', background: 'rgba(104,190,105,0.08)', filter: 'blur(50px)' }} />
      <PageChrome pageNum={index} total={total} variant="flood" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 36, ...RTL_DIR }}>
        <div>
          <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>FOUNDATIONS</span>
          <FitText as="div" maxSize={84} minSize={40} width={SLIDE_WIDTH - 192} height={120} style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, color: WHITE, lineHeight: 1.18, marginTop: 12, ...RTL_DIR }}>
            {FOUNDATIONS.title}
          </FitText>
          <div className="deck-body" style={{ marginTop: 14, color: 'rgba(255,255,255,0.78)', maxWidth: 1200 }}>{FOUNDATIONS.intro}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, flex: 1 }}>
          {FOUNDATIONS.pillars.map((p, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.16)',
                backdropFilter: 'blur(10px)',
                borderRadius: 24,
                padding: 30,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                position: 'relative',
                overflow: 'hidden',
                transform: i % 2 === 0 ? 'translateY(-12px)' : 'translateY(12px)',
                ...RTL_DIR,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: i % 2 === 0 ? GREEN : 'rgba(255,255,255,0.4)',
                }}
              />
              {/* Decorative giant numeral */}
              <span style={{ fontFamily: HEADING_FAMILY, fontSize: 56, fontWeight: 800, color: GREEN, lineHeight: 1, letterSpacing: '-0.02em' }}>0{i + 1}</span>
              <span className="deck-h3" style={{ fontWeight: 800, color: WHITE }}>{p.title}</span>
              <span className="deck-body" style={{ color: 'rgba(255,255,255,0.78)' }}>{p.body}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ──────────────────  E — orbital: center + 4 around ────────────────── */

export function FoundationsE({ index, total }: SlideProps) {
  // 4 pillars positioned at compass points around a central node.
  const centerX = SLIDE_WIDTH / 2;
  const centerY = 600;
  const radius = 380;
  const positions = [
    { x: centerX, y: centerY - radius, dx: 0, dy: -1 }, // top
    { x: centerX + radius, y: centerY, dx: 1, dy: 0 }, // right
    { x: centerX, y: centerY + radius, dx: 0, dy: 1 }, // bottom
    { x: centerX - radius, y: centerY, dx: -1, dy: 0 }, // left
  ];
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} variant="light" />
      <div style={{ position: 'absolute', top: 130, left: 96, right: 96, ...RTL_DIR }}>
        <FitText as="div" maxSize={64} minSize={32} width={SLIDE_WIDTH - 192} height={90} style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, color: NAVY, lineHeight: 1.18, ...RTL_DIR }}>
          {FOUNDATIONS.title}
        </FitText>
      </div>

      {/* connecting lines */}
      <svg width={SLIDE_WIDTH} height={SLIDE_HEIGHT} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {positions.map((pos, i) => (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={pos.x}
            y2={pos.y}
            stroke={i % 2 === 0 ? NAVY : GREEN}
            strokeWidth={2}
            strokeDasharray="6 8"
            opacity={0.35}
          />
        ))}
        <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="rgba(0,21,99,0.08)" strokeWidth={1} />
      </svg>

      {/* center node */}
      <div
        style={{
          position: 'absolute',
          left: centerX - 130,
          top: centerY - 130,
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: NAVY,
          color: WHITE,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: 28,
          boxShadow: '0 6px 18px -6px rgba(0,21,99,0.18)',
          ...RTL_DIR,
        }}
      >
        <img src="/brands/uniex/logos/iconGreen.svg" alt="" style={{ width: 56, height: 56 }} />
        <span className="deck-h3" style={{ fontWeight: 800, color: WHITE, textAlign: 'center' }}>تجربة يونكس</span>
        <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.2em' }}>04 PILLARS</span>
      </div>

      {/* surrounding pillars */}
      {FOUNDATIONS.pillars.map((p, i) => {
        const pos = positions[i];
        const cardW = 360;
        const cardH = 200;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: pos.x - cardW / 2,
              top: pos.y - cardH / 2,
              width: cardW,
              minHeight: cardH,
              background: WHITE,
              borderRadius: 22,
              borderTop: `5px solid ${i % 2 === 0 ? NAVY : GREEN}`,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: '0 8px 22px -8px rgba(0, 21, 99, 0.15)',
              ...RTL_DIR,
            }}
          >
            <span className="deck-label" style={{ letterSpacing: '0.32em', color: i % 2 === 0 ? NAVY : GREEN }}>0{i + 1}</span>
            <span className="deck-h3" style={{ fontWeight: 800, color: NAVY }}>{p.title}</span>
            <span className="deck-body" style={{ color: 'rgba(0,21,99,0.75)' }}>{p.body}</span>
          </div>
        );
      })}

      <div className="deck-caption" style={{ position: 'absolute', bottom: 70, left: 96, right: 96, color: 'rgba(0,21,99,0.62)', textAlign: 'center', ...RTL_DIR }}>
        {FOUNDATIONS.intro}
      </div>
    </Frame>
  );
}

export const FOUNDATIONS_VARIANTS = {
  A: FoundationsA,
  B: FoundationsB,
  C: FoundationsC,
  D: FoundationsD,
  E: FoundationsE,
} as const;

export type FoundationsVariantKey = keyof typeof FOUNDATIONS_VARIANTS;
