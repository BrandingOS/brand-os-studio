/**
 * Impact slide — 5 visually-distinct variants (kind: 'impact').
 *
 * All variants render IMPACT from `uniexPitchContent.ts` unchanged.
 * Variant A is the original paper + navy quote card from
 * `slides/UniexPitchSlides.tsx`; B–E are new compositions.
 */

import type { CSSProperties, ReactNode } from 'react';
import { FitText } from '@/features/case-study-deck/styles/FitText';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';
import { IMPACT } from '../uniexPitchContent';
import { VideoPlayCard } from '../illustrations';
import { ReplaceableArtwork } from '../artwork/ReplaceableArtwork';

const NAVY = '#001563';
const NAVY_DEEP = '#0A0F2E';
const GREEN = '#68BE69';
const PAPER = '#F5F7FB';
const WHITE = '#FFFFFF';

// FitText sizes itself dynamically; reach the theme font family via the var.
const HEADING_FAMILY = 'var(--deck-font-heading)';
const BODY_FAMILY = 'var(--deck-font-body)';
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
        <span className="deck-caption" style={{ ...RTL_DIR, fontWeight: 600, color: chromeColor }}>التجربة الواقعية</span>
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

/* ────────────────  Variant A — original paper + navy quote card  ──────────────── */

export function ImpactSlideA({ index, total }: SlideProps) {
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
          maxSize={96}
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
          {IMPACT.title}
        </FitText>
        <div className="deck-h3" style={{ color: 'rgba(0,21,99,0.7)', maxWidth: 1100 }}>
          {IMPACT.caption}
        </div>
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
          <FitText
            as="div"
            maxSize={48}
            minSize={22}
            width={1500}
            height={140}
            style={{
              fontFamily: HEADING_FAMILY,
              fontWeight: 700,
              color: WHITE,
              lineHeight: 1.4,
              ...RTL_DIR,
            }}
          >
            "{IMPACT.question}"
          </FitText>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 80,
                height: 80,
                borderRadius: 999,
                background: GREEN,
                fontSize: 32,
              }}
            >
              ▶
            </span>
            <span className="deck-body" style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.18em' }}>
              🎥 {IMPACT.videoPlaceholder}
            </span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant B — illustration hero + quote overlay  ──────────────── */

export function ImpactSlideB({ index, total }: SlideProps) {
  return (
    <Frame index={index} bg={NAVY_DEEP} ink={WHITE}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.7,
        }}
      >
        <ReplaceableArtwork
          slotId="impact-B-video"
          defaultQuery="video play classroom"
          style={{
            width: Math.max(SLIDE_WIDTH, SLIDE_HEIGHT),
            height: Math.max(SLIDE_WIDTH, SLIDE_HEIGHT),
          }}
        >
          <VideoPlayCard size={Math.max(SLIDE_WIDTH, SLIDE_HEIGHT)} transparent />
        </ReplaceableArtwork>
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(120deg, rgba(0,21,99,0.92) 0%, rgba(0,21,99,0.55) 50%, rgba(10,15,46,0.85) 100%)',
        }}
      />
      <PageChrome pageNum={index} total={total} variant="flood" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '170px 96px 130px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 40,
          ...RTL_DIR,
        }}
      >
        <div>
          <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>REAL EXPERIENCE</span>
          <FitText
            as="div"
            maxSize={108}
            minSize={48}
            width={SLIDE_WIDTH - 192}
            height={150}
            style={{
              fontFamily: HEADING_FAMILY,
              fontWeight: 800,
              color: WHITE,
              lineHeight: 1.18,
              marginTop: 10,
              ...RTL_DIR,
            }}
          >
            {IMPACT.title}
          </FitText>
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 32,
            padding: '52px 60px',
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
            maxWidth: 1500,
            ...RTL_DIR,
          }}
        >
          {/* Decorative giant glyph */}
          <span style={{ fontFamily: HEADING_FAMILY, fontSize: 96, color: GREEN, lineHeight: 0.6 }}>
            "
          </span>
          <FitText
            as="div"
            maxSize={56}
            minSize={28}
            width={1380}
            height={170}
            style={{
              fontFamily: HEADING_FAMILY,
              fontWeight: 700,
              color: WHITE,
              lineHeight: 1.4,
              ...RTL_DIR,
            }}
          >
            {IMPACT.question}
          </FitText>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(255,255,255,0.18)',
              paddingTop: 22,
            }}
          >
            <span className="deck-body" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {IMPACT.caption}
            </span>
            <div
              className="deck-body"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                color: GREEN,
                fontWeight: 700,
                letterSpacing: '0.2em',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  background: GREEN,
                  color: NAVY,
                  fontSize: 18,
                }}
              >
                ▶
              </span>
              <span>🎥 {IMPACT.videoPlaceholder}</span>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant C — split video + question  ──────────────── */

