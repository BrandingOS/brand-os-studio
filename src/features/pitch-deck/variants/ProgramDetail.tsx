/**
 * ProgramDetail slide variants — 5 visually-distinct layouts for a
 * single program path (slides 8/9/10 of the uniex pitch deck).
 *
 * Component takes a `programKey` prop ('bedaya' | 'masar' | 'riyada')
 * which selects the program data from PROGRAMS in
 * `uniexPitchContent.ts`. The same variant rendered with a different
 * key produces a different program slide.
 *
 * Variant A is the original implementation extracted from
 * `slides/UniexPitchSlides.tsx`; B–E are alt directions.
 */

import type { CSSProperties, ReactNode } from 'react';
import { FitText } from '@/features/case-study-deck/styles/FitText';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';
import { PROGRAMS } from '../uniexPitchContent';

const NAVY = '#001563';
const NAVY_DEEP = '#0A0F2E';
const GREEN = '#68BE69';
const GREEN_SOFT = 'rgba(104, 190, 105, 0.12)';
const PAPER = '#F5F7FB';
const WHITE = '#FFFFFF';

const FONT_DISPLAY = `'IBM Plex Sans Arabic', 'Cairo', 'Inter', sans-serif`;
const FONT_BODY = `'Cairo', 'IBM Plex Sans Arabic', 'Inter', sans-serif`;
const RTL_DIR: CSSProperties = { direction: 'rtl', textAlign: 'right' };

type ProgramKey = 'bedaya' | 'masar' | 'riyada';
interface SlideProps {
  index: number;
  total: number;
  programKey: ProgramKey;
}

function tintFor(key: ProgramKey) {
  return key === 'bedaya' ? GREEN : key === 'masar' ? NAVY : NAVY_DEEP;
}

function PageChrome({
  pageNum,
  total,
  variant,
  programName,
}: {
  pageNum: number;
  total: number;
  variant: 'light' | 'dark' | 'flood';
  programName: string;
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
        <span style={{ ...RTL_DIR, fontWeight: 600, fontSize: 13 }}>مسار: {programName}</span>
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
  programKey,
}: {
  index: number;
  variant: 'light' | 'dark' | 'flood';
  children: ReactNode;
  bg?: string;
  programKey: ProgramKey;
}) {
  const fallback = variant === 'flood' ? NAVY : variant === 'dark' ? NAVY_DEEP : PAPER;
  const ink = variant === 'light' ? NAVY : WHITE;
  return (
    <div
      data-pitch-slide={index}
      data-pitch-kind="program-detail"
      data-program-key={programKey}
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

/* ──────────────────  A — original 3-col Goal/Phases/Outputs ────────────────── */

export function ProgramDetailA({ index, total, programKey }: SlideProps) {
  const p = PROGRAMS[programKey];
  const tinted = tintFor(programKey);
  return (
    <Frame index={index} variant="light" programKey={programKey}>
      <PageChrome pageNum={index} total={total} variant="light" programName={p.name} />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 36, ...RTL_DIR }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <FitText as="div" maxSize={108} minSize={48} width={1100} height={130} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.1, ...RTL_DIR }}>
            {p.name}
          </FitText>
          <div style={{ background: tinted, color: WHITE, padding: '18px 32px', borderRadius: 999, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28 }}>
            {p.duration}
          </div>
        </div>
        <FitText as="div" maxSize={26} minSize={16} width={SLIDE_WIDTH - 192} height={88} style={{ fontFamily: FONT_BODY, color: 'rgba(0,21,99,0.78)', lineHeight: 1.7, fontWeight: 500, ...RTL_DIR }}>
          {p.description}
        </FitText>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 22, flex: 1 }}>
          <div style={{ background: NAVY, color: WHITE, borderRadius: 22, padding: 32, display: 'flex', flexDirection: 'column', gap: 14, ...RTL_DIR }}>
            <span style={{ fontSize: 36 }}>🎯</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, letterSpacing: '0.32em', color: GREEN }}>الهدف</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 18, fontWeight: 500, lineHeight: 1.7 }}>{p.goal}</span>
          </div>
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

/* ──────────────────  B — navy flood with glass cards ────────────────── */

