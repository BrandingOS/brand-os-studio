/**
 * Differentiators slide — 5 visual variants. All consume DIFFERENTIATORS content.
 * A = current implementation (paper + 2-col grid).
 */

import { FitText } from '@/features/case-study-deck/styles/FitText';
import { DIFFERENTIATORS } from '../uniexPitchContent';
import {
  DESIGN_3,
  FONT_BODY,
  FONT_DISPLAY,
  Frame,
  GREEN,
  GREEN_SOFT,
  ICON_GREEN,
  NAVY,
  NAVY_SOFT,
  PageChrome,
  RTL_DIR,
  SLIDE_WIDTH,
  type SlideProps,
  WHITE,
} from './_shared';

/* ─────────────  A — Paper, 2-col grid (current)  ───────────── */

export function DifferentiatorsVariantA({ index, total }: SlideProps) {
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
              <span style={{ fontFamily: FONT_BODY, fontSize: 22, color: NAVY, fontWeight: 600, lineHeight: 1.55 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  B — 5-up horizontal with iconmarks  ───────────── */

export function DifferentiatorsVariantB({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="ما الذي يميز التجربة" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 36, ...RTL_DIR }}>
        <div>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 800, color: GREEN, letterSpacing: '0.32em' }}>WHY UNIEX</span>
          <FitText as="div" maxSize={80} minSize={36} width={SLIDE_WIDTH - 192} height={120} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.2, marginTop: 10, ...RTL_DIR }}>
            {DIFFERENTIATORS.title}
          </FitText>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 18, flex: 1 }}>
          {DIFFERENTIATORS.items.map((item, i) => (
            <div
              key={i}
              style={{
                background: WHITE,
                border: `1px solid rgba(0,21,99,0.10)`,
                borderTop: `5px solid ${i % 2 === 0 ? GREEN : NAVY}`,
                borderRadius: '4px 4px 22px 22px',
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: '0 14px 32px -16px rgba(0,21,99,0.18)',
                ...RTL_DIR,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <img src={ICON_GREEN} alt="" style={{ width: 32, height: 32 }} />
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 800, color: i % 2 === 0 ? GREEN : NAVY, letterSpacing: '0.32em' }}>0{i + 1}</span>
              </div>
              <FitText
                as="div"
                maxSize={20}
                minSize={13}
                width={(SLIDE_WIDTH - 192) / 5 - 50}
                height={200}
                style={{ fontFamily: FONT_BODY, fontWeight: 700, color: NAVY, lineHeight: 1.55, ...RTL_DIR }}
              >
                {item}
              </FitText>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  C — Image #3 hero + 5 cards underneath  ───────────── */

export function DifferentiatorsVariantC({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="ما الذي يميز التجربة" variant="light" />
      {/* Hero band with image #3 */}
      <div
        style={{
          position: 'absolute',
          top: 130,
          left: 96,
          right: 96,
          height: 360,
          borderRadius: 28,
          backgroundImage: `linear-gradient(180deg, rgba(0,21,99,0.5) 0%, rgba(0,21,99,0.85) 100%), url(${DESIGN_3})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          padding: 44,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          color: WHITE,
          overflow: 'hidden',
          ...RTL_DIR,
        }}
      >
        <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 800, color: GREEN, letterSpacing: '0.32em' }}>// DIFFERENTIATORS</span>
        <FitText
          as="div"
          maxSize={68}
          minSize={32}
          width={SLIDE_WIDTH - 192 - 88}
          height={120}
          style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, lineHeight: 1.2, color: WHITE, marginTop: 10, ...RTL_DIR }}
        >
          {DIFFERENTIATORS.title}
        </FitText>
      </div>
      {/* 5 cards underneath */}
      <div style={{ position: 'absolute', top: 530, left: 96, right: 96, bottom: 130, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, ...RTL_DIR }}>
        {DIFFERENTIATORS.items.map((item, i) => (
          <div
            key={i}
            style={{
              background: WHITE,
              border: '1px solid rgba(0,21,99,0.10)',
              borderRadius: 18,
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
              boxShadow: '0 18px 36px -18px rgba(0,21,99,0.22)',
              ...RTL_DIR,
            }}
          >
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: i % 2 === 0 ? GREEN : NAVY,
                color: WHITE,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: '-0.02em',
              }}
            >
              0{i + 1}
            </span>
            <FitText
              as="div"
              maxSize={18}
              minSize={12}
              width={(SLIDE_WIDTH - 192 - 64) / 5 - 50}
              height={170}
              style={{ fontFamily: FONT_BODY, fontWeight: 700, color: NAVY, lineHeight: 1.55, ...RTL_DIR }}
            >
              {item}
            </FitText>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ─────────────  D — Vertical bullet stack with green checkmarks  ───────────── */

export function DifferentiatorsVariantD({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light" bg={WHITE}>
      <PageChrome pageNum={index} total={total} section="ما الذي يميز التجربة" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 60, ...RTL_DIR }}>
        {/* Right column: title + image accent */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30, ...RTL_DIR }}>
          <div>
            <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 800, color: GREEN, letterSpacing: '0.32em' }}>// VALUE</span>
            <FitText as="div" maxSize={64} minSize={28} width={SLIDE_WIDTH * 0.4 - 96} height={260} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.2, marginTop: 12, ...RTL_DIR }}>
              {DIFFERENTIATORS.title}
            </FitText>
          </div>
          <div
            style={{
              flex: 1,
              borderRadius: 22,
              backgroundImage: `linear-gradient(180deg, rgba(0,21,99,0) 0%, rgba(0,21,99,0.4) 100%), url(${DESIGN_3})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: 240,
              padding: 24,
              display: 'flex',
              alignItems: 'flex-end',
              color: WHITE,
              ...RTL_DIR,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 40, height: 3, background: GREEN }} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 800, letterSpacing: '0.32em', color: GREEN }}>UNIEX EDGE</span>
            </div>
          </div>
        </div>
        {/* Left column: stacked bullets */}
        <ol style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 0, margin: 0, listStyle: 'none' }}>
          {DIFFERENTIATORS.items.map((item, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 18,
                padding: 22,
                background: i % 2 === 0 ? GREEN_SOFT : WHITE,
                border: `1px solid ${i % 2 === 0 ? 'rgba(104,190,105,0.4)' : 'rgba(0,21,99,0.10)'}`,
                borderRadius: 16,
                ...RTL_DIR,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 44,
                  height: 44,
                  borderRadius: 12,
                  background: GREEN,
                  color: WHITE,
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 800, color: GREEN, letterSpacing: '0.32em' }}>0{i + 1}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 600, color: NAVY, lineHeight: 1.55 }}>{item}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Frame>
  );
}