export function ImpactSlideC({ index, total }: SlideProps) {
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
          gap: 30,
          ...RTL_DIR,
        }}
      >
        <FitText
          as="div"
          maxSize={80}
          minSize={36}
          width={SLIDE_WIDTH - 192}
          height={110}
          style={{
            fontFamily: HEADING_FAMILY,
            fontWeight: 800,
            color: NAVY,
            lineHeight: 1.18,
            ...RTL_DIR,
          }}
        >
          {IMPACT.title}
        </FitText>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 1fr',
            gap: 32,
            flex: 1,
          }}
        >
          {/* Mock video screen */}
          <div
            style={{
              borderRadius: 28,
              background: NAVY_DEEP,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 22px -8px rgba(0,21,99,0.18)',
            }}
          >
            {/* Top bar — fake browser-ish */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 36,
                background: 'rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                paddingLeft: 14,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.3)' }} />
              <span style={{ width: 10, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
              <span style={{ width: 10, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.15)' }} />
            </div>
            {/* Decorative bg */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at 30% 40%, rgba(104,190,105,0.30) 0%, rgba(104,190,105,0) 55%)',
              }}
            />
            {/* Big play */}
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: 999,
                background: GREEN,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px -6px rgba(104,190,105,0.25)',
              }}
            >
              <span style={{ color: NAVY, fontSize: 56, fontWeight: 900, marginLeft: 8 }}>▶</span>
            </div>
            <span
              className="deck-body"
              style={{
                position: 'absolute',
                bottom: 28,
                left: 32,
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: '0.2em',
              }}
            >
              🎥 {IMPACT.videoPlaceholder}
            </span>
          </div>
          {/* Question column */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 26,
              ...RTL_DIR,
            }}
          >
            <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>السؤال</span>
            <FitText
              as="div"
              maxSize={56}
              minSize={28}
              width={720}
              height={360}
              style={{
                fontFamily: HEADING_FAMILY,
                fontWeight: 700,
                color: NAVY,
                lineHeight: 1.4,
                ...RTL_DIR,
              }}
            >
              {IMPACT.question}
            </FitText>
            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: WHITE,
                border: '1px solid rgba(0,21,99,0.10)',
                borderRadius: 18,
                padding: '20px 24px',
              }}
            >
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  background: GREEN,
                  color: NAVY,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                ✦
              </span>
              <span className="deck-body" style={{ color: NAVY, fontWeight: 600 }}>
                {IMPACT.caption}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant D — film strip with 4 placeholders  ──────────────── */

export function ImpactSlideD({ index, total }: SlideProps) {
  const stripBgs = [
    `radial-gradient(circle at 30% 30%, ${GREEN}55 0%, ${NAVY} 70%)`,
    `radial-gradient(circle at 70% 60%, ${GREEN}40 0%, ${NAVY_DEEP} 70%)`,
    `radial-gradient(circle at 40% 70%, ${GREEN}50 0%, ${NAVY} 70%)`,
    `radial-gradient(circle at 60% 30%, ${GREEN}30 0%, ${NAVY_DEEP} 70%)`,
  ];
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
          gap: 30,
          ...RTL_DIR,
        }}
      >
        <FitText
          as="div"
          maxSize={80}
          minSize={36}
          width={SLIDE_WIDTH - 192}
          height={110}
          style={{
            fontFamily: HEADING_FAMILY,
            fontWeight: 800,
            color: NAVY,
            lineHeight: 1.18,
            ...RTL_DIR,
          }}
        >
          {IMPACT.title}
        </FitText>
        <span className="deck-body" style={{ color: 'rgba(0,21,99,0.7)', ...RTL_DIR }}>
          {IMPACT.caption}
        </span>
        {/* Film strip */}
        <div
          style={{
            background: NAVY_DEEP,
            borderRadius: 24,
            padding: '20px 16px',
            display: 'flex',
            gap: 14,
            position: 'relative',
            boxShadow: '0 8px 22px -8px rgba(0,21,99,0.18)',
          }}
        >
          {/* Top sprocket strip */}
          <div
            style={{
              position: 'absolute',
              top: -6,
              left: 24,
              right: 24,
              height: 12,
              display: 'flex',
              gap: 18,
              opacity: 0.5,
            }}
          >
            {Array.from({ length: 16 }).map((_, k) => (
              <span
                key={k}
                style={{ width: 18, height: 12, background: NAVY_DEEP, borderRadius: 3 }}
              />
            ))}
          </div>
          {stripBgs.map((bg, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                aspectRatio: '4/3',
                borderRadius: 14,
                background: bg,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.18)',
                  border: '2px solid rgba(255,255,255,0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: WHITE,
                  fontSize: 24,
                  marginLeft: 4,
                }}
              >
                ▶
              </div>
              <span
                className="deck-caption"
                style={{
                  position: 'absolute',
                  bottom: 12,
                  right: 14,
                  fontFamily: BODY_FAMILY,
                  color: 'rgba(255,255,255,0.75)',
                  letterSpacing: '0.18em',
                }}
              >
                0{i + 1} · 🎥 {IMPACT.videoPlaceholder}
              </span>
            </div>
          ))}
        </div>
        {/* Quote */}
        <div
          style={{
            background: NAVY,
            borderRadius: 22,
            padding: '32px 40px',
            color: WHITE,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 22,
            ...RTL_DIR,
          }}
        >
          {/* Decorative giant glyph */}
          <span style={{ fontFamily: HEADING_FAMILY, fontSize: 60, color: GREEN, lineHeight: 0.6 }}>
            "
          </span>
          <FitText
            as="div"
            maxSize={32}
            minSize={18}
            width={1500}
            height={120}
            style={{
              fontFamily: HEADING_FAMILY,
              fontWeight: 600,
              color: WHITE,
              lineHeight: 1.55,
              ...RTL_DIR,
            }}
          >
            {IMPACT.question}
          </FitText>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant E — testimonial wall (3 cards)  ──────────────── */

