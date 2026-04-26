/**
 * SchoolBenefits slide variants — 5 visually-distinct layouts for the
 * school-side benefits + closer (slide 11 of the uniex pitch deck).
 *
 * Variant A is the original implementation extracted from
 * `slides/UniexPitchSlides.tsx`; B–E are alt directions.
 */

import type { CSSProperties, ReactNode } from 'react';
import { FitText } from '@/features/case-study-deck/styles/FitText';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';
import { SCHOOL_BENEFITS } from '../uniexPitchContent';
import { GraduationCap } from '../illustrations';

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
          fontSize: 18,
          color: muted,
          letterSpacing: '0.04em',
        }}
      >
        <span style={{ fontWeight: 700, color: ink, letterSpacing: '0.06em' }}>uniex</span>
        <span style={{ ...RTL_DIR, fontWeight: 600, fontSize: 17 }}>فوائد المدرسة</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 17 }}>
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
  const fallback = variant === 'flood' ? NAVY : variant === 'dark' ? NAVY_DEEP : PAPER;
  const ink = variant === 'light' ? NAVY : WHITE;
  return (
    <div
      data-pitch-slide={index}
      data-pitch-kind="school-benefits"
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

/* ──────────────────  A — original paper + navy/white split ────────────────── */

export function SchoolBenefitsA({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} variant="light" />
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
              <span style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 700, letterSpacing: '0.32em', color: i === 0 ? GREEN : 'rgba(0,21,99,0.55)' }}>
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

/* ──────────────────  B — image #2 hero + benefits as 2 cols ────────────────── */

export function SchoolBenefitsB({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 28, ...RTL_DIR }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 580px', gap: 32, alignItems: 'stretch' }}>
          {/* Left: title + benefits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, ...RTL_DIR }}>
            <FitText as="div" maxSize={72} minSize={36} width={1100} height={120} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.15, ...RTL_DIR }}>
              {SCHOOL_BENEFITS.title}
            </FitText>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {SCHOOL_BENEFITS.groups.map((g, i) => (
                <div
                  key={i}
                  style={{
                    background: i === 0 ? GREEN_SOFT : WHITE,
                    border: i === 0 ? `1px solid ${GREEN}` : '1px solid rgba(0,21,99,0.10)',
                    borderRadius: 20,
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    ...RTL_DIR,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_BODY,
                      fontSize: 18,
                      fontWeight: 700,
                      letterSpacing: '0.32em',
                      color: i === 0 ? GREEN : NAVY,
                    }}
                  >
                    {g.heading}
                  </span>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 0, margin: 0, listStyle: 'none' }}>
                    {g.items.map((item, j) => (
                      <li key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontFamily: FONT_BODY, fontSize: 22, color: NAVY, fontWeight: 500, lineHeight: 1.55 }}>
                        <span style={{ color: GREEN, fontWeight: 800, fontSize: 18 }}>✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Right: image hero */}
          <div
            style={{
              borderRadius: 28,
              overflow: 'hidden',
              position: 'relative',
              minHeight: 540,
              background: NAVY,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: NAVY,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <GraduationCap size={560} transparent />
            </div>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(0,21,99,0) 0%, rgba(0,21,99,0.85) 100%)',
              }}
            />
            <div style={{ position: 'absolute', bottom: 32, left: 32, right: 32, color: WHITE, ...RTL_DIR }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 20, color: GREEN, fontWeight: 700, letterSpacing: '0.32em' }}>RESULT</span>
              <FitText as="div" maxSize={28} minSize={18} width={500} height={120} style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: WHITE, lineHeight: 1.45, marginTop: 10, ...RTL_DIR }}>
                {SCHOOL_BENEFITS.closer}
              </FitText>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ──────────────────  C — accordion-style vertical list ────────────────── */

