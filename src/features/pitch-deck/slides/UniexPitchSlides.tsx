/**
 * Uniex pitch deck slide renderers — 15 hand-tuned compositions in
 * Arabic RTL, navy + green identity. Each renders to the same
 * 1920×1080 canvas as the case-study deck and reuses the shared
 * `<FitText>` so long Arabic strings always fit.
 *
 * Why hand-tuned (not catalog-driven like the case-study deck):
 * the pitch deck slides are STORY-driven — each one says a specific
 * thing in a specific way. The case-study engine is built for
 * brand-archetype slides where the COMPOSITION is the variable
 * (Cover-Bold vs Cover-Editorial). Here, the message is the
 * variable; the layout serves the message.
 */

import type { CSSProperties, ReactNode } from 'react';
import { FitText } from '@/features/case-study-deck/styles/FitText';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';
import {
  COVER,
  PROBLEM,
  SOLUTION,
  PROCESS,
  DIFFERENTIATORS,
  FOUNDATIONS,
  PROGRAMS_INTRO,
  PROGRAMS,
  SCHOOL_BENEFITS,
  METRICS,
  IMPACT,
  TEAM,
  CTA,
} from '../uniexPitchContent';

const NAVY = '#001563';
const NAVY_DEEP = '#0A0F2E';
const GREEN = '#68BE69';
const GREEN_SOFT = 'rgba(104, 190, 105, 0.12)';
const NAVY_SOFT = 'rgba(0, 21, 99, 0.06)';
const PAPER = '#F5F7FB';
const WHITE = '#FFFFFF';

const FONT_DISPLAY = `'IBM Plex Sans Arabic', 'Cairo', 'Inter', sans-serif`;
const FONT_BODY = `'Cairo', 'IBM Plex Sans Arabic', 'Inter', sans-serif`;

const RTL_DIR: CSSProperties = { direction: 'rtl', textAlign: 'right' };

/* ─────────────────────────  shared chrome  ─────────────────────── */

function PageChrome({
  pageNum,
  total,
  section,
  variant,
}: {
  pageNum: number;
  total: number;
  section: string;
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
        <span style={{ ...RTL_DIR, fontWeight: 600, fontSize: 13 }}>{section}</span>
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

function PageFoot({
  text,
  variant,
}: {
  text: string;
  variant: 'light' | 'dark' | 'flood';
}) {
  const muted = variant === 'light' ? 'rgba(0, 21, 99, 0.55)' : 'rgba(255, 255, 255, 0.7)';
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 56,
        left: 96,
        right: 96,
        ...RTL_DIR,
        fontFamily: FONT_BODY,
        fontSize: 13,
        color: muted,
        letterSpacing: '0.04em',
      }}
    >
      {text}
    </div>
  );
}

interface SlideProps {
  index: number;
  total: number;
}

/* ─────────────────────────  shared frame  ─────────────────────── */

