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

const NAVY = '#001563';
const NAVY_DEEP = '#0A0F2E';
const GREEN = '#68BE69';
const GREEN_SOFT = 'rgba(104, 190, 105, 0.12)';
const PAPER = '#F5F7FB';
const WHITE = '#FFFFFF';

const FONT_DISPLAY = `'IBM Plex Sans Arabic', 'Cairo', 'Inter', sans-serif`;
const FONT_BODY = `'Cairo', 'IBM Plex Sans Arabic', 'Inter', sans-serif`;
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
  const ink = variant === 'light' ? NAVY : WHITE;
  const muted = variant === 'light' ? 'rgba(0, 21, 99, 0.55)' : 'rgba(255, 255, 255, 0.7)';
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
          fontFamily: FONT_BODY,
          fontSize: 14,
          color: muted,
          letterSpacing: '0.04em',
        }}
      >
        <span style={{ fontWeight: 700, color: ink, letterSpacing: '0.06em' }}>uniex</span>
        <span style={{ ...RTL_DIR, fontWeight: 600, fontSize: 13 }}>برامج «أثر»</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
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
          background: variant === 'light' ? 'rgba(0,21,99,0.10)' : 'rgba(255,255,255,0.16)',
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
        fontFamily: FONT_DISPLAY,
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
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: GREEN, fontWeight: 700, letterSpacing: '0.32em' }}>PROGRAMS</span>
          <FitText as="div" maxSize={140} minSize={56} width={SLIDE_WIDTH - 192} height={180} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: WHITE, lineHeight: 1.1, marginTop: 12, ...RTL_DIR }}>
            {PROGRAMS_INTRO.title}
          </FitText>
          <div style={{ marginTop: 18, fontFamily: FONT_BODY, fontSize: 24, color: 'rgba(255,255,255,0.82)' }}>{PROGRAMS_INTRO.subtitle}</div>
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
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 96, fontWeight: 800, color: GREEN, lineHeight: 1 }}>0{i + 1}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 800, color: WHITE, lineHeight: 1.15 }}>{p.name}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 16, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>{p.tagline}</span>
                <span style={{ marginTop: 10, fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: GREEN }}>{p.duration}</span>
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
        <FitText as="div" maxSize={88} minSize={40} width={SLIDE_WIDTH - 192} height={130} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.18, ...RTL_DIR }}>
          {PROGRAMS_INTRO.title}
        </FitText>
        <div style={{ fontFamily: FONT_BODY, fontSize: 22, color: 'rgba(0,21,99,0.65)', maxWidth: 1200 }}>{PROGRAMS_INTRO.subtitle}</div>

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
                  <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, letterSpacing: '0.32em', color: i === 0 ? NAVY : GREEN, opacity: i === 0 ? 0.7 : 1 }}>0{i + 1} · {p.tagline}</span>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>{p.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-start' }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', color: i === 0 ? NAVY : WHITE }}>
                    {p.duration.split(' ')[0]}
                  </span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 16, opacity: 0.85, fontWeight: 600 }}>
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
      <img
        src="/brands/uniex/designs/2.jpg"
        alt=""
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 760,
          height: SLIDE_HEIGHT,
          objectFit: 'cover',
        }}
      />
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
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: GREEN, fontWeight: 700, letterSpacing: '0.32em' }}>PROGRAMS · أثر</span>
          <FitText as="div" maxSize={80} minSize={40} width={1000} height={120} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: WHITE, lineHeight: 1.18, marginTop: 12, ...RTL_DIR }}>
            {PROGRAMS_INTRO.title}
          </FitText>
          <div style={{ marginTop: 14, fontFamily: FONT_BODY, fontSize: 18, color: 'rgba(255,255,255,0.78)', lineHeight: 1.7 }}>{PROGRAMS_INTRO.subtitle}</div>
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
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 40, fontWeight: 800, color: GREEN, lineHeight: 1 }}>0{i + 1}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800, color: WHITE, lineHeight: 1.25 }}>{p.name}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{p.tagline}</span>
              </div>
              <span style={{ background: GREEN, color: NAVY, padding: '8px 18px', borderRadius: 999, fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 800, whiteSpace: 'nowrap' }}>
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
        <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: GREEN, fontWeight: 700, letterSpacing: '0.32em' }}>PROGRAMS</span>
        <FitText as="div" maxSize={64} minSize={32} width={SLIDE_WIDTH - 192} height={88} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.18, marginTop: 6, ...RTL_DIR }}>
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
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 56, fontWeight: 800, color: isInner ? GREEN : layer.accent, lineHeight: 1 }}>0{i + 1}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800, color: isInner ? WHITE : NAVY, lineHeight: 1.25 }}>{path.name}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: isInner ? 'rgba(255,255,255,0.7)' : 'rgba(0,21,99,0.62)' }}>{path.tagline} · {path.duration}</span>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ position: 'absolute', bottom: 90, left: 96, right: 96, fontFamily: FONT_BODY, fontSize: 18, color: 'rgba(0,21,99,0.62)', textAlign: 'center', ...RTL_DIR }}>
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
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: NAVY, fontWeight: 700, letterSpacing: '0.32em' }}>PROGRAMS · أثر</span>
          <FitText as="div" maxSize={140} minSize={56} width={SLIDE_WIDTH - 192} height={180} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.1, marginTop: 12, ...RTL_DIR }}>
            {PROGRAMS_INTRO.title}
          </FitText>
          <div style={{ marginTop: 14, fontFamily: FONT_BODY, fontSize: 24, color: 'rgba(0,21,99,0.78)' }}>{PROGRAMS_INTRO.subtitle}</div>
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
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800, lineHeight: 1, color: GREEN }}>{p.duration.split(' ')[0]}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{p.duration.split(' ').slice(1).join(' ')}</span>
              </div>
              <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, letterSpacing: '0.32em', color: NAVY, opacity: 0.55, marginTop: 28 }}>0{i + 1}</span>
              <FitText as="div" maxSize={42} minSize={26} width={400} height={110} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.2, ...RTL_DIR }}>
                {p.name}
              </FitText>
              <span style={{ fontFamily: FONT_BODY, fontSize: 18, color: 'rgba(0,21,99,0.78)', fontWeight: 600, lineHeight: 1.55 }}>{p.tagline}</span>
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
