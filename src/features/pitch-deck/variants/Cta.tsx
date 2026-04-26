/**
 * CTA slide — 5 visually-distinct variants (kind: 'cta').
 *
 * All variants render CTA from `uniexPitchContent.ts` unchanged.
 * Variant A is the original navy flood + green CTA bar from
 * `slides/UniexPitchSlides.tsx`; B–E are new compositions.
 */

import type { CSSProperties, ReactNode } from 'react';
import { FitText } from '@/features/case-study-deck/styles/FitText';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';
import { CTA } from '../uniexPitchContent';

const NAVY = '#001563';
const NAVY_DEEP = '#0A0F2E';
const GREEN = '#68BE69';
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
          fontSize: 14,
          color: muted,
          letterSpacing: '0.04em',
          zIndex: 4,
        }}
      >
        <span style={{ fontWeight: 700, color: ink, letterSpacing: '0.06em' }}>uniex</span>
        <span style={{ ...RTL_DIR, fontWeight: 600, fontSize: 13 }}>تواصل معنا</span>
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

/** Generic faux QR placeholder — square grid of dots. */
function QrPlaceholder({ size, dark, light }: { size: number; dark: string; light: string }) {
  const cells = 13;
  // Deterministic pattern: corners + diagonal-ish dots so it reads as a QR.
  const filled = (r: number, c: number) => {
    const corner =
      (r < 3 && c < 3) ||
      (r < 3 && c >= cells - 3) ||
      (r >= cells - 3 && c < 3);
    if (corner) {
      const innerR = Math.min(r, cells - 1 - r);
      const innerC = Math.min(c < cells / 2 ? c : cells - 1 - c, c);
      return innerR === 0 || innerC === 0 || (innerR === 1 && innerC === 1) ? false : true;
    }
    // Pseudo-random (deterministic): hash on r,c
    return ((r * 7 + c * 11 + r * c) % 5) < 2;
  };
  return (
    <div
      style={{
        width: size,
        height: size,
        background: light,
        borderRadius: size * 0.06,
        padding: size * 0.06,
        display: 'grid',
        gridTemplateColumns: `repeat(${cells}, 1fr)`,
        gridTemplateRows: `repeat(${cells}, 1fr)`,
        gap: 2,
      }}
    >
      {Array.from({ length: cells * cells }).map((_, k) => {
        const r = Math.floor(k / cells);
        const c = k % cells;
        const corner =
          (r < 3 && c < 3) ||
          (r < 3 && c >= cells - 3) ||
          (r >= cells - 3 && c < 3);
        return (
          <div
            key={k}
            style={{
              background: corner
                ? r === 0 || c === 0 || r === cells - 1 || c === cells - 1 || c === cells - 1
                  ? dark
                  : (r === 1 && c === 1) || (r === 1 && c === cells - 2) || (r === cells - 2 && c === 1)
                  ? light
                  : dark
                : filled(r, c)
                ? dark
                : light,
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}

/* ────────────────  Variant A — original navy flood  ──────────────── */

export function CtaSlideA({ index, total }: SlideProps) {
  return (
    <Frame index={index} bg={NAVY} ink={WHITE}>
      <img
        src="/brands/uniex/logos/iconGreen.svg"
        alt=""
        style={{
          position: 'absolute',
          bottom: -180,
          left: -180,
          width: 720,
          opacity: 0.16,
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
          gap: 50,
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
            NEXT STEP
          </span>
          <FitText
            as="div"
            maxSize={96}
            minSize={48}
            width={SLIDE_WIDTH - 192}
            height={170}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              color: WHITE,
              lineHeight: 1.18,
              marginTop: 12,
              ...RTL_DIR,
            }}
          >
            {CTA.title}
          </FitText>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
          }}
        >
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
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 64,
                  fontWeight: 800,
                  color: GREEN,
                  lineHeight: 1,
                }}
              >
                0{i + 1}
              </span>
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 26,
                  fontWeight: 700,
                  color: WHITE,
                  lineHeight: 1.4,
                }}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            background: GREEN,
            borderRadius: 22,
            padding: '36px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 32,
            ...RTL_DIR,
          }}
        >
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 28,
              fontWeight: 800,
              color: NAVY,
              lineHeight: 1.4,
            }}
          >
            {CTA.cta}
          </span>
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

/* ────────────────  Variant B — green flood + horizontal step row  ──────────────── */