function Frame({
  index,
  variant,
  children,
}: {
  index: number;
  variant: 'light' | 'dark' | 'flood';
  children: ReactNode;
}) {
  const bg = variant === 'flood' ? NAVY : variant === 'dark' ? NAVY_DEEP : PAPER;
  const ink = variant === 'light' ? NAVY : WHITE;
  return (
    <div
      data-pitch-slide={index}
      style={{
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
        background: bg,
        color: ink,
        fontFamily: FONT_DISPLAY,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────  slide 1 — cover  ─────────────────────── */

export function CoverSlide({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="flood">
      {/* Decorative iconmark watermark */}
      <img
        src="/brands/uniex/logos/iconGreen.svg"
        alt=""
        style={{ position: 'absolute', top: -120, right: -120, width: 720, opacity: 0.16, filter: 'blur(0.5px)' }}
      />
      <PageChrome pageNum={index} total={total} section="تقديم" variant="flood" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '180px 96px 130px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          ...RTL_DIR,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, color: GREEN, fontSize: 16, letterSpacing: '0.18em', fontWeight: 600 }}>
          <span>{COVER.brand} · uniex</span>
          <span style={{ width: 36, height: 1, background: GREEN }} />
        </div>
        <div>
          <FitText
            as="div"
            maxSize={150}
            minSize={56}
            width={SLIDE_WIDTH - 192}
            height={520}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              lineHeight: 1.18,
              color: WHITE,
              letterSpacing: '-0.01em',
              ...RTL_DIR,
            }}
          >
            {COVER.headline}
          </FitText>
          <div
            style={{
              marginTop: 36,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 24,
              ...RTL_DIR,
            }}
          >
            <span style={{ marginTop: 14, width: 80, height: 4, background: GREEN, flexShrink: 0 }} />
            <FitText
              as="div"
              maxSize={32}
              minSize={16}
              width={1200}
              height={150}
              style={{
                fontFamily: FONT_BODY,
                fontWeight: 400,
                lineHeight: 1.7,
                color: 'rgba(255,255,255,0.86)',
                ...RTL_DIR,
              }}
            >
              {COVER.subhead}
            </FitText>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: FONT_BODY, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
          <span style={{ color: GREEN, fontWeight: 700, letterSpacing: '0.16em' }}>{COVER.tag}</span>
          <span>Pitch Deck · {new Date().getFullYear()}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────────────────  slide 2 — problem  ─────────────────────── */

export function ProblemSlide({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="التحدي" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 44, ...RTL_DIR }}>
        <FitText
          as="div"
          maxSize={88}
          minSize={36}
          width={SLIDE_WIDTH - 192}
          height={140}
          style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, lineHeight: 1.2, color: NAVY, ...RTL_DIR }}
        >
          {PROBLEM.title}
        </FitText>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
          {PROBLEM.pains.map((pain, i) => (
            <div
              key={i}
              style={{
                background: WHITE,
                border: '1px solid rgba(0, 21, 99, 0.10)',
                borderRadius: 20,
                padding: 36,
                minHeight: 220,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 12px 36px -16px rgba(0, 21, 99, 0.18)',
                ...RTL_DIR,
              }}
            >
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 800, color: GREEN }}>
                0{i + 1}
              </span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 22, fontWeight: 600, lineHeight: 1.5, color: NAVY }}>
                {pain}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            background: NAVY,
            borderRadius: 20,
            padding: '32px 40px',
            color: WHITE,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            ...RTL_DIR,
          }}
        >
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, lineHeight: 1.5 }}>
            {PROBLEM.outcome}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 40, height: 2, background: GREEN }} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 18, color: 'rgba(255,255,255,0.86)' }}>
              {PROBLEM.schoolRole}
            </span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────────────────  slide 3 — solution  ─────────────────────── */

export function SolutionSlide({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="الحل" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 50, ...RTL_DIR }}>
        <div>
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: GREEN, fontWeight: 700, letterSpacing: '0.32em' }}>SOLUTION</span>
          <FitText
            as="div"
            maxSize={96}
            minSize={48}
            width={SLIDE_WIDTH - 192}
            height={130}
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, lineHeight: 1.18, color: NAVY, marginTop: 12, ...RTL_DIR }}
          >
            {SOLUTION.title}
          </FitText>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, flex: 1 }}>
          {SOLUTION.pillars.map((p, i) => (
            <div
              key={i}
              style={{
                background: i === 0 ? NAVY : GREEN,
                borderRadius: 28,
                padding: 56,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: WHITE,
                position: 'relative',
                overflow: 'hidden',
                ...RTL_DIR,
              }}
            >
              <span style={{ fontSize: 96, lineHeight: 1 }}>{p.icon}</span>
              <div>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 56, fontWeight: 800, display: 'block', lineHeight: 1.1 }}>
                  {p.title}
                </span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 24, fontWeight: 500, lineHeight: 1.6, marginTop: 18, display: 'block', opacity: 0.95 }}>
                  {p.body}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 32,
            fontWeight: 700,
            color: NAVY,
            ...RTL_DIR,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <span style={{ width: 56, height: 4, background: GREEN }} />
          <span>{SOLUTION.closer}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────────────────  slide 4 — process  ─────────────────────── */

