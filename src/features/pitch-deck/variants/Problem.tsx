/**
 * Problem slide — 5 visual variants. All consume PROBLEM content.
 * A = current implementation (paper + 3-card grid + outcome bar).
 */

import { FitText } from '@/features/case-study-deck/styles/FitText';
import { PROBLEM } from '../uniexPitchContent';
import { CompassChoice } from '../illustrations';
import {
  FONT_BODY,
  FONT_DISPLAY,
  Frame,
  GREEN,
  GREEN_SOFT,
  NAVY,
  PageChrome,
  RTL_DIR,
  SLIDE_WIDTH,
  type SlideProps,
  WHITE,
} from './_shared';

/* ─────────────  A — Paper, 3-card pain grid + outcome bar (current)  ───────────── */

export function ProblemVariantA({ index, total }: SlideProps) {
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
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 800, color: GREEN }}>0{i + 1}</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 22, fontWeight: 600, lineHeight: 1.5, color: NAVY }}>{pain}</span>
            </div>
          ))}
        </div>
        <div style={{ background: NAVY, borderRadius: 20, padding: '32px 40px', color: WHITE, display: 'flex', flexDirection: 'column', gap: 16, ...RTL_DIR }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, lineHeight: 1.5 }}>{PROBLEM.outcome}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 40, height: 2, background: GREEN }} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 18, color: 'rgba(255,255,255,0.86)' }}>{PROBLEM.schoolRole}</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  B — Navy flood + 3 white cards with big numerals  ───────────── */

export function ProblemVariantB({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="flood">
      <PageChrome pageNum={index} total={total} section="التحدي" variant="flood" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 40, ...RTL_DIR }}>
        <div>
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: GREEN, letterSpacing: '0.32em' }}>PROBLEM · 01</span>
          <FitText
            as="div"
            maxSize={88}
            minSize={36}
            width={SLIDE_WIDTH - 192}
            height={140}
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, lineHeight: 1.2, color: WHITE, marginTop: 12, ...RTL_DIR }}
          >
            {PROBLEM.title}
          </FitText>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, flex: 1 }}>
          {PROBLEM.pains.map((pain, i) => (
            <div
              key={i}
              style={{
                background: WHITE,
                borderRadius: 26,
                padding: 40,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 18,
                ...RTL_DIR,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 168, fontWeight: 900, color: GREEN, lineHeight: 0.9, letterSpacing: '-0.04em' }}>{i + 1}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: NAVY, letterSpacing: '0.18em' }}>OF 03</span>
              </div>
              <span style={{ fontFamily: FONT_BODY, fontSize: 24, fontWeight: 600, lineHeight: 1.55, color: NAVY }}>{pain}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, padding: '28px 36px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 18, ...RTL_DIR }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: WHITE }}>
            <span style={{ width: 48, height: 3, background: GREEN }} />
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, lineHeight: 1.4 }}>{PROBLEM.outcome}</span>
          </div>
          <span style={{ fontFamily: FONT_BODY, fontSize: 16, color: GREEN, fontWeight: 700 }}>{PROBLEM.schoolRole}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  C — Split: question on left + image #2 on right  ───────────── */

export function ProblemVariantC({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="التحدي" variant="light" />
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
        {/* Right side: illustration (RTL → image visually on right is here at right) */}
        <div
          style={{
            width: SLIDE_WIDTH * 0.42,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#EEF1F8',
            overflow: 'hidden',
          }}
        >
          <CompassChoice size={SLIDE_WIDTH * 0.5} transparent />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,21,99,0.18) 0%, rgba(0,21,99,0) 50%)' }} />
        </div>
        {/* Left side: content */}
        <div style={{ flex: 1, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 36, ...RTL_DIR }}>
          <div>
            <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 800, color: GREEN, letterSpacing: '0.32em' }}>THE PROBLEM</span>
            <FitText
              as="div"
              maxSize={68}
              minSize={32}
              width={SLIDE_WIDTH * 0.58 - 192}
              height={180}
              style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, lineHeight: 1.25, color: NAVY, marginTop: 12, ...RTL_DIR }}
            >
              {PROBLEM.title}
            </FitText>
          </div>
          <ol style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 0, margin: 0, listStyle: 'none' }}>
            {PROBLEM.pains.map((pain, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 18,
                  padding: '18px 0',
                  borderBottom: '1px solid rgba(0,21,99,0.10)',
                  fontFamily: FONT_BODY,
                  fontSize: 22,
                  fontWeight: 600,
                  color: NAVY,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800, color: GREEN, letterSpacing: '0.18em', minWidth: 36, marginTop: 6 }}>0{i + 1}</span>
                <span>{pain}</span>
              </li>
            ))}
          </ol>
          <div style={{ marginTop: 'auto', padding: '20px 24px', background: NAVY, color: WHITE, borderRadius: 16, fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, lineHeight: 1.5, ...RTL_DIR }}>
            {PROBLEM.outcome}
            <div style={{ marginTop: 8, fontFamily: FONT_BODY, fontSize: 15, color: GREEN, fontWeight: 700, letterSpacing: '0.04em' }}>{PROBLEM.schoolRole}</div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  D — Vertical timeline of pains  ───────────── */

