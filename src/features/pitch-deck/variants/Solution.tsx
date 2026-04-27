/**
 * Solution slide — 5 visual variants. All consume SOLUTION content.
 * A = current implementation (paper + 2-pillar split + closer).
 */

import { FitText } from '@/features/case-study-deck/styles/FitText';
import { SOLUTION } from '../uniexPitchContent';
import { ReplaceableArtwork } from '../artwork/ReplaceableArtwork';
import {
  Frame,
  GREEN,
  ICON_GREEN,
  NAVY,
  PageChrome,
  RTL_DIR,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  type SlideProps,
  WHITE,
} from './_shared';

// FitText sizes itself dynamically; reach the theme font family via the var.
const HEADING_FAMILY = 'var(--deck-font-heading)';
const BODY_FAMILY = 'var(--deck-font-body)';

/* ─────────────  A — Paper, two-pillar split (current)  ───────────── */

export function SolutionVariantA({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="الحل" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 50, ...RTL_DIR }}>
        <div>
          <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>SOLUTION</span>
          <FitText as="div" maxSize={96} minSize={48} width={SLIDE_WIDTH - 192} height={130} style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, lineHeight: 1.18, color: NAVY, marginTop: 12, ...RTL_DIR }}>
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
              {/* Decorative icon glyph — keep inline */}
              <span style={{ fontSize: 96, lineHeight: 1 }}>{p.icon}</span>
              <div>
                <span className="deck-h1" style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, display: 'block', color: WHITE }}>{p.title}</span>
                <span className="deck-body" style={{ fontWeight: 500, marginTop: 18, display: 'block', color: 'rgba(255,255,255,0.95)' }}>{p.body}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="deck-h3" style={{ fontWeight: 700, color: NAVY, ...RTL_DIR, display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ width: 56, height: 4, background: GREEN }} />
          <span>{SOLUTION.closer}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  B — Image #1 (laptop) full-bleed left + pillars stacked right  ───────────── */