export function ProcessSlide({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="كيف نبني القرار" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 32, ...RTL_DIR }}>
        <div>
          <FitText as="div" maxSize={80} minSize={36} width={SLIDE_WIDTH - 192} height={110} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.2, ...RTL_DIR }}>
            {PROCESS.title}
          </FitText>
          <div style={{ marginTop: 14, fontFamily: FONT_BODY, fontSize: 22, color: 'rgba(0,21,99,0.65)' }}>{PROCESS.intro}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, flex: 1 }}>
          {PROCESS.phases.map((phase, i) => (
            <div
              key={i}
              style={{
                background: WHITE,
                border: `2px solid ${i === 0 ? NAVY : GREEN}`,
                borderRadius: 24,
                padding: 36,
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
                ...RTL_DIR,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
                <span
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 18,
                    fontWeight: 700,
                    color: WHITE,
                    background: i === 0 ? NAVY : GREEN,
                    padding: '6px 18px',
                    borderRadius: 999,
                  }}
                >
                  {phase.label}
                </span>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 44, fontWeight: 800, color: NAVY }}>{phase.title}</span>
              </div>
              <ol style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 0, margin: 0, listStyle: 'none' }}>
                {phase.steps.map((step, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, fontFamily: FONT_BODY, fontSize: 20, color: NAVY, fontWeight: 500, lineHeight: 1.55 }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: GREEN, minWidth: 28 }}>0{j + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              {phase.footer && (
                <span style={{ marginTop: 'auto', fontFamily: FONT_BODY, fontSize: 16, color: 'rgba(0,21,99,0.65)', fontStyle: 'italic' }}>
                  {phase.footer}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────────────────  slide 5 — differentiators  ─────────────────────── */

export function DifferentiatorsSlide({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="ما الذي يميز التجربة" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 50, ...RTL_DIR }}>
        <FitText as="div" maxSize={88} minSize={40} width={SLIDE_WIDTH - 192} height={130} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.18, ...RTL_DIR }}>
          {DIFFERENTIATORS.title}
        </FitText>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 22 }}>
          {DIFFERENTIATORS.items.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 20,
                padding: 28,
                background: i % 2 === 0 ? GREEN_SOFT : NAVY_SOFT,
                borderRadius: 18,
                ...RTL_DIR,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 48,
                  height: 48,
                  borderRadius: 999,
                  background: i % 2 === 0 ? GREEN : NAVY,
                  color: WHITE,
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: 20,
                }}
              >
                ✓
              </span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 22, color: NAVY, fontWeight: 600, lineHeight: 1.55 }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────────────────  slide 6 — foundations  ─────────────────────── */

export function FoundationsSlide({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="الأسس" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 36, ...RTL_DIR }}>
        <div>
          <FitText as="div" maxSize={80} minSize={36} width={SLIDE_WIDTH - 192} height={110} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.18, ...RTL_DIR }}>
            {FOUNDATIONS.title}
          </FitText>
          <div style={{ marginTop: 14, fontFamily: FONT_BODY, fontSize: 22, color: 'rgba(0,21,99,0.65)', maxWidth: 1200 }}>{FOUNDATIONS.intro}</div>
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
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, letterSpacing: '0.18em', color: i % 2 === 0 ? NAVY : GREEN }}>
                0{i + 1}
              </span>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800, color: NAVY, lineHeight: 1.3 }}>
                {p.title}
              </span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 16, color: 'rgba(0,21,99,0.78)', lineHeight: 1.65 }}>
                {p.body}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────────────────  slide 7 — programs intro  ─────────────────────── */