/* ─────────────  E — Navy flood + 5 floating boxes with number badges  ───────────── */

export function DifferentiatorsVariantE({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="flood">
      <PageChrome pageNum={index} total={total} section="ما الذي يميز التجربة" variant="flood" />
      {/* Decorative iconmark watermark */}
      <img src={ICON_GREEN} alt="" style={{ position: 'absolute', top: -200, left: -200, width: 760, opacity: 0.1 }} />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 36, ...RTL_DIR }}>
        <div>
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 800, color: GREEN, letterSpacing: '0.32em' }}>// 5 KEY DIFFERENTIATORS</span>
          <FitText as="div" maxSize={80} minSize={36} width={SLIDE_WIDTH - 192} height={120} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: WHITE, lineHeight: 1.2, marginTop: 10, ...RTL_DIR }}>
            {DIFFERENTIATORS.title}
          </FitText>
        </div>
        {/* Floating boxes with offsets for visual rhythm */}
        <div style={{ position: 'relative', flex: 1 }}>
          {DIFFERENTIATORS.items.map((item, i) => {
            // Stagger boxes diagonally for "floating" feel
            const cols = 5;
            const colWidth = (SLIDE_WIDTH - 192) / cols;
            const offsetY = i % 2 === 0 ? 0 : 60;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: offsetY,
                  right: i * colWidth, // RTL → distribute right-to-left
                  width: colWidth - 16,
                  height: 380 - offsetY,
                  background: i === 2 ? GREEN : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${i === 2 ? 'transparent' : 'rgba(255,255,255,0.18)'}`,
                  color: i === 2 ? NAVY : WHITE,
                  borderRadius: 22,
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  boxShadow: '0 24px 48px -20px rgba(0,0,0,0.45)',
                  ...RTL_DIR,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: i === 2 ? NAVY : GREEN,
                    color: i === 2 ? GREEN : NAVY,
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 900,
                    fontSize: 26,
                    letterSpacing: '-0.02em',
                  }}
                >
                  0{i + 1}
                </span>
                <FitText
                  as="div"
                  maxSize={20}
                  minSize={12}
                  width={colWidth - 16 - 44}
                  height={220}
                  style={{ fontFamily: FONT_BODY, fontWeight: 700, lineHeight: 1.55, ...RTL_DIR }}
                >
                  {item}
                </FitText>
              </div>
            );
          })}
        </div>
      </div>
    </Frame>
  );
}

export const DIFFERENTIATORS_VARIANTS = {
  A: DifferentiatorsVariantA,
  B: DifferentiatorsVariantB,
  C: DifferentiatorsVariantC,
  D: DifferentiatorsVariantD,
  E: DifferentiatorsVariantE,
};

export type DifferentiatorsVariantKey = keyof typeof DIFFERENTIATORS_VARIANTS;