export function CtaSlideB({ index, total }: SlideProps) {
  return (
    <Frame index={index} bg={GREEN} ink={NAVY}>
      <PageChrome pageNum={index} total={total} variant="flood" />
      {/* Subtle radial */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 800,
          height: 800,
          borderRadius: 999,
          background:
            'radial-gradient(circle, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0) 70%)',
        }}
      />
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
              color: NAVY,
              fontWeight: 700,
              letterSpacing: '0.32em',
              opacity: 0.7,
            }}
          >
            NEXT STEP · ابدأ الآن
          </span>
          <FitText
            as="div"
            maxSize={120}
            minSize={56}
            width={SLIDE_WIDTH - 192}
            height={200}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              color: NAVY,
              lineHeight: 1.15,
              marginTop: 8,
              ...RTL_DIR,
            }}
          >
            {CTA.title}
          </FitText>
        </div>
        {/* Horizontal step row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            background: WHITE,
            borderRadius: 24,
            padding: 14,
            boxShadow: '0 24px 60px -16px rgba(0,21,99,0.22)',
          }}
        >
          {CTA.steps.map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '20px 24px',
                borderRight:
                  i < CTA.steps.length - 1
                    ? '1px solid rgba(0,21,99,0.10)'
                    : 'none',
                ...RTL_DIR,
              }}
            >
              <span
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  background: GREEN,
                  color: NAVY,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: 24,
                  flexShrink: 0,
                }}
              >
                0{i + 1}
              </span>
              <FitText
                as="span"
                maxSize={26}
                minSize={16}
                width={420}
                height={70}
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  color: NAVY,
                  lineHeight: 1.4,
                  ...RTL_DIR,
                }}
              >
                {s}
              </FitText>
            </div>
          ))}
        </div>
        {/* CTA + QR */}
        <div
          style={{
            background: NAVY,
            borderRadius: 24,
            padding: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 32,
            ...RTL_DIR,
          }}
        >
          <FitText
            as="span"
            maxSize={36}
            minSize={20}
            width={1300}
            height={120}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              color: WHITE,
              lineHeight: 1.4,
              ...RTL_DIR,
            }}
          >
            {CTA.cta}
          </FitText>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 13,
                  color: GREEN,
                  fontWeight: 700,
                  letterSpacing: '0.32em',
                }}
              >
                {CTA.contact}
              </span>
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 16,
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                WhatsApp
              </span>
            </div>
            <QrPlaceholder size={130} dark={NAVY} light={WHITE} />
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant C — illustration bg + steps + CTA hero  ──────────────── */

export function CtaSlideC({ index, total }: SlideProps) {
  return (
    <Frame index={index} bg={NAVY_DEEP} ink={WHITE}>
      <img
        src="/brands/uniex/designs/3.jpg"
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
            'linear-gradient(180deg, rgba(0,21,99,0.85) 0%, rgba(0,21,99,0.55) 50%, rgba(10,15,46,0.92) 100%)',
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
          gap: 36,
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
            CONTACT · تواصل معنا
          </span>
          <FitText
            as="div"
            maxSize={110}
            minSize={52}
            width={SLIDE_WIDTH - 192}
            height={200}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              color: WHITE,
              lineHeight: 1.15,
              marginTop: 8,
              ...RTL_DIR,
            }}
          >
            {CTA.title}
          </FitText>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'stretch',
          }}
        >
          {CTA.steps.map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 18,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                ...RTL_DIR,
              }}
            >
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 36,
                  fontWeight: 800,
                  color: GREEN,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                0{i + 1}
              </span>
              <FitText
                as="span"
                maxSize={22}
                minSize={14}
                width={360}
                height={60}
                style={{
                  fontFamily: FONT_BODY,
                  fontWeight: 700,
                  color: WHITE,
                  lineHeight: 1.4,
                  ...RTL_DIR,
                }}
              >
                {s}
              </FitText>
            </div>
          ))}
        </div>
        <div
          style={{
            background: GREEN,
            borderRadius: 28,
            padding: '40px 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 32,
            boxShadow: '0 24px 80px -20px rgba(104,190,105,0.5)',
            ...RTL_DIR,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span
              style={{
                fontFamily: FONT_BODY,
                fontSize: 14,
                color: NAVY,
                fontWeight: 800,
                letterSpacing: '0.32em',
                opacity: 0.7,
              }}
            >
              CALL TO ACTION
            </span>
            <FitText
              as="span"
              maxSize={42}
              minSize={22}
              width={1100}
              height={140}
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                color: NAVY,
                lineHeight: 1.35,
                ...RTL_DIR,
              }}
            >
              {CTA.cta}
            </FitText>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
            }}
          >
            <QrPlaceholder size={140} dark={NAVY} light={WHITE} />
            <span
              style={{
                fontFamily: FONT_BODY,
                fontSize: 12,
                color: NAVY,
                fontWeight: 700,
                letterSpacing: '0.18em',
              }}
            >
              {CTA.contact}
            </span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant D — split: huge QR left, steps + CTA right  ──────────────── */