export function ProgramsIntroSlide({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="dark">
      <PageChrome pageNum={index} total={total} section="برامج «أثر»" variant="dark" />
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

/* ─────────────────────────  slides 8/9/10 — program detail  ─────────────────────── */

export function ProgramDetailSlide({ index, total, programKey }: SlideProps & { programKey: 'bedaya' | 'masar' | 'riyada' }) {
  const p = PROGRAMS[programKey];
  const tinted = programKey === 'bedaya' ? GREEN : programKey === 'masar' ? NAVY : NAVY_DEEP;
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section={`مسار: ${p.name}`} variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 36, ...RTL_DIR }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <FitText as="div" maxSize={108} minSize={48} width={1100} height={130} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.1, ...RTL_DIR }}>
              {p.name}
            </FitText>
          </div>
          <div style={{ background: tinted, color: WHITE, padding: '18px 32px', borderRadius: 999, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28 }}>
            {p.duration}
          </div>
        </div>
        <FitText as="div" maxSize={26} minSize={16} width={SLIDE_WIDTH - 192} height={88} style={{ fontFamily: FONT_BODY, color: 'rgba(0,21,99,0.78)', lineHeight: 1.7, fontWeight: 500, ...RTL_DIR }}>
          {p.description}
        </FitText>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 22, flex: 1 }}>
          {/* Goal */}
          <div style={{ background: NAVY, color: WHITE, borderRadius: 22, padding: 32, display: 'flex', flexDirection: 'column', gap: 14, ...RTL_DIR }}>
            <span style={{ fontSize: 36 }}>🎯</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, letterSpacing: '0.32em', color: GREEN }}>الهدف</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 18, fontWeight: 500, lineHeight: 1.7 }}>{p.goal}</span>
          </div>
          {/* Phases */}
          <div style={{ background: WHITE, border: `2px solid ${tinted}`, borderRadius: 22, padding: 32, display: 'flex', flexDirection: 'column', gap: 14, ...RTL_DIR }}>
            <span style={{ fontSize: 36 }}>🧭</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, letterSpacing: '0.32em', color: tinted }}>مراحل المسار</span>
            <ol style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 0, margin: 0, listStyle: 'none' }}>
              {p.phases.map((phase, j) => (
                <li key={j} style={{ display: 'flex', gap: 12, fontFamily: FONT_BODY, fontSize: 16, color: NAVY, fontWeight: 500, lineHeight: 1.55 }}>
                  <span style={{ minWidth: 22, fontWeight: 800, color: tinted }}>{j + 1}.</span>
                  <span>{phase}</span>
                </li>
              ))}
            </ol>
          </div>
          {/* Outputs */}
          <div style={{ background: GREEN_SOFT, borderRadius: 22, padding: 32, display: 'flex', flexDirection: 'column', gap: 14, ...RTL_DIR }}>
            <span style={{ fontSize: 36 }}>📊</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, letterSpacing: '0.32em', color: GREEN }}>المخرجات</span>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 0, margin: 0, listStyle: 'none' }}>
              {p.outputs.map((out, j) => (
                <li key={j} style={{ display: 'flex', gap: 12, fontFamily: FONT_BODY, fontSize: 16, color: NAVY, fontWeight: 500, lineHeight: 1.55 }}>
                  <span style={{ color: GREEN, fontWeight: 800 }}>•</span>
                  <span>{out}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────────────────  slide 11 — school benefits  ─────────────────────── */

export function SchoolBenefitsSlide({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="فوائد المدرسة" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 40, ...RTL_DIR }}>
        <FitText as="div" maxSize={88} minSize={40} width={SLIDE_WIDTH - 192} height={130} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.18, ...RTL_DIR }}>
          {SCHOOL_BENEFITS.title}
        </FitText>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 30, flex: 1 }}>
          {SCHOOL_BENEFITS.groups.map((g, i) => (
            <div
              key={i}
              style={{
                background: i === 0 ? NAVY : WHITE,
                color: i === 0 ? WHITE : NAVY,
                border: i === 0 ? 'none' : '1px solid rgba(0,21,99,0.10)',
                borderRadius: 24,
                padding: 40,
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
                boxShadow: i === 0 ? 'none' : '0 12px 36px -16px rgba(0, 21, 99, 0.16)',
                ...RTL_DIR,
              }}
            >
              <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, letterSpacing: '0.32em', color: i === 0 ? GREEN : 'rgba(0,21,99,0.55)' }}>
                {g.heading}
              </span>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 0, margin: 0, listStyle: 'none' }}>
                {g.items.map((item, j) => (
                  <li key={j} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', fontFamily: FONT_BODY, fontSize: 22, fontWeight: 500, lineHeight: 1.55 }}>
                    <span style={{ color: GREEN, fontWeight: 800, fontSize: 24 }}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ background: GREEN, borderRadius: 18, padding: '24px 32px', color: WHITE, fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, lineHeight: 1.5, ...RTL_DIR }}>
          {SCHOOL_BENEFITS.closer}
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────────────────  slide 12 — metrics  ─────────────────────── */

export function MetricsSlide({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="flood">
      <PageChrome pageNum={index} total={total} section="مؤشرات الأثر" variant="flood" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 50, ...RTL_DIR }}>
        <div>
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: GREEN, fontWeight: 700, letterSpacing: '0.32em' }}>METRICS</span>
          <FitText as="div" maxSize={96} minSize={48} width={SLIDE_WIDTH - 192} height={140} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: WHITE, lineHeight: 1.18, marginTop: 12, ...RTL_DIR }}>
            {METRICS.title}
          </FitText>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
          {METRICS.stats.map((s, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 24,
                padding: 44,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                ...RTL_DIR,
              }}
            >
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 96, fontWeight: 800, color: GREEN, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {s.value}
              </span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 22, color: WHITE, fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {METRICS.notes.map((n, i) => (
            <span
              key={i}
              style={{
                fontFamily: FONT_BODY,
                fontSize: 16,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.16)',
                padding: '10px 18px',
                borderRadius: 999,
              }}
            >
              · {n}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 18, color: GREEN, fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700 }}>
          <span style={{ width: 50, height: 4, background: GREEN }} />
          <span>{METRICS.closer}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────────────────  slide 13 — impact  ─────────────────────── */

export function ImpactSlide({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="التجربة الواقعية" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 40, ...RTL_DIR }}>
        <FitText as="div" maxSize={96} minSize={40} width={SLIDE_WIDTH - 192} height={130} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.18, ...RTL_DIR }}>
          {IMPACT.title}
        </FitText>
        <div style={{ fontFamily: FONT_BODY, fontSize: 24, color: 'rgba(0,21,99,0.7)', maxWidth: 1100 }}>{IMPACT.caption}</div>
        <div
          style={{
            flex: 1,
            background: NAVY,
            borderRadius: 28,
            padding: 60,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: WHITE,
            position: 'relative',
            overflow: 'hidden',
            ...RTL_DIR,
          }}
        >
          <FitText as="div" maxSize={48} minSize={22} width={1500} height={140} style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: WHITE, lineHeight: 1.4, ...RTL_DIR }}>
            "{IMPACT.question}"
          </FitText>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: 999, background: GREEN, fontSize: 32 }}>▶</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 18, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.18em' }}>🎥 {IMPACT.videoPlaceholder}</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────────────────  slide 14 — team  ─────────────────────── */

