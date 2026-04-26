/**
 * Team slide — 5 visually-distinct variants (kind: 'team').
 *
 * All variants render TEAM from `uniexPitchContent.ts` unchanged.
 * Variant A is the original paper + alternating cards from
 * `slides/UniexPitchSlides.tsx`; B–E are new compositions.
 */

import type { CSSProperties, ReactNode } from 'react';
import { FitText } from '@/features/case-study-deck/styles/FitText';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';
import { TEAM } from '../uniexPitchContent';

const NAVY = '#001563';
const NAVY_DEEP = '#0A0F2E';
const GREEN = '#68BE69';
const PAPER = '#F5F7FB';
const WHITE = '#FFFFFF';
const GREEN_SOFT = 'rgba(104, 190, 105, 0.12)';

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
          zIndex: 4,
        }}
      >
        <span style={{ fontWeight: 700, color: ink, letterSpacing: '0.06em' }}>uniex</span>
        <span style={{ ...RTL_DIR, fontWeight: 600, fontSize: 13 }}>الفريق والشركاء</span>
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
        fontFamily: FONT_DISPLAY,
      }}
    >
      {children}
    </div>
  );
}

/* ────────────────  Variant A — original alternating cards  ──────────────── */

export function TeamSlideA({ index, total }: SlideProps) {
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
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            color: NAVY,
            lineHeight: 1.18,
            ...RTL_DIR,
          }}
        >
          {TEAM.title}
        </FitText>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 26,
            color: 'rgba(0,21,99,0.78)',
            maxWidth: 1300,
            fontWeight: 500,
          }}
        >
          {TEAM.intro}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
            flex: 1,
          }}
        >
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
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.32em',
                  color: i === 1 ? GREEN : NAVY,
                  opacity: i === 1 ? 1 : 0.55,
                }}
              >
                0{i + 1}
              </span>
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 32,
                  fontWeight: 800,
                  lineHeight: 1.3,
                }}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            background: GREEN_SOFT,
            borderRadius: 18,
            padding: '20px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            ...RTL_DIR,
          }}
        >
          <span style={{ width: 40, height: 2, background: GREEN }} />
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 22,
              color: NAVY,
              fontWeight: 600,
            }}
          >
            {TEAM.closer}
          </span>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant B — illustration #1 bg + specialty pills  ──────────────── */

export function TeamSlideB({ index, total }: SlideProps) {
  return (
    <Frame index={index} bg={NAVY_DEEP} ink={WHITE}>
      <img
        src="/brands/uniex/designs/1.jpg"
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,21,99,0.85) 0%, rgba(0,21,99,0.45) 50%, rgba(10,15,46,0.92) 100%)',
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
          <span
            style={{
              fontFamily: FONT_BODY,
              fontSize: 14,
              color: GREEN,
              fontWeight: 700,
              letterSpacing: '0.32em',
            }}
          >
            TEAM · فريق متخصص
          </span>
          <FitText
            as="div"
            maxSize={120}
            minSize={56}
            width={SLIDE_WIDTH - 192}
            height={170}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              color: WHITE,
              lineHeight: 1.1,
              marginTop: 8,
              ...RTL_DIR,
            }}
          >
            {TEAM.title}
          </FitText>
          <FitText
            as="div"
            maxSize={28}
            minSize={18}
            width={1100}
            height={70}
            style={{
              fontFamily: FONT_BODY,
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.6,
              fontWeight: 500,
              marginTop: 18,
              ...RTL_DIR,
            }}
          >
            {TEAM.intro}
          </FitText>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
          {TEAM.specialties.map((s, i) => (
            <div
              key={i}
              style={{
                background: i === 0 ? GREEN : 'rgba(255,255,255,0.10)',
                border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.30)',
                color: i === 0 ? NAVY : WHITE,
                borderRadius: 999,
                padding: '22px 36px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 18,
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 28,
                backdropFilter: 'blur(12px)',
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  background: i === 0 ? NAVY : GREEN,
                  color: i === 0 ? GREEN : NAVY,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONT_DISPLAY,
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                0{i + 1}
              </span>
              <span>{s}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.22)',
            backdropFilter: 'blur(12px)',
            borderRadius: 18,
            padding: '20px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            ...RTL_DIR,
          }}
        >
          <span style={{ width: 40, height: 2, background: GREEN }} />
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 22,
              color: WHITE,
              fontWeight: 600,
            }}
          >
            {TEAM.closer}
          </span>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant C — circular layout, logo center  ──────────────── */

