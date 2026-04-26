/**
 * Cover slide — 5 visual variants.
 * All read from COVER content in `../uniexPitchContent`. Each looks
 * fundamentally different (layout, palette, image usage) but speaks
 * the same words. Variant A is the existing implementation extracted
 * verbatim; B–E are new compositions.
 */

import { FitText } from '@/features/case-study-deck/styles/FitText';
import { COVER } from '../uniexPitchContent';
import { ConnectedLaptop, GlobeWithFlags } from '../illustrations';
import {
  FONT_BODY,
  FONT_DISPLAY,
  Frame,
  GREEN,
  ICON_GREEN,
  ICON_NAVY,
  LOGO_WHITE,
  NAVY,
  PageChrome,
  PAPER,
  RTL_DIR,
  SLIDE_WIDTH,
  type SlideProps,
  WHITE,
} from './_shared';

/* ─────────────  A — Navy flood + huge headline (current)  ───────────── */

export function CoverVariantA({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="flood">
      <img
        src={ICON_GREEN}
        alt=""
        style={{ position: 'absolute', top: -120, right: -120, width: 720, opacity: 0.16, filter: 'blur(0.5px)' }}
      />
      <PageChrome pageNum={index} total={total} section="تقديم" variant="flood" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '180px 96px 130px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          ...RTL_DIR,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, color: GREEN, fontSize: 20, letterSpacing: '0.18em', fontWeight: 600 }}>
          <span>{COVER.brand} · uniex</span>
          <span style={{ width: 36, height: 1, background: GREEN }} />
        </div>
        <div>
          <FitText
            as="div"
            maxSize={150}
            minSize={56}
            width={SLIDE_WIDTH - 192}
            height={520}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              lineHeight: 1.18,
              color: WHITE,
              letterSpacing: '-0.01em',
              ...RTL_DIR,
            }}
          >
            {COVER.headline}
          </FitText>
          <div style={{ marginTop: 36, display: 'flex', alignItems: 'flex-start', gap: 24, ...RTL_DIR }}>
            <span style={{ marginTop: 14, width: 80, height: 4, background: GREEN, flexShrink: 0 }} />
            <FitText
              as="div"
              maxSize={32}
              minSize={16}
              width={1200}
              height={150}
              style={{ fontFamily: FONT_BODY, fontWeight: 400, lineHeight: 1.7, color: 'rgba(255,255,255,0.86)', ...RTL_DIR }}
            >
              {COVER.subhead}
            </FitText>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: FONT_BODY, fontSize: 18, color: 'rgba(255,255,255,0.65)' }}>
          <span style={{ color: GREEN, fontWeight: 700, letterSpacing: '0.16em' }}>{COVER.tag}</span>
          <span>Pitch Deck · {new Date().getFullYear()}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  B — Split: navy left half + globe-person right half  ───────────── */

