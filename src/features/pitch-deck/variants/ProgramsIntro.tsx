/**
 * ProgramsIntro slide variants — 5 visually-distinct layouts for the
 * 3-path "برامج أثر" preview (slide 7 of the uniex pitch deck).
 *
 * Variant A is the original implementation extracted from
 * `slides/UniexPitchSlides.tsx`; B–E are alt directions.
 */

import type { CSSProperties, ReactNode } from 'react';
import { FitText } from '@/features/case-study-deck/styles/FitText';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';
import { PROGRAMS_INTRO } from '../uniexPitchContent';
import { StudentClimbingChart } from '../illustrations';
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
        <span className="deck-caption" style={{ ...RTL_DIR, fontWeight: 600, color: chromeColor }}>برامج «أثر»</span>
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
  const fallback = variant === 'flood' ? GREEN : variant === 'dark' ? NAVY_DEEP : PAPER;
  const ink = variant === 'light' ? NAVY : WHITE;
  return (
    <div
      data-pitch-slide={index}
      data-pitch-kind="programs-intro"
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

/* ──────────────────  A — original navy dark, 3 cards ────────────────── */

export function ProgramsIntroA({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="dark">
      <PageChrome pageNum={index} total={total} variant="dark" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 50, ...RTL_DIR }}>
        <div>
          <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>PROGRAMS</span>
          <FitText as="div" maxSize={140} minSize={56} width={SLIDE_WIDTH - 192} height={180} style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, color: WHITE, lineHeight: 1.1, marginTop: 12, ...RTL_DIR }}>
            {PROGRAMS_INTRO.title}
          </FitText>
          <div className="deck-body" style={{ marginTop: 18, color: 'rgba(255,255,255,0.82)' }}>{PROGRAMS_INTRO.subtitle}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, flex: 1 }}>
          {PROGRAMS_INTRO.paths.map((p, i) => (
            <div
              key={p.key}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 22,
                padding: 36,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 24,
                ...RTL_DIR,
              }}
            >
              {/* Decorative giant numeral */}
              <span style={{ fontFamily: HEADING_FAMILY, fontSize: 96, fontWeight: 800, color: GREEN, lineHeight: 1 }}>0{i + 1}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="deck-h2" style={{ fontWeight: 800, color: WHITE }}>{p.name}</span>
                <span className="deck-body" style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>{p.tagline}</span>
                <span className="deck-body" style={{ marginTop: 10, fontWeight: 600, color: GREEN }}>{p.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ──────────────────  B — vertical pillars w/ progressive heights ────────────────── */

export function ProgramsIntroB({ index, total }: SlideProps) {
  // bedaya = 4h, masar = 9h, riyada = 50h — heights scale roughly accordingly.
  const heights = [320, 460, 640];
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 24, ...RTL_DIR }}>
        <FitText as="div" maxSize={88} minSize={40} width={SLIDE_WIDTH - 192} height={130} style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, color: NAVY, lineHeight: 1.18, ...RTL_DIR }}>
          {PROGRAMS_INTRO.title}
        </FitText>
        <div className="deck-body" style={{ color: 'rgba(0,21,99,0.65)', maxWidth: 1200 }}>{PROGRAMS_INTRO.subtitle}</div>

        <div
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 32,
            alignItems: 'flex-end',
            flex: 1,
            paddingBottom: 30,
          }}
        >
          {/* baseline */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 30, height: 2, background: NAVY, opacity: 0.12 }} />
          {PROGRAMS_INTRO.paths.map((p, i) => {
            const accent = i === 0 ? GREEN : i === 1 ? NAVY : NAVY_DEEP;
            const fg = i === 0 ? NAVY : WHITE;
            const heightPx = heights[i];
            return (
              <div
                key={p.key}
                style={{
                  position: 'relative',
                  background: accent,
                  height: heightPx,
                  borderRadius: '36px 36px 0 0',
                  padding: 32,
                  color: fg,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 -16px 40px -16px rgba(0,21,99,0.18)',
                  ...RTL_DIR,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span className="deck-label" style={{ letterSpacing: '0.32em', color: i === 0 ? NAVY : GREEN, opacity: i === 0 ? 0.7 : 1 }}>0{i + 1} · {p.tagline}</span>
                  <span className="deck-h2" style={{ fontWeight: 800, color: fg }}>{p.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-start' }}>
                  {/* Decorative giant numeral */}
                  <span style={{ fontFamily: HEADING_FAMILY, fontSize: 64, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', color: i === 0 ? NAVY : WHITE }}>
                    {p.duration.split(' ')[0]}
                  </span>
                  <span className="deck-body" style={{ opacity: 0.85, fontWeight: 600, color: fg }}>
                    {p.duration.split(' ').slice(1).join(' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Frame>
  );
}

/* ──────────────────  C — image #2 left half, paths stacked right ────────────────── */

export function ProgramsIntroC({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light" bg={NAVY}>
      <PageChrome pageNum={index} total={total} variant="flood" />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 760,
          height: SLIDE_HEIGHT,
          background: NAVY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <ReplaceableArtwork
          slotId="programs-intro-C-chart"
          defaultQuery="student progress chart"
          style={{ width: 780, height: 780 }}
        >
          <StudentClimbingChart size={780} transparent />
        </ReplaceableArtwork>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 760,
          top: 0,
          width: SLIDE_WIDTH - 760,
          height: SLIDE_HEIGHT,
          padding: '170px 96px 130px 80px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
          ...RTL_DIR,
        }}
      >
        <div>
          <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>PROGRAMS · أثر</span>
          <FitText as="div" maxSize={80} minSize={40} width={1000} height={120} style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, color: WHITE, lineHeight: 1.18, marginTop: 12, ...RTL_DIR }}>
            {PROGRAMS_INTRO.title}
          </FitText>
          <div className="deck-body" style={{ marginTop: 14, color: 'rgba(255,255,255,0.78)' }}>{PROGRAMS_INTRO.subtitle}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          {PROGRAMS_INTRO.paths.map((p, i) => (
            <div
              key={p.key}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 18,
                padding: '22px 26px',
                display: 'grid',
                gridTemplateColumns: '60px 1fr auto',
                alignItems: 'center',
                gap: 22,
                ...RTL_DIR,
              }}
            >
              <span className="deck-h2" style={{ fontWeight: 800, color: GREEN }}>0{i + 1}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="deck-h3" style={{ fontWeight: 800, color: WHITE }}>{p.name}</span>
                <span className="deck-body" style={{ color: 'rgba(255,255,255,0.6)' }}>{p.tagline}</span>
              </div>
              <span className="deck-body" style={{ background: GREEN, color: NAVY, padding: '8px 18px', borderRadius: 999, fontWeight: 800, whiteSpace: 'nowrap' }}>
                {p.duration}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ──────────────────  D — concentric layers (entry → core → mastery) ────────────────── */

export function ProgramsIntroD({ index, total }: SlideProps) {
  // Three nested rounded panels representing depth.
  const layers = [
    { width: 1500, height: 540, top: 240, color: GREEN_SOFT, accent: GREEN },
    { width: 1180, height: 380, top: 320, color: 'rgba(0,21,99,0.10)', accent: NAVY },
    { width: 820, height: 220, top: 400, color: NAVY, accent: WHITE },
  ];
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} variant="light" />
      <div style={{ position: 'absolute', top: 130, left: 96, right: 96, ...RTL_DIR }}>
        <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>PROGRAMS</span>
        <FitText as="div" maxSize={64} minSize={32} width={SLIDE_WIDTH - 192} height={88} style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, color: NAVY, lineHeight: 1.18, marginTop: 6, ...RTL_DIR }}>
          {PROGRAMS_INTRO.title}
        </FitText>
      </div>

      {/* Concentric panels */}
      {layers.map((layer, i) => {
        const left = (SLIDE_WIDTH - layer.width) / 2;
        const path = PROGRAMS_INTRO.paths[i];
        const isInner = i === 2;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left,
              top: layer.top,
              width: layer.width,
              height: layer.height,
              borderRadius: 36,
              background: layer.color,
              border: i === 2 ? 'none' : `2px solid ${layer.accent}`,
              padding: 40,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'flex-start',
              ...RTL_DIR,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* Decorative giant numeral */}
              <span style={{ fontFamily: HEADING_FAMILY, fontSize: 56, fontWeight: 800, color: isInner ? GREEN : layer.accent, lineHeight: 1 }}>0{i + 1}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="deck-h3" style={{ fontWeight: 800, color: isInner ? WHITE : NAVY }}>{path.name}</span>
                <span className="deck-body" style={{ color: isInner ? 'rgba(255,255,255,0.7)' : 'rgba(0,21,99,0.62)' }}>{path.tagline} · {path.duration}</span>
              </div>
            </div>
          </div>
        );
      })}

      <div className="deck-body" style={{ position: 'absolute', bottom: 90, left: 96, right: 96, color: 'rgba(0,21,99,0.62)', textAlign: 'center', ...RTL_DIR }}>
        {PROGRAMS_INTRO.subtitle}
      </div>
    </Frame>
  );
}

/* ──────────────────  E — green flood, 3 outlined cards w/ hour bubbles ────────────────── */

export function ProgramsIntroE({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="flood" bg={GREEN}>
      <PageChrome pageNum={index} total={total} variant="flood" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 38, ...RTL_DIR }}>
        <div>
          <span className="deck-label" style={{ color: NAVY, letterSpacing: '0.32em' }}>PROGRAMS · أثر</span>
          <FitText as="div" maxSize={140} minSize={56} width={SLIDE_WIDTH - 192} height={180} style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, color: NAVY, lineHeight: 1.1, marginTop: 12, ...RTL_DIR }}>
            {PROGRAMS_INTRO.title}
          </FitText>
          <div className="deck-body" style={{ marginTop: 14, color: 'rgba(0,21,99,0.78)' }}>{PROGRAMS_INTRO.subtitle}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, flex: 1 }}>
          {PROGRAMS_INTRO.paths.map((p, i) => (
            <div
              key={p.key}
              style={{
                position: 'relative',
                background: 'transparent',
                border: `2px solid ${NAVY}`,
                borderRadius: 26,
                padding: '40px 32px 36px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                color: NAVY,
                ...RTL_DIR,
              }}
            >
              {/* hour bubble */}
              <div
                style={{
                  position: 'absolute',
                  top: -38,
                  right: 32,
                  width: 90,
                  height: 90,
                  borderRadius: '50%',
                  background: NAVY,
                  color: WHITE,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 12px 24px -8px rgba(0,21,99,0.4)',
                }}
              >
                <span className="deck-h3" style={{ fontWeight: 800, lineHeight: 1, color: GREEN }}>{p.duration.split(' ')[0]}</span>
                <span className="deck-caption" style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{p.duration.split(' ').slice(1).join(' ')}</span>
              </div>
              <span className="deck-label" style={{ letterSpacing: '0.32em', color: NAVY, opacity: 0.55, marginTop: 28 }}>0{i + 1}</span>
              <FitText as="div" maxSize={42} minSize={26} width={400} height={110} style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, color: NAVY, lineHeight: 1.2, ...RTL_DIR }}>
                {p.name}
              </FitText>
              <span className="deck-body" style={{ color: 'rgba(0,21,99,0.78)', fontWeight: 600 }}>{p.tagline}</span>
              <div style={{ marginTop: 'auto', height: 4, background: NAVY, opacity: 0.18, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export const PROGRAMS_INTRO_VARIANTS = {
  A: ProgramsIntroA,
  B: ProgramsIntroB,
  C: ProgramsIntroC,
  D: ProgramsIntroD,
  E: ProgramsIntroE,
} as const;

export type ProgramsIntroVariantKey = keyof typeof PROGRAMS_INTRO_VARIANTS;