export function TeamSlideC({ index, total }: SlideProps) {
  // Polar positions for 3 specialties around a center hub.
  // Top, bottom-left, bottom-right.
  const positions = [
    { top: 80, left: 'calc(50% - 230px)' },
    { top: 360, left: 'calc(50% - 580px)' },
    { top: 360, left: 'calc(50% + 120px)' },
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
          gap: 28,
          ...RTL_DIR,
        }}
      >
        <FitText
          as="div"
          maxSize={88}
          minSize={36}
          width={SLIDE_WIDTH - 192}
          height={120}
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            color: NAVY,
            lineHeight: 1.18,
            ...RTL_DIR,
          }}
        >
          {TEAM.title}
        </FitText>
        <div style={{ position: 'relative', flex: 1 }}>
          {/* Faint guide circles */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 700,
              height: 700,
              borderRadius: 999,
              border: '1px dashed rgba(0,21,99,0.18)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 460,
              height: 460,
              borderRadius: 999,
              border: '1px dashed rgba(104,190,105,0.45)',
            }}
          />
          {/* Center hub — logo */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 320,
              height: 320,
              borderRadius: 999,
              background: NAVY,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 32px 80px -20px rgba(0,21,99,0.45)',
            }}
          >
            <img
              src="/brands/uniex/logos/iconGreen.svg"
              alt=""
              style={{ width: 130, height: 130 }}
            />
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 18,
                color: WHITE,
                fontWeight: 800,
                letterSpacing: '0.32em',
              }}
            >
              uniex
            </span>
          </div>
          {/* Specialty satellites */}
          {TEAM.specialties.map((s, i) => {
            const pos = positions[i] ?? positions[0];
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: pos.top,
                  left: pos.left,
                  width: 460,
                  background: i === 0 ? GREEN : WHITE,
                  color: i === 0 ? NAVY : NAVY,
                  border: i === 0 ? 'none' : '2px solid rgba(0,21,99,0.10)',
                  borderRadius: 22,
                  padding: '24px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  boxShadow: '0 16px 40px -16px rgba(0,21,99,0.22)',
                  ...RTL_DIR,
                }}
              >
                <span
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    background: i === 0 ? NAVY : GREEN,
                    color: i === 0 ? GREEN : WHITE,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 800,
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  0{i + 1}
                </span>
                <FitText
                  as="span"
                  maxSize={26}
                  minSize={16}
                  width={360}
                  height={80}
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 800,
                    color: NAVY,
                    lineHeight: 1.3,
                    ...RTL_DIR,
                  }}
                >
                  {s}
                </FitText>
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            color: NAVY,
            fontFamily: FONT_DISPLAY,
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          <span style={{ width: 40, height: 2, background: GREEN }} />
          <span>{TEAM.closer}</span>
          <span style={{ width: 40, height: 2, background: GREEN }} />
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant D — navy flood with bordered icon cards  ──────────────── */

