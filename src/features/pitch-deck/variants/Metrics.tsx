/**
 * Metrics slide — 5 visually-distinct variants (kind: 'metrics').
 *
 * All variants render METRICS from `uniexPitchContent.ts` unchanged.
 * Variant A is the original navy-flood card layout from
 * `slides/UniexPitchSlides.tsx`; B–E are new compositions.
 */

import type { CSSProperties, ReactNode } from 'react';
import { FitText } from '@/features/case-study-deck/styles/FitText';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';
import { METRICS } from '../uniexPitchContent';
import { ReplaceableArtwork } from '../artwork/ReplaceableArtwork';

const NAVY = '#001563';
const NAVY_DEEP = '#0A0F2E';
const GREEN = '#68BE69';
const PAPER = '#F5F7FB';
const WHITE = '#FFFFFF';
const GREEN_SOFT = 'rgba(104, 190, 105, 0.12)';

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
          zIndex: 4,
        }}
      >
        <span className="deck-label" style={{ color: wordmarkColor, letterSpacing: '0.06em' }}>uniex</span>
        <span className="deck-caption" style={{ ...RTL_DIR, fontWeight: 600, color: chromeColor }}>مؤشرات الأثر</span>
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
          zIndex: 4,
        }}
      />
    </>
  );
}

function Frame({
  index,
  bg,
  ink,
  children,
}: {
  index: number;
  bg: string;
  ink: string;
  children: ReactNode;
}) {
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
      }}
    >
      {children}
    </div>
  );
}

/* ────────────────  Variant A — original navy flood  ──────────────── */