export function TeamSlide({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="الفريق والشركاء" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 40, ...RTL_DIR }}>
        <FitText as="div" maxSize={96} minSize={40} width={SLIDE_WIDTH - 192} height={130} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.18, ...RTL_DIR }}>
          {TEAM.title}
        </FitText>
        <div style={{ fontFamily: FONT_BODY, fontSize: 26, color: 'rgba(0,21,99,0.78)', maxWidth: 1300, fontWeight: 500 }}>{TEAM.intro}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, flex: 1 }}>
          {TEAM.specialties.map((s, i) => (
            <div
              key={i}
              style={{
                background: i === 1 ? NAVY : WHITE,
                color: i === 1 ? WHITE : NAVY,
                border: i === 1 ? 'none' : `2px solid ${NAVY}`,
                borderRadius: 24,
                padding: 36,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 18,
                ...RTL_DIR,
              }}
            >
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, letterSpacing: '0.32em', color: i === 1 ? GREEN : NAVY, opacity: i === 1 ? 1 : 0.55 }}>
                0{i + 1}
              </span>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 800, lineHeight: 1.3 }}>
                {s}
              </span>
            </div>
          ))}
        </div>
        <div style={{ background: GREEN_SOFT, borderRadius: 18, padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 18, ...RTL_DIR }}>
          <span style={{ width: 40, height: 2, background: GREEN }} />
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: NAVY, fontWeight: 600 }}>{TEAM.closer}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────────────────  slide 15 — CTA  ─────────────────────── */

export function CtaSlide({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="flood">
      <img
        src="/brands/uniex/logos/iconGreen.svg"
        alt=""
        style={{ position: 'absolute', bottom: -180, left: -180, width: 720, opacity: 0.16 }}
      />
      <PageChrome pageNum={index} total={total} section="تواصل معنا" variant="flood" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 50, ...RTL_DIR }}>
        <div>
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: GREEN, fontWeight: 700, letterSpacing: '0.32em' }}>NEXT STEP</span>
          <FitText as="div" maxSize={96} minSize={48} width={SLIDE_WIDTH - 192} height={170} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: WHITE, lineHeight: 1.18, marginTop: 12, ...RTL_DIR }}>
            {CTA.title}
          </FitText>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {CTA.steps.map((s, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 22,
                padding: 36,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                ...RTL_DIR,
              }}
            >
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 800, color: GREEN, lineHeight: 1 }}>0{i + 1}</span>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: WHITE, lineHeight: 1.4 }}>{s}</span>
            </div>
          ))}
        </div>
        <div style={{ background: GREEN, borderRadius: 22, padding: '36px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, ...RTL_DIR }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800, color: NAVY, lineHeight: 1.4 }}>{CTA.cta}</span>
          <div
            style={{
              width: 110,
              height: 110,
              background: WHITE,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: NAVY,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            QR
          </div>
        </div>
      </div>
    </Frame>
  );
}