export function SchoolBenefitsC({ index, total }: SlideProps) {
  // Flatten all items into rows but keep group headings as section dividers.
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 22, ...RTL_DIR }}>
        <FitText as="div" maxSize={84} minSize={40} width={SLIDE_WIDTH - 192} height={120} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.18, ...RTL_DIR }}>
          {SCHOOL_BENEFITS.title}
        </FitText>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
          {SCHOOL_BENEFITS.groups.map((g, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* divider with heading */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, ...RTL_DIR }}>
                <span
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 24,
                    fontWeight: 800,
                    color: i === 0 ? GREEN : NAVY,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.2,
                  }}
                >
                  {g.heading}
                </span>
                <span style={{ flex: 1, height: 2, background: i === 0 ? GREEN : NAVY, opacity: 0.18 }} />
                <span
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: '0.32em',
                    color: 'rgba(0,21,99,0.4)',
                  }}
                >
                  0{i + 1} / 0{SCHOOL_BENEFITS.groups.length}
                </span>
              </div>

              {/* items as horizontal row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: g.items.length === 2 ? '1fr 1fr' : 'repeat(4, 1fr)',
                  gap: 14,
                }}
              >
                {g.items.map((item, j) => (
                  <div
                    key={j}
                    style={{
                      background: WHITE,
                      borderRight: `4px solid ${i === 0 ? GREEN : NAVY}`,
                      borderRadius: 14,
                      padding: '20px 22px',
                      fontFamily: FONT_BODY,
                      fontSize: 22,
                      fontWeight: 600,
                      color: NAVY,
                      lineHeight: 1.55,
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      boxShadow: '0 4px 14px -8px rgba(0,21,99,0.14)',
                      ...RTL_DIR,
                    }}
                  >
                    <span style={{ color: i === 0 ? GREEN : NAVY, fontWeight: 800, fontSize: 18 }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: NAVY,
            borderRadius: 18,
            padding: '22px 32px',
            color: WHITE,
            fontFamily: FONT_DISPLAY,
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            ...RTL_DIR,
          }}
        >
          <span style={{ width: 44, height: 4, background: GREEN, flexShrink: 0 }} />
          <span>{SCHOOL_BENEFITS.closer}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ──────────────────  D — navy flood w/ 2 glass cards ────────────────── */

export function SchoolBenefitsD({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="flood">
      <div style={{ position: 'absolute', top: -200, right: -150, width: 600, height: 600, borderRadius: '50%', background: 'rgba(104,190,105,0.18)', filter: 'blur(80px)' }} />
      <div style={{ position: 'absolute', bottom: -180, left: -180, width: 500, height: 500, borderRadius: '50%', background: 'rgba(104,190,105,0.10)', filter: 'blur(60px)' }} />
      <PageChrome pageNum={index} total={total} variant="flood" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 36, ...RTL_DIR }}>
        <div>
          <span style={{ fontFamily: FONT_BODY, fontSize: 20, color: GREEN, fontWeight: 700, letterSpacing: '0.32em' }}>SCHOOL · BENEFITS</span>
          <FitText as="div" maxSize={88} minSize={40} width={SLIDE_WIDTH - 192} height={130} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: WHITE, lineHeight: 1.18, marginTop: 10, ...RTL_DIR }}>
            {SCHOOL_BENEFITS.title}
          </FitText>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 28, flex: 1 }}>
          {SCHOOL_BENEFITS.groups.map((g, i) => (
            <div
              key={i}
              style={{
                background: i === 0 ? 'rgba(104,190,105,0.14)' : 'rgba(255,255,255,0.06)',
                border: i === 0 ? `1px solid ${GREEN}` : '1px solid rgba(255,255,255,0.16)',
                backdropFilter: 'blur(12px)',
                borderRadius: 26,
                padding: 38,
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
                ...RTL_DIR,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 12, height: 12, borderRadius: 999, background: GREEN }} />
                <span style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 700, letterSpacing: '0.32em', color: GREEN }}>{g.heading}</span>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 0, margin: 0, listStyle: 'none' }}>
                {g.items.map((item, j) => (
                  <li key={j} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', fontFamily: FONT_BODY, fontSize: 22, color: WHITE, fontWeight: 500, lineHeight: 1.55 }}>
                    <span
                      style={{
                        minWidth: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: GREEN,
                        color: NAVY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          style={{
            background: GREEN,
            color: NAVY,
            borderRadius: 18,
            padding: '22px 32px',
            fontFamily: FONT_DISPLAY,
            fontSize: 24,
            fontWeight: 800,
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            ...RTL_DIR,
          }}
        >
          <span style={{ width: 44, height: 4, background: NAVY, flexShrink: 0 }} />
          <span>{SCHOOL_BENEFITS.closer}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ──────────────────  E — quote-style: closer is the hero ────────────────── */

export function SchoolBenefitsE({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <img
        src="/brands/uniex/logos/iconGreen.svg"
        alt=""
        style={{ position: 'absolute', top: -100, left: -100, width: 480, opacity: 0.10 }}
      />
      <PageChrome pageNum={index} total={total} variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 28, ...RTL_DIR }}>
        <span style={{ fontFamily: FONT_BODY, fontSize: 20, color: GREEN, fontWeight: 700, letterSpacing: '0.32em' }}>SCHOOL · {SCHOOL_BENEFITS.title.split(' ').slice(0, 2).join(' ')}</span>

        {/* Hero closer quote */}
        <div
          style={{
            position: 'relative',
            background: NAVY,
            borderRadius: 32,
            padding: '60px 64px',
            color: WHITE,
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
            overflow: 'hidden',
            ...RTL_DIR,
          }}
        >
          <span style={{ position: 'absolute', top: 24, right: 32, fontSize: 140, lineHeight: 0.8, color: GREEN, opacity: 0.45, fontFamily: 'Georgia, serif' }}>"</span>
          <FitText as="div" maxSize={56} minSize={28} width={1500} height={150} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: WHITE, lineHeight: 1.35, ...RTL_DIR }}>
            {SCHOOL_BENEFITS.closer}
          </FitText>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ width: 56, height: 4, background: GREEN }} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 20, color: GREEN, fontWeight: 700, letterSpacing: '0.32em' }}>{SCHOOL_BENEFITS.title}</span>
          </div>
        </div>

        {/* Supporting bullets */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 28, flex: 1 }}>
          {SCHOOL_BENEFITS.groups.map((g, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 14, ...RTL_DIR }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  paddingBottom: 8,
                  borderBottom: `2px solid ${i === 0 ? GREEN : NAVY}`,
                }}
              >
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: i === 0 ? GREEN : NAVY }}>0{i + 1}</span>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800, color: NAVY, letterSpacing: '-0.01em' }}>{g.heading}</span>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 0, margin: 0, listStyle: 'none' }}>
                {g.items.map((item, j) => (
                  <li
                    key={j}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      fontFamily: FONT_BODY,
                      fontSize: 22,
                      color: 'rgba(0,21,99,0.85)',
                      fontWeight: 500,
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ color: i === 0 ? GREEN : NAVY, fontWeight: 800, fontSize: 16, marginTop: 4 }}>—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export const SCHOOL_BENEFITS_VARIANTS = {
  A: SchoolBenefitsA,
  B: SchoolBenefitsB,
  C: SchoolBenefitsC,
  D: SchoolBenefitsD,
  E: SchoolBenefitsE,
} as const;

export type SchoolBenefitsVariantKey = keyof typeof SCHOOL_BENEFITS_VARIANTS;