export function CoverVariantB({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="flood">
      <PageChrome pageNum={index} total={total} section="تقديم" variant="flood" />
      {/* Right half: globe-with-flags illustration */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: SLIDE_WIDTH * 0.46,
          height: '100%',
          background: `linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,21,99,0.4) 100%), ${PAPER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <GlobeWithFlags size={SLIDE_WIDTH * 0.5} transparent style={{ marginRight: '-6%' }} />
      </div>
      {/* Tint over the image to push toward navy/green family */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: SLIDE_WIDTH * 0.46,
          height: '100%',
          background: `linear-gradient(270deg, rgba(0,21,99,0) 0%, rgba(0,21,99,0.55) 100%)`,
          pointerEvents: 'none',
        }}
      />
      {/* Left half content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '170px 96px 130px',
          width: SLIDE_WIDTH * 0.6,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          ...RTL_DIR,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <img src={LOGO_WHITE} alt="uniex" style={{ height: 42 }} />
          <span style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.45)' }} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 600, color: GREEN, letterSpacing: '0.32em' }}>{COVER.brandSub.toUpperCase()}</span>
        </div>
        <div>
          <FitText
            as="div"
            maxSize={96}
            minSize={42}
            width={SLIDE_WIDTH * 0.6 - 192}
            height={420}
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, lineHeight: 1.2, color: WHITE, ...RTL_DIR }}
          >
            {COVER.headline}
          </FitText>
          <div style={{ marginTop: 28, display: 'flex', gap: 18, alignItems: 'flex-start', ...RTL_DIR }}>
            <span style={{ marginTop: 12, width: 60, height: 3, background: GREEN, flexShrink: 0 }} />
            <FitText
              as="div"
              maxSize={24}
              minSize={14}
              width={SLIDE_WIDTH * 0.6 - 280}
              height={170}
              style={{ fontFamily: FONT_BODY, fontWeight: 400, lineHeight: 1.7, color: 'rgba(255,255,255,0.84)', ...RTL_DIR }}
            >
              {COVER.subhead}
            </FitText>
          </div>
        </div>
        <div style={{ color: GREEN, fontFamily: FONT_BODY, fontSize: 20, fontWeight: 700, letterSpacing: '0.18em' }}>{COVER.tag}</div>
      </div>
    </Frame>
  );
}

/* ─────────────  C — Paper canvas + laptop hero (full-bleed bottom)  ───────────── */

export function CoverVariantC({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome pageNum={index} total={total} section="تقديم" variant="light" />
      <div style={{ position: 'absolute', inset: 0, padding: '170px 96px 0', display: 'flex', flexDirection: 'column', ...RTL_DIR }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 700, color: GREEN, letterSpacing: '0.32em' }}>UNIEX · {COVER.brand}</span>
          <span style={{ width: 36, height: 1, background: GREEN }} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 18, color: 'rgba(0,21,99,0.55)', letterSpacing: '0.18em' }}>{COVER.tag}</span>
        </div>
        <FitText
          as="div"
          maxSize={104}
          minSize={48}
          width={SLIDE_WIDTH - 192}
          height={300}
          style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, lineHeight: 1.18, color: NAVY, ...RTL_DIR }}
        >
          {COVER.headline}
        </FitText>
        <div style={{ marginTop: 22, display: 'flex', gap: 22, alignItems: 'flex-start', ...RTL_DIR }}>
          <span style={{ marginTop: 14, width: 70, height: 4, background: GREEN, flexShrink: 0 }} />
          <FitText
            as="div"
            maxSize={24}
            minSize={14}
            width={1300}
            height={120}
            style={{ fontFamily: FONT_BODY, fontWeight: 500, lineHeight: 1.7, color: 'rgba(0,21,99,0.78)', ...RTL_DIR }}
          >
            {COVER.subhead}
          </FitText>
        </div>
      </div>
      {/* Full-bleed bottom hero: laptop illustration */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 360,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          overflow: 'hidden',
          background: GREEN,
        }}
      >
        <ConnectedLaptop size={680} transparent style={{ marginTop: -90 }} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 360,
          height: 60,
          background: `linear-gradient(180deg, ${PAPER} 0%, rgba(245,247,251,0) 100%)`,
        }}
      />
    </Frame>
  );
}

/* ─────────────  D — Green flood + bold magazine, navy iconmark  ───────────── */

export function CoverVariantD({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="flood" bg={GREEN} ink={NAVY}>
      <PageChrome pageNum={index} total={total} section="تقديم" variant="flood" />
      {/* Navy iconmark watermark, large, off-canvas */}
      <img
        src={ICON_NAVY}
        alt=""
        style={{ position: 'absolute', bottom: -200, right: -200, width: 880, opacity: 0.12 }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '180px 96px 130px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          ...RTL_DIR,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: NAVY }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 800, letterSpacing: '0.32em' }}>EDITION · 01</span>
          <span style={{ width: 36, height: 1, background: NAVY }} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 700, letterSpacing: '0.18em' }}>{COVER.brand} / uniex</span>
        </div>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, color: NAVY, marginBottom: 18, letterSpacing: '0.06em' }}>
            // {new Date().getFullYear()} pitch
          </div>
          <FitText
            as="div"
            maxSize={140}
            minSize={48}
            width={SLIDE_WIDTH - 192}
            height={460}
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, lineHeight: 1.1, color: NAVY, letterSpacing: '-0.02em', ...RTL_DIR }}
          >
            {COVER.headline}
          </FitText>
          <div
            style={{
              marginTop: 32,
              padding: '20px 28px',
              background: NAVY,
              color: WHITE,
              display: 'inline-flex',
              alignItems: 'flex-start',
              gap: 18,
              borderRadius: 6,
              maxWidth: 1500,
              ...RTL_DIR,
            }}
          >
            <span style={{ width: 4, height: 60, background: GREEN, flexShrink: 0, marginTop: 4 }} />
            <FitText
              as="div"
              maxSize={22}
              minSize={14}
              width={1380}
              height={100}
              style={{ fontFamily: FONT_BODY, fontWeight: 500, lineHeight: 1.65, color: 'rgba(255,255,255,0.92)', ...RTL_DIR }}
            >
              {COVER.subhead}
            </FitText>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: NAVY, fontFamily: FONT_BODY, fontSize: 18, fontWeight: 700 }}>
          <span style={{ letterSpacing: '0.32em' }}>{COVER.tag}</span>
          <span style={{ letterSpacing: '0.18em' }}>PITCH · {new Date().getFullYear()}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────  E — Minimal white canvas, tiny logo, huge centered  ───────────── */

export function CoverVariantE({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light" bg={WHITE}>
      <PageChrome pageNum={index} total={total} section="تقديم" variant="light" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '170px 96px 130px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <img src={ICON_GREEN} alt="" style={{ width: 88, marginBottom: 36, opacity: 0.95 }} />
        <div style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 800, color: GREEN, letterSpacing: '0.4em', marginBottom: 24 }}>
          {COVER.brand.toUpperCase()} · UNIEX
        </div>
        <FitText
          as="div"
          maxSize={120}
          minSize={48}
          width={SLIDE_WIDTH - 280}
          height={420}
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            lineHeight: 1.22,
            color: NAVY,
            letterSpacing: '-0.005em',
            direction: 'rtl',
            textAlign: 'center',
          }}
        >
          {COVER.headline}
        </FitText>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '32px 0 28px',
            gap: 14,
          }}
        >
          <span style={{ width: 60, height: 3, background: GREEN, borderRadius: 2 }} />
          <span style={{ width: 8, height: 8, borderRadius: 999, background: GREEN }} />
          <span style={{ width: 60, height: 3, background: GREEN, borderRadius: 2 }} />
        </div>
        <FitText
          as="div"
          maxSize={22}
          minSize={14}
          width={1200}
          height={140}
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 500,
            lineHeight: 1.75,
            color: 'rgba(0,21,99,0.72)',
            direction: 'rtl',
            textAlign: 'center',
          }}
        >
          {COVER.subhead}
        </FitText>
        <div style={{ marginTop: 28, fontFamily: FONT_BODY, fontSize: 20, fontWeight: 700, color: GREEN, letterSpacing: '0.32em' }}>{COVER.tag}</div>
      </div>
    </Frame>
  );
}

export const COVER_VARIANTS = {
  A: CoverVariantA,
  B: CoverVariantB,
  C: CoverVariantC,
  D: CoverVariantD,
  E: CoverVariantE,
};

export type CoverVariantKey = keyof typeof COVER_VARIANTS;
