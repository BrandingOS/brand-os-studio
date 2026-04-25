/**
 * Style-aware Cover slide.
 *
 * One renderer that switches layout based on the active deck style. The
 * 10 styles produce 10 distinctly different cover compositions while
 * sharing the same brand inputs (name, tagline, palette, logo).
 */

import type { CSSProperties } from 'react';
import type { BrandProfile, SlideOverrides } from '../../types';
import type { DeckStyle } from '../../styles';
import { resolveSurface, resolveBackground, resolveFonts, headingSize, bodySize, fitHeadingSize, FitText, contentRegion, CANVAS } from '../../styles';
import { TopBar, BottomBar, CornerNumeral } from '../../styles/chrome';
import { LogoMark, TMark, Body } from '../shared';
import { SlideFrame } from '../../SlideFrame';
import { shiftLightness } from '../../utils';

export interface StyledSlideProps {
  index: number;
  profile: BrandProfile;
  style: DeckStyle;
  overrides?: SlideOverrides;
  total: number;
}

export function CoverStyled(props: StyledSlideProps) {
  const { index, profile, style, overrides, total } = props;
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const pageNum = String(index + 1).padStart(2, '0');
  const sectionLabel = 'Cover';

  const tagline = overrides?.headline ?? profile.tagline;
  const credit = overrides?.credit ?? 'Designed with brandOS';

  return (
    <SlideFrame
      index={index}
      archetype="cover"
      variant={style.id}
      background={bg}
      ink={surface.ink}
    >
      <CoverBody style={style} profile={profile} surface={surface} fonts={fonts} tagline={tagline} credit={credit} />
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <CornerNumeral style={style} profile={profile} surface={surface} pageNum={pageNum} />
    </SlideFrame>
  );
}

/* ─────────────────────────  per-style cover bodies  ─────────────────────── */