export function ProblemVariantD({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="التحدي" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 32, ...RTL_DIR }}>
        <FitText
          as="div"
          maxSize={84}
          minSize={36}
          width={SLIDE_WIDTH - 192}
          height={130}
          style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, lineHeight: 1.2, color: NAVY, ...RTL_DIR }}
        >
          {PROBLEM.title}
        </FitText>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {/* Vertical rail (right side for RTL) */}
          <div
            style={{
              position: 'absolute',
              top: 24,
              bottom: 24,
              right: 26,
              width: 2,
              background: 'linear-gradient(180deg, rgba(104,190,105,0.6) 0%, rgba(0,21,99,0.6) 100%)',
            }}
          />
          {PROBLEM.pains.map((pain, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 28,
                padding: '24px 70px 24px 0',
                borderBottom: i < PROBLEM.pains.length - 1 ? '1px solid rgba(0,21,99,0.08)' : 'none',
                position: 'relative',
                ...RTL_DIR,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 28,
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  background: i === PROBLEM.pains.length - 1 ? NAVY : GREEN,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: 13,
                  color: WHITE,
                  border: `4px solid ${WHITE}`,
                  boxShadow: '0 0 0 1px rgba(0,21,99,0.10)',
                }}
              >
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 800, color: GREEN, letterSpacing: '0.32em', display: 'block' }}>STAGE {i + 1}</span>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, color: NAVY, lineHeight: 1.5, display: 'block', marginTop: 6 }}>{pain}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', padding: '22px 28px', background: GREEN_SOFT, borderRadius: 18, ...RTL_DIR }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: NAVY, lineHeight: 1.5 }}>{PROBLEM.outcome}</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: NAVY, fontWeight: 700, letterSpacing: '0.18em', whiteSpace: 'nowrap' }}>{PROBLEM.schoolRole}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  E — Green flood + 3 outlined cards + closer in white  ───────────── */

export function ProblemVariantE({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="flood" bg={GREEN} ink={NAVY}>
      <PageChrome pageNum={index} total={total} section="التحدي" variant="flood" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 40, ...RTL_DIR }}>
        <div>
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 800, color: NAVY, letterSpacing: '0.32em' }}>// CHALLENGE</span>
          <FitText
            as="div"
            maxSize={92}
            minSize={36}
            width={SLIDE_WIDTH - 192}
            height={150}
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, lineHeight: 1.2, color: NAVY, marginTop: 14, ...RTL_DIR }}
          >
            {PROBLEM.title}
          </FitText>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, flex: 1 }}>
          {PROBLEM.pains.map((pain, i) => (
            <div
              key={i}
              style={{
                border: `2px solid ${NAVY}`,
                background: 'transparent',
                borderRadius: 22,
                padding: 36,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 18,
                ...RTL_DIR,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 44, height: 44, borderRadius: 999, background: NAVY, color: GREEN, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>0{i + 1}</span>
                <span style={{ width: 30, height: 1, background: NAVY }} />
              </div>
              <span style={{ fontFamily: FONT_BODY, fontSize: 24, fontWeight: 700, lineHeight: 1.55, color: NAVY }}>{pain}</span>
            </div>
          ))}
        </div>
        <div style={{ background: NAVY, borderRadius: 20, padding: '28px 36px', color: WHITE, display: 'flex', flexDirection: 'column', gap: 12, ...RTL_DIR }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, lineHeight: 1.5, color: WHITE }}>{PROBLEM.outcome}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 36, height: 2, background: GREEN }} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 17, color: GREEN, fontWeight: 700 }}>{PROBLEM.schoolRole}</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

export const PROBLEM_VARIANTS = {
  A: ProblemVariantA,
  B: ProblemVariantB,
  C: ProblemVariantC,
  D: ProblemVariantD,
  E: ProblemVariantE,
};

export type ProblemVariantKey = keyof typeof PROBLEM_VARIANTS;