export function MetricsSlideA({ index, total }: SlideProps) {
  return (
    <Frame index={index} bg={NAVY} ink={WHITE}>
      <PageChrome pageNum={index} total={total} variant="flood" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '170px 96px 130px',
          display: 'flex',
          flexDirection: 'column',
          gap: 50,
          ...RTL_DIR,
        }}
      >
        <div>
          <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>METRICS</span>
          <FitText
            as="div"
            maxSize={96}
            minSize={48}
            width={SLIDE_WIDTH - 192}
            height={140}
            style={{
              fontFamily: HEADING_FAMILY,
              fontWeight: 800,
              color: WHITE,
              lineHeight: 1.18,
              marginTop: 12,
              ...RTL_DIR,
            }}
          >
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
              {/* Decorative giant numeral — keep inline */}
              <span
                style={{
                  fontFamily: HEADING_FAMILY,
                  fontSize: 96,
                  fontWeight: 800,
                  color: GREEN,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {s.value}
              </span>
              <span className="deck-body" style={{ color: WHITE, fontWeight: 500 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {METRICS.notes.map((n, i) => (
            <span
              key={i}
              className="deck-body"
              style={{
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
        <div
          className="deck-h3"
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            color: GREEN,
            fontWeight: 700,
          }}
        >
          <span style={{ width: 50, height: 4, background: GREEN }} />
          <span>{METRICS.closer}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant B — paper canvas, oversized circles  ──────────────── */

export function MetricsSlideB({ index, total }: SlideProps) {
  const circleColors = [GREEN, NAVY, NAVY_DEEP];
  return (
    <Frame index={index} bg={PAPER} ink={NAVY}>
      <PageChrome pageNum={index} total={total} variant="light" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '170px 96px 130px',
          display: 'flex',
          flexDirection: 'column',
          gap: 40,
          ...RTL_DIR,
        }}
      >
        <FitText
          as="div"
          maxSize={88}
          minSize={40}
          width={SLIDE_WIDTH - 192}
          height={130}
          style={{
            fontFamily: HEADING_FAMILY,
            fontWeight: 800,
            color: NAVY,
            lineHeight: 1.18,
            ...RTL_DIR,
          }}
        >
          {METRICS.title}
        </FitText>
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 32,
            alignItems: 'center',
          }}
        >
          {METRICS.stats.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 22,
                ...RTL_DIR,
              }}
            >
              <div
                style={{
                  width: 360,
                  height: 360,
                  borderRadius: '50%',
                  background: circleColors[i],
                  color: WHITE,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 24px -8px ${circleColors[i]}40`,
                }}
              >
                <FitText
                  as="span"
                  maxSize={108}
                  minSize={56}
                  width={300}
                  height={140}
                  style={{
                    fontFamily: HEADING_FAMILY,
                    fontWeight: 800,
                    color: WHITE,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    textAlign: 'center',
                  }}
                >
                  {s.value}
                </FitText>
              </div>
              <span className="deck-body" style={{ fontWeight: 700, color: NAVY }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            justifyContent: 'center',
          }}
        >
          {METRICS.notes.map((n, i) => (
            <span
              key={i}
              className="deck-body"
              style={{
                fontWeight: 600,
                color: NAVY,
                background: WHITE,
                border: '1px solid rgba(0,21,99,0.10)',
                padding: '10px 20px',
                borderRadius: 999,
              }}
            >
              {n}
            </span>
          ))}
        </div>
        <div
          className="deck-h3"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 18,
            color: GREEN,
            fontWeight: 700,
          }}
        >
          <span style={{ width: 50, height: 4, background: GREEN }} />
          <span>{METRICS.closer}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant C — hero illustration left + stats column  ──────────────── */

export function MetricsSlideC({ index, total }: SlideProps) {
  return (
    <Frame index={index} bg={PAPER} ink={NAVY}>
      <PageChrome pageNum={index} total={total} variant="light" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '170px 96px 130px',
          display: 'grid',
          gridTemplateColumns: '1fr 1.05fr',
          gap: 56,
          ...RTL_DIR,
        }}
      >
        {/* Left column — image hero */}
        <div
          style={{
            position: 'relative',
            borderRadius: 28,
            overflow: 'hidden',
            background: NAVY,
            display: 'flex',
            alignItems: 'flex-end',
            padding: 36,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: NAVY,
              overflow: 'hidden',
            }}
          >
            <ReplaceableArtwork
              slotId="metrics-C-trophy"
              defaultQuery="trophy"
              style={{ width: 560, height: 560 }}
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
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(0,21,99,0) 35%, rgba(0,21,99,0.85) 100%)',
            }}
          />
          <div
            style={{
              position: 'relative',
              ...RTL_DIR,
              color: WHITE,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>METRICS</span>
            <FitText
              as="div"
              maxSize={64}
              minSize={32}
              width={520}
              height={180}
              style={{
                fontFamily: HEADING_FAMILY,
                fontWeight: 800,
                color: WHITE,
                lineHeight: 1.2,
                ...RTL_DIR,
              }}
            >
              {METRICS.title}
            </FitText>
          </div>
        </div>
        {/* Right column — stats stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, ...RTL_DIR }}>
          {METRICS.stats.map((s, i) => (
            <div
              key={i}
              style={{
                background: WHITE,
                border: '1px solid rgba(0,21,99,0.10)',
                borderRadius: 22,
                padding: '28px 36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
                boxShadow: '0 12px 36px -16px rgba(0, 21, 99, 0.18)',
                ...RTL_DIR,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="deck-label" style={{ letterSpacing: '0.32em', color: 'rgba(0,21,99,0.55)' }}>0{i + 1}</span>
                <span className="deck-h3" style={{ fontWeight: 700, color: NAVY }}>{s.label}</span>
              </div>
              <FitText
                as="span"
                maxSize={92}
                minSize={48}
                width={320}
                height={110}
                style={{
                  fontFamily: HEADING_FAMILY,
                  fontWeight: 800,
                  color: GREEN,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  textAlign: 'left',
                }}
              >
                {s.value}
              </FitText>
            </div>
          ))}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              ...RTL_DIR,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {METRICS.notes.map((n, i) => (
                <span
                  key={i}
                  className="deck-caption"
                  style={{
                    fontWeight: 600,
                    color: NAVY,
                    background: GREEN_SOFT,
                    padding: '8px 14px',
                    borderRadius: 999,
                  }}
                >
                  · {n}
                </span>
              ))}
            </div>
            <span className="deck-h3" style={{ fontWeight: 700, color: NAVY }}>{METRICS.closer}</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant D — green flood, white stats, chips  ──────────────── */

export function MetricsSlideD({ index, total }: SlideProps) {
  return (
    <Frame index={index} bg={GREEN} ink={NAVY}>
      <PageChrome pageNum={index} total={total} variant="flood" />
      {/* Diagonal navy band */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(120deg, rgba(0,21,99,0.0) 0%, rgba(0,21,99,0.0) 60%, rgba(0,21,99,0.18) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '170px 96px 130px',
          display: 'flex',
          flexDirection: 'column',
          gap: 38,
          ...RTL_DIR,
        }}
      >
        <div>
          <span className="deck-label" style={{ color: NAVY, letterSpacing: '0.32em', opacity: 0.7 }}>METRICS · مؤشرات الأثر</span>
          <FitText
            as="div"
            maxSize={108}
            minSize={48}
            width={SLIDE_WIDTH - 192}
            height={150}
            style={{
              fontFamily: HEADING_FAMILY,
              fontWeight: 800,
              color: NAVY,
              lineHeight: 1.18,
              marginTop: 8,
              ...RTL_DIR,
            }}
          >
            {METRICS.title}
          </FitText>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0,
            flex: 1,
            background: NAVY,
            borderRadius: 28,
            padding: 12,
          }}
        >
          {METRICS.stats.map((s, i) => (
            <div
              key={i}
              style={{
                padding: 44,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 18,
                borderRight:
                  i < METRICS.stats.length - 1 ? '1px solid rgba(255,255,255,0.18)' : 'none',
                ...RTL_DIR,
              }}
            >
              <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>0{i + 1}</span>
              <FitText
                as="div"
                maxSize={140}
                minSize={64}
                width={460}
                height={170}
                style={{
                  fontFamily: HEADING_FAMILY,
                  fontWeight: 800,
                  color: WHITE,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  ...RTL_DIR,
                }}
              >
                {s.value}
              </FitText>
              <span className="deck-body" style={{ color: WHITE, fontWeight: 600, opacity: 0.92 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {METRICS.notes.map((n, i) => (
              <span
                key={i}
                className="deck-body"
                style={{
                  fontWeight: 700,
                  color: NAVY,
                  background: WHITE,
                  padding: '10px 20px',
                  borderRadius: 999,
                }}
              >
                {n}
              </span>
            ))}
          </div>
          <span className="deck-h3" style={{ fontWeight: 800, color: NAVY }}>{METRICS.closer}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant E — minimal, single +10K hero  ──────────────── */

export function MetricsSlideE({ index, total }: SlideProps) {
  // Combined hero stat (still derived from same content — students + users dimension).
  const hero = '+10K';
  const heroLabel = 'طالب ومستخدم تأثروا بتجربة يونكس';
  return (
    <Frame index={index} bg={PAPER} ink={NAVY}>
      <PageChrome pageNum={index} total={total} variant="light" />
      {/* Faint watermark */}
      <img
        src="/brands/uniex/logos/iconNavy.svg"
        alt=""
        style={{
          position: 'absolute',
          top: 200,
          left: -160,
          width: 720,
          opacity: 0.05,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '170px 96px 130px',
          display: 'flex',
          flexDirection: 'column',
          ...RTL_DIR,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>METRICS · مؤشرات</span>
          <FitText
            as="div"
            maxSize={56}
            minSize={28}
            width={SLIDE_WIDTH - 192}
            height={80}
            style={{
              fontFamily: HEADING_FAMILY,
              fontWeight: 700,
              color: NAVY,
              lineHeight: 1.2,
              ...RTL_DIR,
            }}
          >
            {METRICS.title}
          </FitText>
        </div>
        {/* Mega hero number */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          <FitText
            as="div"
            maxSize={520}
            minSize={220}
            width={1500}
            height={520}
            style={{
              fontFamily: HEADING_FAMILY,
              fontWeight: 800,
              color: GREEN,
              lineHeight: 0.9,
              letterSpacing: '-0.04em',
              textAlign: 'center',
            }}
          >
            {hero}
          </FitText>
          <span
            className="deck-h3"
            style={{
              fontWeight: 600,
              color: NAVY,
              textAlign: 'center',
              ...RTL_DIR,
            }}
          >
            {heroLabel}
          </span>
        </div>
        {/* Component stats — small strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 18,
            borderTop: '1px solid rgba(0,21,99,0.12)',
            paddingTop: 22,
          }}
        >
          {METRICS.stats.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                ...RTL_DIR,
              }}
            >
              <span className="deck-h2" style={{ fontWeight: 800, color: NAVY, letterSpacing: '-0.01em' }}>
                {s.value}
              </span>
              <span className="deck-body" style={{ fontWeight: 600, color: 'rgba(0,21,99,0.7)' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  registry  ──────────────── */

export const METRICS_VARIANTS = {
  A: MetricsSlideA,
  B: MetricsSlideB,
  C: MetricsSlideC,
  D: MetricsSlideD,
  E: MetricsSlideE,
} as const;

export type MetricsVariantKey = keyof typeof METRICS_VARIANTS;