export function CtaSlideD({ index, total }: SlideProps) {
  return (
    <Frame index={index} bg={PAPER} ink={NAVY}>
      <PageChrome pageNum={index} total={total} variant="light" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '170px 96px 130px',
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          gap: 48,
          ...RTL_DIR,
        }}
      >
        {/* QR hero */}
        <div
          style={{
            background: NAVY,
            borderRadius: 28,
            padding: 48,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Corner accent */}
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 120,
              height: 8,
              background: GREEN,
            }}
          />
          <span
            style={{
              fontFamily: FONT_BODY,
              fontSize: 14,
              color: GREEN,
              fontWeight: 700,
              letterSpacing: '0.32em',
            }}
          >
            SCAN · امسح للتواصل
          </span>
          <QrPlaceholder size={460} dark={WHITE} light={NAVY} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              color: WHITE,
              fontFamily: FONT_DISPLAY,
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: 28 }}>💬</span>
            <span>{CTA.contact} · WhatsApp</span>
          </div>
        </div>
        {/* Right column */}
        <div
          style={{
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
            width={1000}
            height={220}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              color: NAVY,
              lineHeight: 1.18,
              ...RTL_DIR,
            }}
          >
            {CTA.title}
          </FitText>
          <ol
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              padding: 0,
              margin: 0,
              listStyle: 'none',
            }}
          >
            {CTA.steps.map((s, i) => (
              <li
                key={i}
                style={{
                  background: WHITE,
                  border: '1px solid rgba(0,21,99,0.10)',
                  borderRadius: 18,
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  boxShadow: '0 8px 24px -10px rgba(0, 21, 99, 0.16)',
                  ...RTL_DIR,
                }}
              >
                <span
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: GREEN,
                    color: NAVY,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 800,
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  0{i + 1}
                </span>
                <FitText
                  as="span"
                  maxSize={26}
                  minSize={16}
                  width={780}
                  height={60}
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    color: NAVY,
                    lineHeight: 1.4,
                    ...RTL_DIR,
                  }}
                >
                  {s}
                </FitText>
              </li>
            ))}
          </ol>
          <div
            style={{
              marginTop: 'auto',
              background: GREEN,
              borderRadius: 20,
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              ...RTL_DIR,
            }}
          >
            <span style={{ width: 40, height: 2, background: NAVY }} />
            <FitText
              as="span"
              maxSize={26}
              minSize={16}
              width={840}
              height={90}
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                color: NAVY,
                lineHeight: 1.4,
                ...RTL_DIR,
              }}
            >
              {CTA.cta}
            </FitText>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  Variant E — minimal centered, QR + step strip  ──────────────── */

export function CtaSlideE({ index, total }: SlideProps) {
  return (
    <Frame index={index} bg={PAPER} ink={NAVY}>
      <PageChrome pageNum={index} total={total} variant="light" />
      {/* Faint logo watermark */}
      <img
        src="/brands/uniex/logos/iconNavy.svg"
        alt=""
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 1100,
          opacity: 0.04,
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
          alignItems: 'center',
          justifyContent: 'center',
          gap: 36,
          ...RTL_DIR,
        }}
      >
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            color: GREEN,
            fontWeight: 700,
            letterSpacing: '0.32em',
            textAlign: 'center',
          }}
        >
          NEXT STEP · الخطوة التالية
        </span>
        <FitText
          as="div"
          maxSize={108}
          minSize={48}
          width={SLIDE_WIDTH - 240}
          height={220}
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            color: NAVY,
            lineHeight: 1.18,
            textAlign: 'center',
            ...RTL_DIR,
          }}
        >
          {CTA.title}
        </FitText>
        {/* QR + CTA hero */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 36,
            background: WHITE,
            border: '1px solid rgba(0,21,99,0.10)',
            borderRadius: 28,
            padding: '28px 36px',
            boxShadow: '0 24px 60px -20px rgba(0,21,99,0.22)',
            ...RTL_DIR,
          }}
        >
          <QrPlaceholder size={180} dark={NAVY} light={WHITE} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxWidth: 760,
            }}
          >
            <span
              style={{
                fontFamily: FONT_BODY,
                fontSize: 14,
                color: GREEN,
                fontWeight: 700,
                letterSpacing: '0.32em',
              }}
            >
              {CTA.contact}
            </span>
            <FitText
              as="span"
              maxSize={36}
              minSize={20}
              width={760}
              height={140}
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                color: NAVY,
                lineHeight: 1.35,
                ...RTL_DIR,
              }}
            >
              {CTA.cta}
            </FitText>
          </div>
        </div>
        {/* Step strip — small */}
        <div
          style={{
            display: 'flex',
            gap: 14,
            marginTop: 12,
          }}
        >
          {CTA.steps.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 22px',
                background: WHITE,
                border: '1px solid rgba(0,21,99,0.12)',
                borderRadius: 999,
                ...RTL_DIR,
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: GREEN,
                  color: NAVY,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                0{i + 1}
              </span>
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  color: NAVY,
                  fontSize: 18,
                }}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ────────────────  registry  ──────────────── */

export const CTA_VARIANTS = {
  A: CtaSlideA,
  B: CtaSlideB,
  C: CtaSlideC,
  D: CtaSlideD,
  E: CtaSlideE,
} as const;

export type CtaVariantKey = keyof typeof CTA_VARIANTS;