export function TeamSlideD({ index, total }: SlideProps) {
  const icons = ['🧭', '🧱', '🏫'];
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
          gap: 40,
          ...RTL_DIR,
        }}
      >
        <div>
          <span
            style={{
              fontFamily: FONT_BODY,
              fontSize: 14,
              color: GREEN,
              fontWeight: 700,
              letterSpacing: '0.32em',
            }}
          >
            TEAM
          </span>
          <FitText
            as="div"
            maxSize={108}
            minSize={48}
            width={SLIDE_WIDTH - 192}
            height={150}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              color: WHITE,
              lineHeight: 1.18,
              marginTop: 8,
              ...RTL_DIR,
            }}
          >
            {TEAM.title}
          </FitText>
          <FitText
            as="div"
            maxSize={26}
            minSize={16}
            width={1300}
            height={70}
            style={{
              fontFamily: FONT_BODY,
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.6,
              fontWeight: 500,
              marginTop: 18,
              ...RTL_DIR,
            }}
          >
            {TEAM.intro}
          </FitText>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 22,
            flex: 1,
          }}
        >
          {TEAM.specialties.map((s, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '2px solid rgba(255,255,255,0.20)',
                borderRadius: 24,
                padding: 36,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 22,
                position: 'relative',
                overflow: 'hidden',
                ...RTL_DIR,
              }}
            >
              {/* Corner accent */}
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 80,
                  height: 6,
                  background: GREEN,
                }}
              />
              <span style={{ fontSize: 88, lineHeight: 1 }}>{icons[i]}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '0.32em',
                    color: GREEN,
                  }}
                >
                  مجال 0{i + 1}
                </span>
                <FitText
                  as="div"
                  maxSize={36}
                  minSize={20}
                  width={460}
                  height={120}
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 800,
                    color: WHITE,
                    lineHeight: 1.3,
                    ...RTL_DIR,
                  }}
                >
                  {s}
                </FitText>
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            background: GREEN,
            borderRadius: 18,
            padding: '20px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            ...RTL_DIR,
          }}
        >
          <span style={{ width: 40, height: 2, background: NAVY }} />
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 22,
              color: NAVY,
              fontWeight: 800,
            }}
          >
            {TEAM.closer}
          </span>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant E — partner logos strip below specialties  ──────────────── */

export function TeamSlideE({ index, total }: SlideProps) {
  const partners = ['Classera', 'Falak Hub', 'Misk', 'Local Univ.', 'Global Univ.'];
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
        <FitText
          as="div"
          maxSize={88}
          minSize={40}
          width={SLIDE_WIDTH - 192}
          height={120}
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            color: NAVY,
            lineHeight: 1.18,
            ...RTL_DIR,
          }}
        >
          {TEAM.title}
        </FitText>
        <FitText
          as="div"
          maxSize={26}
          minSize={16}
          width={SLIDE_WIDTH - 192}
          height={70}
          style={{
            fontFamily: FONT_BODY,
            color: 'rgba(0,21,99,0.78)',
            lineHeight: 1.6,
            fontWeight: 500,
            ...RTL_DIR,
          }}
        >
          {TEAM.intro}
        </FitText>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 22,
          }}
        >
          {TEAM.specialties.map((s, i) => (
            <div
              key={i}
              style={{
                background: WHITE,
                border: '1px solid rgba(0,21,99,0.10)',
                borderRadius: 22,
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                boxShadow: '0 12px 36px -16px rgba(0,21,99,0.18)',
                position: 'relative',
                ...RTL_DIR,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 32,
                  width: 8,
                  height: 56,
                  background: GREEN,
                  borderRadius: '0 0 4px 4px',
                }}
              />
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.32em',
                  color: 'rgba(0,21,99,0.55)',
                  marginTop: 28,
                }}
              >
                0{i + 1}
              </span>
              <FitText
                as="div"
                maxSize={32}
                minSize={18}
                width={460}
                height={110}
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  color: NAVY,
                  lineHeight: 1.3,
                  ...RTL_DIR,
                }}
              >
                {s}
              </FitText>
            </div>
          ))}
        </div>
        {/* Partners strip */}
        <div
          style={{
            background: NAVY,
            borderRadius: 22,
            padding: '28px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            flex: 1,
            ...RTL_DIR,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ width: 40, height: 2, background: GREEN }} />
            <span
              style={{
                fontFamily: FONT_BODY,
                fontSize: 14,
                color: GREEN,
                fontWeight: 700,
                letterSpacing: '0.32em',
              }}
            >
              PARTNERS · شركاء يدعمون التجربة
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 14,
              flex: 1,
            }}
          >
            {partners.map((p, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 14,
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 18,
                  color: 'rgba(255,255,255,0.85)',
                  letterSpacing: '0.06em',
                }}
              >
                {p}
              </div>
            ))}
          </div>
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 18,
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 600,
              ...RTL_DIR,
            }}
          >
            {TEAM.closer}
          </span>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  registry  ──────────────── */

export const TEAM_VARIANTS = {
  A: TeamSlideA,
  B: TeamSlideB,
  C: TeamSlideC,
  D: TeamSlideD,
  E: TeamSlideE,
} as const;

export type TeamVariantKey = keyof typeof TEAM_VARIANTS;