export function ImpactSlideE({ index, total }: SlideProps) {
  const cards = [
    { tone: 'paper', initials: 'ط·١', role: 'طالب — المرحلة الثانوية' },
    { tone: 'navy', initials: 'م·ع', role: 'مرشد أكاديمي بالمدرسة' },
    { tone: 'green', initials: 'و·أ', role: 'ولي أمر' },
  ] as const;
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
          gap: 32,
          ...RTL_DIR,
        }}
      >
        <div>
          <span className="deck-label" style={{ color: GREEN, letterSpacing: '0.32em' }}>VOICES · أصوات من التجربة</span>
          <FitText
            as="div"
            maxSize={88}
            minSize={40}
            width={SLIDE_WIDTH - 192}
            height={120}
            style={{
              fontFamily: HEADING_FAMILY,
              fontWeight: 800,
              color: NAVY,
              lineHeight: 1.18,
              marginTop: 8,
              ...RTL_DIR,
            }}
          >
            {IMPACT.title}
          </FitText>
        </div>
        <span className="deck-body" style={{ color: 'rgba(0,21,99,0.7)', ...RTL_DIR }}>
          {IMPACT.caption}
        </span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 22,
            flex: 1,
          }}
        >
          {cards.map((c, i) => {
            const bg =
              c.tone === 'navy' ? NAVY : c.tone === 'green' ? GREEN : WHITE;
            const fg = c.tone === 'paper' ? NAVY : WHITE;
            const accent = c.tone === 'green' ? NAVY : GREEN;
            return (
              <div
                key={i}
                style={{
                  background: bg,
                  color: fg,
                  borderRadius: 24,
                  padding: 36,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 22,
                  border: c.tone === 'paper' ? '1px solid rgba(0,21,99,0.10)' : 'none',
                  boxShadow:
                    c.tone === 'paper' ? '0 12px 36px -16px rgba(0, 21, 99, 0.18)' : 'none',
                  ...RTL_DIR,
                }}
              >
                {/* Decorative giant glyph */}
                <span
                  style={{
                    fontFamily: HEADING_FAMILY,
                    fontSize: 64,
                    color: accent,
                    lineHeight: 0.5,
                  }}
                >
                  "
                </span>
                <FitText
                  as="div"
                  maxSize={26}
                  minSize={16}
                  width={420}
                  height={220}
                  style={{
                    fontFamily: HEADING_FAMILY,
                    fontWeight: 700,
                    lineHeight: 1.5,
                    color: fg,
                    ...RTL_DIR,
                  }}
                >
                  {IMPACT.question}
                </FitText>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    paddingTop: 18,
                    borderTop:
                      c.tone === 'paper'
                        ? '1px solid rgba(0,21,99,0.10)'
                        : '1px solid rgba(255,255,255,0.22)',
                  }}
                >
                  <span
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 999,
                      background: accent,
                      color: c.tone === 'green' ? WHITE : NAVY,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: HEADING_FAMILY,
                      fontWeight: 800,
                      fontSize: 16,
                    }}
                  >
                    {c.initials}
                  </span>
                  <span className="deck-caption" style={{ fontWeight: 600, color: fg, opacity: 0.85 }}>
                    {c.role}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div
          className="deck-h3"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            color: GREEN,
            fontWeight: 700,
            letterSpacing: '0.2em',
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: GREEN,
              color: NAVY,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            ▶
          </span>
          <span>🎥 {IMPACT.videoPlaceholder}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  registry  ──────────────── */

export const IMPACT_VARIANTS = {
  A: ImpactSlideA,
  B: ImpactSlideB,
  C: ImpactSlideC,
  D: ImpactSlideD,
  E: ImpactSlideE,
} as const;

export type ImpactVariantKey = keyof typeof IMPACT_VARIANTS;