export function SolutionVariantB({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="الحل" variant="light" />
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
        {/* Right column: stacked pillars + closer */}
        <div style={{ flex: 1, padding: '170px 64px 130px 96px', display: 'flex', flexDirection: 'column', gap: 24, ...RTL_DIR }}>
          <div>
            <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>// SOLUTION</span>
            <FitText
              as="div"
              maxSize={68}
              minSize={32}
              width={(SLIDE_WIDTH * 0.55) - 160}
              height={150}
              style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, lineHeight: 1.2, color: NAVY, marginTop: 10, ...RTL_DIR }}
            >
              {SOLUTION.title}
            </FitText>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
            {SOLUTION.pillars.map((p, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 22,
                  padding: 28,
                  background: i === 0 ? NAVY : GREEN,
                  color: WHITE,
                  borderRadius: 22,
                  ...RTL_DIR,
                }}
              >
                <span style={{ fontSize: 64, lineHeight: 1, flexShrink: 0 }}>{p.icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="deck-h2" style={{ fontWeight: 800, color: WHITE }}>{p.title}</span>
                  <span className="deck-body" style={{ fontWeight: 500, color: 'rgba(255,255,255,0.95)' }}>{p.body}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px', background: WHITE, border: `1px solid rgba(0,21,99,0.10)`, borderRadius: 16 }}>
            <span style={{ width: 44, height: 3, background: GREEN }} />
            <span className="deck-body" style={{ fontWeight: 700, color: NAVY }}>{SOLUTION.closer}</span>
          </div>
        </div>
        {/* Left column: full-bleed illustration (visual right per RTL is left of canvas) */}
        <div
          style={{
            width: SLIDE_WIDTH * 0.45,
            background: GREEN,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <ReplaceableArtwork
            slotId="solution-B-laptop"
            defaultQuery="laptop online learning"
            style={{ width: SLIDE_WIDTH * 0.55, height: SLIDE_WIDTH * 0.55 }}
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
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(245,247,251,0) 0%, rgba(245,247,251,0.45) 100%)' }} />
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  C — Navy flood, overlapping pillar cards, image #3 watermark  ───────────── */

export function SolutionVariantC({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="flood">
      <PageChrome pageNum={index} total={total} section="الحل" variant="flood" />
      {/* Watermark — open-book illustration tinted into the navy */}
      <div
        style={{
          position: 'absolute',
          left: -160,
          bottom: -160,
          width: 760,
          height: 760,
          opacity: 0.22,
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 75%)',
          pointerEvents: 'none',
        }}
      >
        <ReplaceableArtwork
          slotId="solution-C-openbook"
          defaultQuery="open book learning"
          style={{ width: 760, height: 760 }}
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
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 40, ...RTL_DIR }}>
        <div>
          <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>SOLUTION</span>
          <FitText as="div" maxSize={96} minSize={48} width={SLIDE_WIDTH - 192} height={140} style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, lineHeight: 1.18, color: WHITE, marginTop: 12, ...RTL_DIR }}>
            {SOLUTION.title}
          </FitText>
        </div>
        <div style={{ position: 'relative', flex: 1 }}>
          {SOLUTION.pillars.map((p, i) => {
            const isFirst = i === 0;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: isFirst ? 0 : 80,
                  right: isFirst ? 0 : '40%',
                  width: '60%',
                  background: isFirst ? GREEN : NAVY,
                  border: isFirst ? 'none' : `1px solid ${GREEN}`,
                  color: WHITE,
                  padding: 48,
                  borderRadius: 28,
                  boxShadow: isFirst ? '0 8px 22px -6px rgba(0,0,0,0.20)' : '0 8px 22px -6px rgba(0,0,0,0.24)',
                  zIndex: isFirst ? 1 : 2,
                  ...RTL_DIR,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <span style={{ fontSize: 64, lineHeight: 1 }}>{p.icon}</span>
                  <span className="deck-label" style={{ color: isFirst ? NAVY : GREEN, letterSpacing: '0.32em' }}>0{i + 1} / 02</span>
                </div>
                <span className="deck-h1" style={{ fontWeight: 800, display: 'block', color: isFirst ? NAVY : WHITE }}>{p.title}</span>
                <span className="deck-body" style={{ fontWeight: 500, marginTop: 16, display: 'block', color: isFirst ? 'rgba(0,21,99,0.85)' : 'rgba(255,255,255,0.92)' }}>{p.body}</span>
              </div>
            );
          })}
        </div>
        <div className="deck-h3" style={{ display: 'flex', alignItems: 'center', gap: 18, color: GREEN, fontWeight: 700, ...RTL_DIR }}>
          <span style={{ width: 56, height: 4, background: GREEN }} />
          <span>{SOLUTION.closer}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  D — Three-pillar layout (adds outcome as 3rd column)  ───────────── */

export function SolutionVariantD({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="الحل" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 40, ...RTL_DIR }}>
        <div>
          <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>SOLUTION</span>
          <FitText as="div" maxSize={92} minSize={42} width={SLIDE_WIDTH - 192} height={140} style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, lineHeight: 1.2, color: NAVY, marginTop: 10, ...RTL_DIR }}>
            {SOLUTION.title}
          </FitText>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, flex: 1 }}>
          {SOLUTION.pillars.map((p, i) => (
            <div
              key={i}
              style={{
                background: WHITE,
                borderTop: `8px solid ${i === 0 ? NAVY : GREEN}`,
                borderRadius: '4px 4px 24px 24px',
                padding: 36,
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
                boxShadow: '0 18px 40px -18px rgba(0,21,99,0.18)',
                ...RTL_DIR,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 56, lineHeight: 1 }}>{p.icon}</span>
                <span className="deck-label" style={{ color: i === 0 ? NAVY : GREEN, letterSpacing: '0.32em' }}>STEP 0{i + 1}</span>
              </div>
              <div>
                <span className="deck-h2" style={{ fontWeight: 800, color: NAVY, display: 'block' }}>{p.title}</span>
                <span className="deck-body" style={{ fontWeight: 500, color: 'rgba(0,21,99,0.78)', marginTop: 14, display: 'block' }}>{p.body}</span>
              </div>
            </div>
          ))}
          {/* Synthetic 3rd pillar from `closer` — content untouched */}
          <div
            style={{
              background: NAVY,
              color: WHITE,
              borderRadius: 24,
              padding: 36,
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
              ...RTL_DIR,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 56, lineHeight: 1 }}>✨</span>
              <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>OUTCOME</span>
            </div>
            <div>
              <span className="deck-h2" style={{ fontWeight: 800, color: WHITE, display: 'block' }}>قرار واعٍ</span>
              <span className="deck-body" style={{ fontWeight: 500, color: 'rgba(255,255,255,0.92)', marginTop: 14, display: 'block' }}>{SOLUTION.closer}</span>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  E — Minimal centered: 2 big circles (navy + green)  ───────────── */