export function ProgramDetailB({ index, total, programKey }: SlideProps) {
  const p = PROGRAMS[programKey];
  return (
    <Frame index={index} variant="flood" programKey={programKey}>
      <div style={{ position: 'absolute', top: -200, right: -200, width: 600, height: 600, borderRadius: '50%', background: 'rgba(104,190,105,0.18)', filter: 'blur(80px)' }} />
      <div style={{ position: 'absolute', bottom: -200, left: -150, width: 500, height: 500, borderRadius: '50%', background: 'rgba(104,190,105,0.10)', filter: 'blur(70px)' }} />
      <PageChrome pageNum={index} total={total} variant="flood" programName={p.name} />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 28, ...RTL_DIR }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: GREEN, fontWeight: 700, letterSpacing: '0.32em' }}>PROGRAM · {programKey.toUpperCase()}</span>
            <FitText as="div" maxSize={104} minSize={48} width={1100} height={130} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: WHITE, lineHeight: 1.1, marginTop: 8, ...RTL_DIR }}>
              {p.name}
            </FitText>
          </div>
          <div style={{ background: GREEN, color: NAVY, padding: '18px 32px', borderRadius: 999, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28 }}>
            {p.duration}
          </div>
        </div>
        <FitText as="div" maxSize={24} minSize={16} width={SLIDE_WIDTH - 192} height={70} style={{ fontFamily: FONT_BODY, color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, fontWeight: 500, ...RTL_DIR }}>
          {p.description}
        </FitText>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 20, flex: 1 }}>
          {/* Goal */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.16)',
              backdropFilter: 'blur(12px)',
              borderRadius: 24,
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              ...RTL_DIR,
            }}
          >
            <span style={{ fontSize: 32 }}>🎯</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.32em', color: GREEN }}>الهدف</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 18, fontWeight: 500, lineHeight: 1.7, color: WHITE }}>{p.goal}</span>
          </div>
          <div
            style={{
              background: 'rgba(104,190,105,0.10)',
              border: `1px solid ${GREEN}`,
              borderRadius: 24,
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              ...RTL_DIR,
            }}
          >
            <span style={{ fontSize: 32 }}>🧭</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.32em', color: GREEN }}>مراحل المسار</span>
            <ol style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 0, margin: 0, listStyle: 'none' }}>
              {p.phases.map((phase, j) => (
                <li key={j} style={{ display: 'flex', gap: 12, fontFamily: FONT_BODY, fontSize: 16, color: WHITE, fontWeight: 500, lineHeight: 1.55 }}>
                  <span style={{ minWidth: 22, fontWeight: 800, color: GREEN }}>{j + 1}.</span>
                  <span>{phase}</span>
                </li>
              ))}
            </ol>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.16)',
              backdropFilter: 'blur(12px)',
              borderRadius: 24,
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              ...RTL_DIR,
            }}
          >
            <span style={{ fontSize: 32 }}>📊</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.32em', color: GREEN }}>المخرجات</span>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 0, margin: 0, listStyle: 'none' }}>
              {p.outputs.map((out, j) => (
                <li key={j} style={{ display: 'flex', gap: 12, fontFamily: FONT_BODY, fontSize: 16, color: WHITE, fontWeight: 500, lineHeight: 1.55 }}>
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

/* ──────────────────  C — image #1 hero on top + 3 cards below ────────────────── */

export function ProgramDetailC({ index, total, programKey }: SlideProps) {
  const p = PROGRAMS[programKey];
  const tinted = tintFor(programKey);
  return (
    <Frame index={index} variant="light" programKey={programKey}>
      <PageChrome pageNum={index} total={total} variant="light" programName={p.name} />
      {/* Hero image strip */}
      <div
        style={{
          position: 'absolute',
          top: 130,
          left: 96,
          right: 96,
          height: 320,
          borderRadius: 28,
          overflow: 'hidden',
          background: NAVY,
          ...RTL_DIR,
        }}
      >
        <img
          src="/brands/uniex/designs/1.jpg"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(270deg, rgba(0,21,99,0.95) 0%, rgba(0,21,99,0.5) 60%, rgba(0,21,99,0.2) 100%)`,
          }}
        />
        <div style={{ position: 'absolute', inset: 0, padding: 44, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', ...RTL_DIR }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: GREEN, fontWeight: 700, letterSpacing: '0.32em' }}>PROGRAM · {programKey.toUpperCase()}</span>
            <span style={{ background: GREEN, color: NAVY, padding: '12px 24px', borderRadius: 999, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>
              {p.duration}
            </span>
          </div>
          <div>
            <FitText as="div" maxSize={88} minSize={40} width={1500} height={120} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: WHITE, lineHeight: 1.1, ...RTL_DIR }}>
              {p.name}
            </FitText>
            <FitText as="div" maxSize={20} minSize={14} width={1500} height={48} style={{ fontFamily: FONT_BODY, color: 'rgba(255,255,255,0.86)', lineHeight: 1.6, marginTop: 8, ...RTL_DIR }}>
              {p.description}
            </FitText>
          </div>
        </div>
      </div>

      {/* 3 cards below */}
      <div style={{ position: 'absolute', top: 490, left: 96, right: 96, bottom: 130, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
        <div style={{ background: NAVY, color: WHITE, borderRadius: 22, padding: 28, display: 'flex', flexDirection: 'column', gap: 14, ...RTL_DIR }}>
          <span style={{ fontSize: 32 }}>🎯</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.32em', color: GREEN }}>الهدف</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 17, fontWeight: 500, lineHeight: 1.65 }}>{p.goal}</span>
        </div>
        <div style={{ background: WHITE, border: `2px solid ${tinted}`, borderRadius: 22, padding: 28, display: 'flex', flexDirection: 'column', gap: 14, ...RTL_DIR }}>
          <span style={{ fontSize: 32 }}>🧭</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.32em', color: tinted }}>مراحل المسار</span>
          <ol style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 0, margin: 0, listStyle: 'none' }}>
            {p.phases.map((phase, j) => (
              <li key={j} style={{ display: 'flex', gap: 10, fontFamily: FONT_BODY, fontSize: 15, color: NAVY, fontWeight: 500, lineHeight: 1.5 }}>
                <span style={{ minWidth: 20, fontWeight: 800, color: tinted }}>{j + 1}.</span>
                <span>{phase}</span>
              </li>
            ))}
          </ol>
        </div>
        <div style={{ background: GREEN_SOFT, borderRadius: 22, padding: 28, display: 'flex', flexDirection: 'column', gap: 14, ...RTL_DIR }}>
          <span style={{ fontSize: 32 }}>📊</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.32em', color: GREEN }}>المخرجات</span>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 0, margin: 0, listStyle: 'none' }}>
            {p.outputs.map((out, j) => (
              <li key={j} style={{ display: 'flex', gap: 10, fontFamily: FONT_BODY, fontSize: 15, color: NAVY, fontWeight: 500, lineHeight: 1.5 }}>
                <span style={{ color: GREEN, fontWeight: 800 }}>•</span>
                <span>{out}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Frame>
  );
}

/* ──────────────────  D — 60/40 split: Goal+Phases left, Outputs callout right ────────────────── */

export function ProgramDetailD({ index, total, programKey }: SlideProps) {
  const p = PROGRAMS[programKey];
  const tinted = tintFor(programKey);
  return (
    <Frame index={index} variant="light" programKey={programKey}>
      <PageChrome pageNum={index} total={total} variant="light" programName={p.name} />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 30, ...RTL_DIR }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <FitText as="div" maxSize={104} minSize={48} width={1200} height={130} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.1, ...RTL_DIR }}>
            {p.name}
          </FitText>
          <div style={{ background: tinted, color: WHITE, padding: '18px 32px', borderRadius: 999, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28 }}>
            {p.duration}
          </div>
        </div>
        <FitText as="div" maxSize={24} minSize={16} width={SLIDE_WIDTH - 192} height={70} style={{ fontFamily: FONT_BODY, color: 'rgba(0,21,99,0.78)', lineHeight: 1.7, fontWeight: 500, ...RTL_DIR }}>
          {p.description}
        </FitText>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 28, flex: 1 }}>
          {/* Left — goal on top, phases below */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div
              style={{
                background: NAVY,
                color: WHITE,
                borderRadius: 22,
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                ...RTL_DIR,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>🎯</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.32em', color: GREEN }}>الهدف</span>
              </div>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, lineHeight: 1.5 }}>{p.goal}</span>
            </div>
            <div
              style={{
                background: WHITE,
                borderRadius: 22,
                padding: 32,
                border: `2px solid ${tinted}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                flex: 1,
                ...RTL_DIR,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>🧭</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.32em', color: tinted }}>مراحل المسار</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {p.phases.map((phase, j) => (
                  <div
                    key={j}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: '14px 18px',
                      background: GREEN_SOFT,
                      borderRadius: 12,
                      fontFamily: FONT_BODY,
                      fontSize: 15,
                      color: NAVY,
                      fontWeight: 500,
                      lineHeight: 1.5,
                    }}
                  >
                    <span
                      style={{
                        minWidth: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: tinted,
                        color: WHITE,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      {j + 1}
                    </span>
                    <span>{phase}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Outputs as a hero callout */}
          <div
            style={{
              background: GREEN,
              color: NAVY,
              borderRadius: 28,
              padding: 36,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              boxShadow: '0 24px 56px -16px rgba(104,190,105,0.55)',
              ...RTL_DIR,
            }}
          >
            <span style={{ fontSize: 44 }}>📊</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, letterSpacing: '0.32em', color: NAVY }}>المخرجات</span>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 0, margin: 0, listStyle: 'none' }}>
              {p.outputs.map((out, j) => (
                <li
                  key={j}
                  style={{
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                    fontFamily: FONT_DISPLAY,
                    fontSize: 19,
                    color: NAVY,
                    fontWeight: 700,
                    lineHeight: 1.45,
                    paddingBottom: j < p.outputs.length - 1 ? 14 : 0,
                    borderBottom: j < p.outputs.length - 1 ? '1px solid rgba(0,21,99,0.18)' : 'none',
                  }}
                >
                  <span style={{ minWidth: 28, height: 28, borderRadius: '50%', background: NAVY, color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                    {j + 1}
                  </span>
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

/* ──────────────────  E — vertical timeline ────────────────── */

export function ProgramDetailE({ index, total, programKey }: SlideProps) {
  const p = PROGRAMS[programKey];
  const tinted = tintFor(programKey);
  return (
    <Frame index={index} variant="light" programKey={programKey}>
      <PageChrome pageNum={index} total={total} variant="light" programName={p.name} />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 24, ...RTL_DIR }}>
        {/* Goal (top) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 28, alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: GREEN, fontWeight: 700, letterSpacing: '0.32em' }}>PROGRAM · {programKey.toUpperCase()}</span>
            <FitText as="div" maxSize={84} minSize={40} width={1200} height={120} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.1, marginTop: 8, ...RTL_DIR }}>
              {p.name}
            </FitText>
          </div>
          <div style={{ background: tinted, color: WHITE, padding: '14px 28px', borderRadius: 999, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 24 }}>
            {p.duration}
          </div>
        </div>
        <div
          style={{
            background: NAVY,
            color: WHITE,
            borderRadius: 18,
            padding: '20px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            ...RTL_DIR,
          }}
        >
          <span style={{ fontSize: 26 }}>🎯</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.32em', color: GREEN, whiteSpace: 'nowrap' }}>الهدف</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 18, fontWeight: 500, lineHeight: 1.6, flex: 1 }}>{p.goal}</span>
        </div>

        {/* Timeline */}
        <div style={{ position: 'relative', flex: 1, marginTop: 10 }}>
          {/* track */}
          <div
            style={{
              position: 'absolute',
              right: 30,
              top: 28,
              bottom: 28,
              width: 3,
              background: `linear-gradient(180deg, ${tinted} 0%, ${GREEN} 100%)`,
              borderRadius: 3,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingRight: 76, paddingLeft: 0, height: '100%' }}>
            {p.phases.map((phase, j) => (
              <div
                key={j}
                style={{
                  position: 'relative',
                  background: WHITE,
                  border: '1px solid rgba(0,21,99,0.10)',
                  borderRadius: 16,
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  boxShadow: '0 8px 20px -12px rgba(0,21,99,0.18)',
                  flex: 1,
                  ...RTL_DIR,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    right: -52,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: tinted,
                    color: WHITE,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 800,
                    fontSize: 18,
                    border: `4px solid ${PAPER}`,
                  }}
                >
                  {j + 1}
                </div>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.24em', color: tinted, opacity: 0.8 }}>المرحلة {j + 1}</span>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: NAVY, lineHeight: 1.4, flex: 1 }}>{phase}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Outputs (bottom) */}
        <div style={{ background: GREEN_SOFT, borderRadius: 18, padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap', ...RTL_DIR }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.32em', color: GREEN }}>📊 المخرجات</span>
          {p.outputs.map((out, j) => (
            <span
              key={j}
              style={{
                background: WHITE,
                border: `1px solid ${GREEN}`,
                color: NAVY,
                padding: '8px 16px',
                borderRadius: 999,
                fontFamily: FONT_BODY,
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              {out}
            </span>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export const PROGRAM_DETAIL_VARIANTS = {
  A: ProgramDetailA,
  B: ProgramDetailB,
  C: ProgramDetailC,
  D: ProgramDetailD,
  E: ProgramDetailE,
} as const;

export type ProgramDetailVariantKey = keyof typeof PROGRAM_DETAIL_VARIANTS;
