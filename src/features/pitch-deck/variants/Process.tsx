/**
 * Process slide — 5 visual variants. All consume PROCESS content.
 * A = current implementation (paper + 2-phase columns).
 */

import { FitText } from '@/features/case-study-deck/styles/FitText';
import { PROCESS } from '../uniexPitchContent';
import { MentorConversation } from '../illustrations';
import {
  Frame,
  GREEN,
  GREEN_SOFT,
  NAVY,
  NAVY_DEEP,
  PageChrome,
  PAPER,
  RTL_DIR,
  SLIDE_WIDTH,
  type SlideProps,
  WHITE,
} from './_shared';

// Local font fallbacks (kept until inline fontSize usages are migrated to .deck-* classes).
const FONT_DISPLAY = `'IBM Plex Sans Arabic', 'Cairo', 'Inter', sans-serif`;
const FONT_BODY = `'Cairo', 'IBM Plex Sans Arabic', 'Inter', sans-serif`;

/* ─────────────  A — Paper, two-phase columns (current)  ───────────── */

export function ProcessVariantA({ index, total }: SlideProps) {
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
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: WHITE, background: i === 0 ? NAVY : GREEN, padding: '6px 18px', borderRadius: 999 }}>{phase.label}</span>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 44, fontWeight: 800, color: NAVY }}>{phase.title}</span>
              </div>
              <ol style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 0, margin: 0, listStyle: 'none' }}>
                {phase.steps.map((step, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, fontFamily: FONT_BODY, fontSize: 22, color: NAVY, fontWeight: 500, lineHeight: 1.55 }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: GREEN, minWidth: 28 }}>0{j + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              {phase.footer && <span style={{ marginTop: 'auto', fontFamily: FONT_BODY, fontSize: 20, color: 'rgba(0,21,99,0.65)', fontStyle: 'italic' }}>{phase.footer}</span>}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  B — Horizontal stepper bar with arrows  ───────────── */

export function ProcessVariantB({ index, total }: SlideProps) {
  // RTL: arrow flows right→left visually. We use ◀ glyph + space-between.
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="كيف نبني القرار" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 30, ...RTL_DIR }}>
        <div>
          <span style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 800, color: GREEN, letterSpacing: '0.32em' }}>PROCESS</span>
          <FitText as="div" maxSize={72} minSize={32} width={SLIDE_WIDTH - 192} height={110} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.2, marginTop: 10, ...RTL_DIR }}>
            {PROCESS.title}
          </FitText>
          <div style={{ marginTop: 12, fontFamily: FONT_BODY, fontSize: 20, color: 'rgba(0,21,99,0.65)' }}>{PROCESS.intro}</div>
        </div>
        {/* Horizontal stepper bar */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, flex: 1, ...RTL_DIR }}>
          {PROCESS.phases.map((phase, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
              <div
                style={{
                  flex: 1,
                  background: i === 0 ? NAVY : GREEN,
                  color: WHITE,
                  padding: 36,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                  borderRadius: i === 0 ? '24px 0 0 24px' : '0 24px 24px 0',
                  ...RTL_DIR,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 110, fontWeight: 900, lineHeight: 0.9, letterSpacing: '-0.04em', color: i === 0 ? GREEN : NAVY }}>0{i + 1}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 800, color: i === 0 ? GREEN : NAVY, letterSpacing: '0.32em' }}>{phase.label}</span>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 800, lineHeight: 1.1 }}>{phase.title}</span>
                  </div>
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 0, margin: 0, listStyle: 'none', flex: 1 }}>
                  {phase.steps.map((step, j) => (
                    <li key={j} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontFamily: FONT_BODY, fontSize: 22, fontWeight: 500, lineHeight: 1.55, color: i === 0 ? 'rgba(255,255,255,0.92)' : NAVY }}>
                      <span style={{ color: i === 0 ? GREEN : NAVY, fontWeight: 800 }}>›</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
                {phase.footer && <span style={{ fontFamily: FONT_BODY, fontSize: 18, color: i === 0 ? 'rgba(255,255,255,0.78)' : 'rgba(0,21,99,0.7)', fontStyle: 'italic', marginTop: 'auto' }}>{phase.footer}</span>}
              </div>
              {i < PROCESS.phases.length - 1 && (
                <div
                  style={{
                    width: 60,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FONT_DISPLAY,
                    fontSize: 56,
                    color: GREEN,
                    fontWeight: 900,
                    lineHeight: 1,
                    background: PAPER,
                  }}
                >
                  ◀
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  C — Navy flood, numbered cards + image #2 right side  ───────────── */

export function ProcessVariantC({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="flood">
      <PageChrome pageNum={index} total={total} section="كيف نبني القرار" variant="flood" />
      {/* Right edge: mentor conversation illustration card */}
      <div
        style={{
          position: 'absolute',
          top: 130,
          bottom: 100,
          right: 96,
          width: 380,
          background: PAPER,
          borderRadius: 28,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.4)',
        }}
      >
        <MentorConversation size={460} transparent />
      </div>
      <div style={{ position: 'absolute', top: 130, bottom: 100, right: 96, width: 380, borderRadius: 28, background: 'linear-gradient(180deg, rgba(0,21,99,0.05) 0%, rgba(0,21,99,0.35) 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 540px 130px 96px', display: 'flex', flexDirection: 'column', gap: 28, ...RTL_DIR }}>
        <div>
          <span style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 800, color: GREEN, letterSpacing: '0.32em' }}>PROCESS</span>
          <FitText as="div" maxSize={64} minSize={28} width={SLIDE_WIDTH - 540 - 192} height={140} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: WHITE, lineHeight: 1.2, marginTop: 10, ...RTL_DIR }}>
            {PROCESS.title}
          </FitText>
          <div style={{ marginTop: 8, fontFamily: FONT_BODY, fontSize: 22, color: 'rgba(255,255,255,0.78)' }}>{PROCESS.intro}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
          {PROCESS.phases.map((phase, i) => (
            <div
              key={i}
              style={{
                background: i === 0 ? GREEN : 'rgba(255,255,255,0.06)',
                border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.18)',
                color: i === 0 ? NAVY : WHITE,
                borderRadius: 22,
                padding: 28,
                display: 'flex',
                gap: 24,
                alignItems: 'flex-start',
                flex: 1,
                ...RTL_DIR,
              }}
            >
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 96,
                  fontWeight: 900,
                  lineHeight: 0.9,
                  color: i === 0 ? NAVY : GREEN,
                  letterSpacing: '-0.04em',
                  minWidth: 110,
                }}
              >
                0{i + 1}
              </span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 800, letterSpacing: '0.32em', opacity: 0.8 }}>{phase.label}</span>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 800 }}>{phase.title}</span>
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 0, margin: 0, listStyle: 'none' }}>
                  {phase.steps.map((step, j) => (
                    <li key={j} style={{ display: 'flex', gap: 10, fontFamily: FONT_BODY, fontSize: 22, fontWeight: 500, lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 800, opacity: 0.6 }}>·</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
                {phase.footer && <span style={{ fontFamily: FONT_BODY, fontSize: 18, fontStyle: 'italic', opacity: 0.78 }}>{phase.footer}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  D — Vertical timeline with phase labels on the side  ───────────── */

export function ProcessVariantD({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="كيف نبني القرار" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 36, ...RTL_DIR }}>
        <div>
          <FitText as="div" maxSize={72} minSize={32} width={SLIDE_WIDTH - 192} height={120} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.2, ...RTL_DIR }}>
            {PROCESS.title}
          </FitText>
          <div style={{ marginTop: 10, fontFamily: FONT_BODY, fontSize: 22, color: 'rgba(0,21,99,0.65)' }}>{PROCESS.intro}</div>
        </div>
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Side rail (right side for RTL) */}
          <div style={{ position: 'absolute', top: 16, bottom: 16, right: 80, width: 3, background: `linear-gradient(180deg, ${NAVY} 0%, ${GREEN} 100%)` }} />
          {PROCESS.phases.map((phase, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr',
                gap: 30,
                position: 'relative',
                paddingRight: 18,
                ...RTL_DIR,
              }}
            >
              {/* Side label area (RTL → first column on right) */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: 14 }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 800, letterSpacing: '0.32em', color: i === 0 ? NAVY : GREEN }}>{phase.label}</span>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 56, fontWeight: 900, color: NAVY, lineHeight: 1, marginTop: 6 }}>0{i + 1}</span>
                {/* Bullet circle on rail */}
                <span
                  style={{
                    position: 'absolute',
                    right: -29,
                    top: 22,
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: i === 0 ? NAVY : GREEN,
                    border: '4px solid #fff',
                    boxShadow: '0 0 0 1px rgba(0,21,99,0.10)',
                  }}
                />
              </div>
              {/* Content */}
              <div
                style={{
                  background: WHITE,
                  border: '1px solid rgba(0,21,99,0.10)',
                  borderRadius: 22,
                  padding: 28,
                  boxShadow: '0 14px 32px -16px rgba(0,21,99,0.18)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  ...RTL_DIR,
                }}
              >
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 800, color: NAVY, lineHeight: 1.15 }}>{phase.title}</span>
                <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 0, margin: 0, listStyle: 'none' }}>
                  {phase.steps.map((step, j) => (
                    <li key={j} style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontFamily: FONT_BODY, fontSize: 20, fontWeight: 600, color: NAVY, padding: '8px 14px', background: i === 0 ? NAVY_DEEP + '0F' : GREEN_SOFT, border: `1px solid ${i === 0 ? 'rgba(0,21,99,0.18)' : 'rgba(104,190,105,0.35)'}`, borderRadius: 999 }}>
                      <span style={{ color: i === 0 ? NAVY : GREEN, fontWeight: 800 }}>0{j + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
                {phase.footer && <span style={{ fontFamily: FONT_BODY, fontSize: 18, color: 'rgba(0,21,99,0.6)', fontStyle: 'italic' }}>{phase.footer}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  E — Split: phase 1 light, phase 2 dark — clear visual divide  ───────────── */

export function ProcessVariantE({ index, total }: SlideProps) {
  const [first, second] = PROCESS.phases;
  return (
    <Frame index={index} variant="light" bg={WHITE}>
      <PageChrome pageNum={index} total={total} section="كيف نبني القرار" variant="light" />
      {/* Right side dark band (visually right since RTL — right is "primary first") */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%', background: NAVY }} />
      {/* Title overlapping both halves */}
      <div style={{ position: 'absolute', top: 130, left: 96, right: 96, ...RTL_DIR, zIndex: 4 }}>
        <FitText as="div" maxSize={64} minSize={28} width={SLIDE_WIDTH - 192} height={86} style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: NAVY, lineHeight: 1.2, ...RTL_DIR }}>
          {PROCESS.title}
        </FitText>
        <div style={{ marginTop: 6, fontFamily: FONT_BODY, fontSize: 22, color: 'rgba(0,21,99,0.65)' }}>{PROCESS.intro}</div>
      </div>
      {/* Phase 1 (right half — primary, navy bg, white ink) */}
      <div style={{ position: 'absolute', top: 280, bottom: 130, right: 96, width: 'calc(50% - 96px - 22px)', ...RTL_DIR, color: WHITE, padding: 28, display: 'flex', flexDirection: 'column', gap: 18, zIndex: 3 }}>
        <span style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 800, color: GREEN, letterSpacing: '0.32em' }}>{first.label}</span>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 900, lineHeight: 1.1 }}>{first.title}</span>
        <span style={{ width: 60, height: 4, background: GREEN }} />
        <ol style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 0, margin: 0, listStyle: 'none' }}>
          {first.steps.map((step, j) => (
            <li key={j} style={{ display: 'flex', gap: 14, fontFamily: FONT_BODY, fontSize: 22, fontWeight: 500, lineHeight: 1.5 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: GREEN, minWidth: 28 }}>0{j + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
      {/* Phase 2 (left half — light side) */}
      <div style={{ position: 'absolute', top: 280, bottom: 130, left: 96, width: 'calc(50% - 96px - 22px)', ...RTL_DIR, color: NAVY, padding: 28, display: 'flex', flexDirection: 'column', gap: 18, zIndex: 3 }}>
        <span style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 800, color: GREEN, letterSpacing: '0.32em' }}>{second.label}</span>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 900, lineHeight: 1.1, color: NAVY }}>{second.title}</span>
        <span style={{ width: 60, height: 4, background: NAVY }} />
        <ol style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 0, margin: 0, listStyle: 'none' }}>
          {second.steps.map((step, j) => (
            <li key={j} style={{ display: 'flex', gap: 14, fontFamily: FONT_BODY, fontSize: 22, fontWeight: 500, lineHeight: 1.5, color: NAVY }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: GREEN, minWidth: 28 }}>0{j + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {second.footer && <span style={{ marginTop: 'auto', fontFamily: FONT_BODY, fontSize: 18, color: 'rgba(0,21,99,0.6)', fontStyle: 'italic' }}>{second.footer}</span>}
      </div>
      {/* Center seam mark */}
      <span
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 60,
          height: 60,
          borderRadius: 999,
          background: GREEN,
          color: NAVY,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT_DISPLAY,
          fontWeight: 900,
          fontSize: 26,
          zIndex: 5,
          boxShadow: '0 14px 32px -10px rgba(0,0,0,0.35)',
        }}
      >
        ▶
      </span>
    </Frame>
  );
}

export const PROCESS_VARIANTS = {
  A: ProcessVariantA,
  B: ProcessVariantB,
  C: ProcessVariantC,
  D: ProcessVariantD,
  E: ProcessVariantE,
};

export type ProcessVariantKey = keyof typeof PROCESS_VARIANTS;