export function SolutionVariantE({ index, total }: SlideProps) {
  const CIRCLE = 460;
  return (
    <Frame index={index} variant="light" bg={WHITE}>
      <PageChrome pageNum={index} total={total} section="الحل" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 130px', display: 'flex', flexDirection: 'column', gap: 32, ...RTL_DIR }}>
        <div style={{ textAlign: 'center', ...RTL_DIR }}>
          <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.4em' }}>// SOLUTION</span>
          <FitText
            as="div"
            maxSize={80}
            minSize={36}
            width={SLIDE_WIDTH - 192}
            height={120}
            style={{ fontFamily: HEADING_FAMILY, fontWeight: 800, lineHeight: 1.2, color: NAVY, marginTop: 12, direction: 'rtl', textAlign: 'center' }}
          >
            {SOLUTION.title}
          </FitText>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {/* Center connector line */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 200, height: 4, background: NAVY, zIndex: 0, opacity: 0.35 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 80, zIndex: 1 }}>
            {SOLUTION.pillars.map((p, i) => (
              <div
                key={i}
                style={{
                  width: CIRCLE,
                  height: CIRCLE,
                  borderRadius: 999,
                  background: i === 0 ? NAVY : GREEN,
                  color: WHITE,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: 60,
                  position: 'relative',
                  boxShadow: '0 8px 22px -6px rgba(0,21,99,0.18)',
                }}
              >
                <span style={{ fontSize: 96, lineHeight: 1, marginBottom: 12 }}>{p.icon}</span>
                <span className="deck-h2" style={{ fontWeight: 800, marginBottom: 12, color: WHITE }}>{p.title}</span>
                <span className="deck-body" style={{ fontWeight: 500, color: 'rgba(255,255,255,0.92)', direction: 'rtl' }}>{p.body}</span>
              </div>
            ))}
          </div>
          {/* Decorative iconmark behind */}
          <img
            src={ICON_GREEN}
            alt=""
            style={{
              position: 'absolute',
              right: '50%',
              top: '50%',
              width: 60,
              height: 60,
              transform: 'translate(50%, -50%)',
              opacity: 0.85,
              zIndex: 2,
              background: WHITE,
              borderRadius: 999,
              padding: 8,
              boxShadow: '0 10px 24px -8px rgba(0,21,99,0.3)',
            }}
          />
          {/* offsets */}
          <span className="deck-caption" style={{ position: 'absolute', top: 10, left: 10, fontFamily: BODY_FAMILY, color: 'rgba(0,21,99,0.4)', letterSpacing: '0.32em' }}>0{SLIDE_HEIGHT > 0 ? 1 : 1}</span>
        </div>
        <div className="deck-h3" style={{ textAlign: 'center', fontWeight: 700, color: NAVY, direction: 'rtl' }}>
          {SOLUTION.closer}
        </div>
      </div>
    </Frame>
  );
}

export const SOLUTION_VARIANTS = {
  A: SolutionVariantA,
  B: SolutionVariantB,
  C: SolutionVariantC,
  D: SolutionVariantD,
  E: SolutionVariantE,
};

export type SolutionVariantKey = keyof typeof SOLUTION_VARIANTS;