function CoverBody({
  style,
  profile,
  surface,
  fonts,
  tagline,
  credit,
}: {
  style: DeckStyle;
  profile: BrandProfile;
  surface: ReturnType<typeof resolveSurface>;
  fonts: ReturnType<typeof resolveFonts>;
  tagline: string;
  credit: string;
}) {
  const wordmarkColor = surface.ink === '#FFFFFF' ? 'white' : 'black';

  switch (style.id) {
    case 'bold': {
      const region = contentRegion(style);
      const wordmarkW = Math.min(region.width, 1500);
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
            <FitText
              as="span"
              maxSize={headingSize(style, 420)}
              minSize={120}
              width={wordmarkW}
              height={520}
              style={{
                fontFamily: fonts.heading,
                fontWeight: style.typography.headingWeight,
                lineHeight: 0.85,
                letterSpacing: style.typography.headingTracking,
                color: surface.ink,
                textTransform: style.typography.headingTransform === 'uppercase' ? 'uppercase' : 'none',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {profile.name}
            </FitText>
            <Body profile={profile} size={20} color={surface.ink} style={{ opacity: 0.85, maxWidth: 900, textAlign: 'center', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              {tagline}
            </Body>
          </div>
        </div>
      );
    }

    case 'editorial': {
      const region = contentRegion(style);
      const rightColW = Math.round((region.width - style.spacing.columnGap) * 0.58);
      const nameH = Math.round(region.height * 0.5);
      const taglineH = region.height - nameH - 32;
      return (
        <div style={{ position: 'absolute', inset: 0, padding: style.spacing.pad, display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: style.spacing.columnGap, alignItems: 'end' }}>
          <div style={{ alignSelf: 'start', marginTop: 200 }}>
            <Body profile={profile} size={12} color={surface.ink} style={{ letterSpacing: '0.32em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 28 }}>
              The Brand Document · Vol. 01
            </Body>
            <Body profile={profile} size={16} color={surface.ink} style={{ lineHeight: 1.6, opacity: 0.75, maxWidth: 380 }}>
              A study of identity, purpose, and the system that holds them together. Everything {profile.name} stands for, written down.
            </Body>
          </div>
          <div>
            <FitText
              maxSize={headingSize(style, 260)}
              minSize={64}
              width={rightColW}
              height={nameH}
              style={{
                fontFamily: fonts.heading,
                fontWeight: style.typography.headingWeight,
                lineHeight: 0.92,
                letterSpacing: style.typography.headingTracking,
                color: surface.ink,
              }}
            >
              {profile.name}.
            </FitText>
            <FitText
              as="div"
              maxSize={headingSize(style, 48)}
              minSize={20}
              width={rightColW}
              height={taglineH}
              style={{
                marginTop: 32,
                fontFamily: fonts.heading,
                color: surface.ink,
                opacity: 0.65,
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
              }}
            >
              {tagline}
            </FitText>
          </div>
        </div>
      );
    }

    case 'minimal': {
      const region = contentRegion(style);
      const nameW = Math.min(region.width, 1500);
      const nameH = Math.min(region.height - 260, 320);
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: style.spacing.pad }}>
          <div style={{ width: 64, height: style.spacing.rule, background: surface.accent, marginBottom: 80 }} />
          <FitText
            as="span"
            maxSize={headingSize(style, 140)}
            minSize={48}
            width={nameW}
            height={nameH}
            style={{
              fontFamily: fonts.heading,
              fontWeight: style.typography.headingWeight,
              letterSpacing: '-0.03em',
              color: surface.ink,
              lineHeight: 1.0,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {profile.name}
          </FitText>
          <div style={{ marginTop: 64, width: 64, height: style.spacing.rule, background: surface.accent }} />
          <Body profile={profile} size={12} color={surface.ink} style={{ marginTop: 40, letterSpacing: '0.4em', textTransform: 'uppercase', opacity: 0.55 }}>
            Brand Guideline · Edition 01
          </Body>
        </div>
      );
    }

    case 'swiss': {
      const region = contentRegion(style);
      const taglineW = Math.round(region.width * 0.5);
      const nameH = Math.round(region.height * 0.55);
      return (
        <div
          style={{
            position: 'absolute',
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <FitText
            as="div"
            maxSize={headingSize(style, 18)}
            minSize={11}
            width={taglineW}
            height={140}
            style={{
              fontFamily: fonts.body,
              lineHeight: 1.55,
              color: surface.ink,
              opacity: 0.78,
            }}
          >
            {tagline}
          </FitText>
          <FitText
            as="div"
            maxSize={headingSize(style, 320)}
            minSize={80}
            width={region.width}
            height={nameH}
            style={{
              fontFamily: fonts.heading,
              fontWeight: style.typography.headingWeight,
              lineHeight: 0.86,
              letterSpacing: style.typography.headingTracking,
              color: surface.ink,
            }}
          >
            {profile.name}.
          </FitText>
        </div>
      );
    }

    case 'brutalist': {
      const region = contentRegion(style);
      // Reserve room for the chip row (~90) and the tagline body (~120).
      const nameH = region.height - 240;
      return (
        <div
          style={{
            position: 'absolute',
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ paddingBottom: 32, borderBottom: `4px solid ${surface.ink}` }}>
            <FitText
              as="div"
              maxSize={headingSize(style, 280)}
              minSize={64}
              width={region.width}
              height={nameH}
              style={{
                fontFamily: fonts.heading,
                fontWeight: style.typography.headingWeight,
                lineHeight: 0.85,
                letterSpacing: '-0.04em',
                color: surface.ink,
                textTransform: 'uppercase',
              }}
            >
              {profile.name}
            </FitText>
            <FitText
              as="div"
              maxSize={18}
              minSize={11}
              width={region.width}
              height={48}
              style={{
                marginTop: 24,
                fontFamily: fonts.body,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                opacity: 0.85,
                color: surface.ink,
              }}
            >
              [CASE STUDY · 01] {tagline}
            </FitText>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {['BRAND', 'STRATEGY', 'IDENTITY', 'TEMPLATE'].map((tag) => (
              <span key={tag} style={{ fontFamily: fonts.body, fontSize: 12, padding: '6px 14px', border: `2px solid ${surface.ink}`, color: surface.ink, letterSpacing: '0.08em' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      );
    }

    case 'monolith': {
      const region = contentRegion(style);
      // Reserve space for the eyebrow above and the credit row below.
      const heroHeight = region.height - 180;
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: style.spacing.pad, paddingTop: 200, paddingBottom: 200 }}>
          <Body profile={profile} size={12} color={surface.accent} style={{ letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 40 }}>
            Brand Doc · {profile.name}
          </Body>
          <FitText
            maxSize={headingSize(style, 240)}
            minSize={56}
            width={region.width}
            height={heroHeight}
            style={{
              fontFamily: fonts.heading,
              fontWeight: style.typography.headingWeight,
              lineHeight: 0.92,
              letterSpacing: style.typography.headingTracking,
              color: surface.ink,
            }}
          >
            {tagline}.
          </FitText>
          <div style={{ marginTop: 56, display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 80, height: 1, background: surface.accent }} />
            <Body profile={profile} size={14} color={surface.ink} style={{ opacity: 0.55, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              {credit}
            </Body>
          </div>
        </div>
      );
    }

    case 'technical': {
      const region = contentRegion(style);
      const metaW = 360;
      const colGap = 48;
      const leftW = region.width - metaW - colGap;
      const nameH = Math.round(region.height * 0.5);
      const taglineH = region.height - nameH - 70;
      return (
        <div
          style={{
            position: 'absolute',
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
            display: 'grid',
            gridTemplateColumns: `1fr ${metaW}px`,
            gap: colGap,
            alignItems: 'start',
          }}
        >
          <div>
            <Body profile={profile} size={11} color={surface.ink} style={{ fontFamily: fonts.body, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 18 }}>
              Document · brand-spec/{profile.id.slice(0, 6)}
            </Body>
            <FitText
              as="div"
              maxSize={headingSize(style, 200)}
              minSize={48}
              width={leftW}
              height={nameH}
              style={{
                fontFamily: fonts.heading,
                fontWeight: style.typography.headingWeight,
                lineHeight: 0.9,
                letterSpacing: style.typography.headingTracking,
                color: surface.ink,
              }}
            >
              {profile.name} <span style={{ color: surface.accent }}>/</span> Brand Document
            </FitText>
            <FitText
              as="div"
              maxSize={20}
              minSize={11}
              width={leftW}
              height={taglineH}
              style={{
                opacity: 0.7,
                marginTop: 28,
                lineHeight: 1.6,
                color: surface.ink,
                fontFamily: fonts.body,
              }}
            >
              {tagline}
            </FitText>
          </div>
          <div style={{ padding: 24, border: `1px solid ${surface.border}`, fontFamily: fonts.body, color: surface.ink, fontSize: 12, lineHeight: 1.85 }}>
            <div style={{ opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 18 }}>// META</div>
            <div>id&nbsp;&nbsp;&nbsp;{profile.id.slice(0, 8)}</div>
            <div>mode&nbsp;{profile.mode}</div>
            <div>color&nbsp;{profile.palette.primary}</div>
            <div>type&nbsp;&nbsp;{profile.typography.headingFamily}</div>
            <div style={{ opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 18, marginBottom: 18 }}>// REVISION</div>
            <div>v 01.00 · {new Date().toISOString().slice(0, 10)}</div>
          </div>
        </div>
      );
    }

    case 'magazine': {
      // Magazine has chrome (tabular topbar + bottombar) handle masthead/meta.
      // Body owns CONTENT only — sits strictly inside contentRegion. The
      // hero auto-fits the tagline; the credit row is reserved space below.
      const region = contentRegion(style);
      const creditH = 80;
      const heroH = region.height - creditH - 20;
      return (
        <div
          style={{
            position: 'absolute',
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          }}
        >
          <FitText
            maxSize={headingSize(style, 200)}
            minSize={48}
            width={region.width}
            height={heroH}
            style={{
              fontFamily: fonts.heading,
              fontWeight: style.typography.headingWeight,
              lineHeight: 0.96,
              letterSpacing: style.typography.headingTracking,
              color: surface.ink,
              fontStyle: 'italic',
            }}
          >
            {tagline}
          </FitText>
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 56, height: 1, background: surface.accent }} />
            <Body profile={profile} size={14} color={surface.ink} style={{ letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: fonts.body }}>
              A Brand Document by {credit}
            </Body>
          </div>
        </div>
      );
    }

    case 'playful': {
      const region = contentRegion(style);
      const nameW = Math.min(region.width, 1500);
      const nameH = Math.round(region.height * 0.5);
      const taglineH = Math.min(160, region.height - nameH - 140);
      return (
        <div
          style={{
            position: 'absolute',
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 36 }}>
            <span style={{ width: 32, height: 32, borderRadius: 999, background: surface.accent }} />
            <Body profile={profile} size={14} color={surface.ink} style={{ letterSpacing: '0.32em', textTransform: 'uppercase', opacity: 0.7 }}>
              Hello, we are {profile.name}
            </Body>
            <span style={{ width: 32, height: 32, borderRadius: 999, background: shiftLightness(surface.accent, 0.18) }} />
          </div>
          <FitText
            as="span"
            maxSize={headingSize(style, 280)}
            minSize={72}
            width={nameW}
            height={nameH}
            style={{
              fontFamily: fonts.heading,
              fontWeight: style.typography.headingWeight,
              lineHeight: 0.86,
              letterSpacing: style.typography.headingTracking,
              color: surface.ink,
              transform: 'rotate(-2.5deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            {profile.name}!
          </FitText>
          <FitText
            as="div"
            maxSize={26}
            minSize={14}
            width={Math.min(region.width, 900)}
            height={taglineH}
            style={{
              marginTop: 32,
              opacity: 0.85,
              lineHeight: 1.4,
              color: surface.ink,
              fontFamily: fonts.body,
              textAlign: 'center',
            }}
          >
            {tagline}
          </FitText>
        </div>
      );
    }

    case 'modern':
    default: {
      const region = contentRegion(style);
      const contentW = Math.min(region.width, 1300);
      // Reserve eyebrow ~40, gap ~28, name ~half, gap, tagline ~120, gap, button row ~60.
      const nameH = Math.round(region.height * 0.42);
      const taglineH = Math.max(120, region.height - nameH - 220);
      return (
        <div
          style={{
            position: 'absolute',
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 28,
          }}
        >
          <Body profile={profile} size={13} color={surface.ink} style={{ opacity: 0.55, letterSpacing: style.typography.eyebrowTracking, textTransform: 'uppercase' }}>
            Brand Document · 01
          </Body>
          <FitText
            as="div"
            maxSize={headingSize(style, 160)}
            minSize={48}
            width={contentW}
            height={nameH}
            style={{
              fontFamily: fonts.heading,
              fontWeight: style.typography.headingWeight,
              lineHeight: 1.0,
              letterSpacing: style.typography.headingTracking,
              color: surface.ink,
            }}
          >
            {profile.name}
            <span style={{ color: surface.accent }}>.</span>
          </FitText>
          <FitText
            as="div"
            maxSize={26}
            minSize={14}
            width={Math.min(contentW, 900)}
            height={taglineH}
            style={{
              opacity: 0.7,
              lineHeight: 1.45,
              color: surface.ink,
              fontFamily: fonts.body,
            }}
          >
            {tagline}
          </FitText>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ padding: '8px 18px', borderRadius: 999, border: `1px solid ${surface.accent}`, color: surface.accent, fontFamily: fonts.body, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              View Guidelines
            </span>
            <Body profile={profile} size={12} color={surface.ink} style={{ opacity: 0.55, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              {credit}
            </Body>
          </div>
        </div>
      );
    }
  }
}
