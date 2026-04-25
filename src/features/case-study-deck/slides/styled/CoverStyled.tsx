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

    case 'minimal':
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: style.spacing.pad }}>
          <div style={{ width: 64, height: style.spacing.rule, background: surface.accent, marginBottom: 80 }} />
          <span
            style={{
              fontFamily: fonts.heading,
              fontWeight: style.typography.headingWeight,
              fontSize: headingSize(style, 140),
              letterSpacing: '-0.03em',
              color: surface.ink,
            }}
          >
            {profile.name}
          </span>
          <div style={{ marginTop: 64, width: 64, height: style.spacing.rule, background: surface.accent }} />
          <Body profile={profile} size={12} color={surface.ink} style={{ marginTop: 40, letterSpacing: '0.4em', textTransform: 'uppercase', opacity: 0.55 }}>
            Brand Guideline · Edition 01
          </Body>
        </div>
      );

    case 'swiss':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: style.spacing.pad, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16, alignItems: 'end' }}>
          <div style={{ gridColumn: '1 / 7', gridRow: 1, alignSelf: 'start', marginTop: 180 }}>
            <Body profile={profile} size={14} color={surface.ink} style={{ lineHeight: 1.55, opacity: 0.78, maxWidth: 460 }}>
              {tagline}
            </Body>
          </div>
          <div style={{ gridColumn: '1 / 13', gridRow: 2 }}>
            <span style={{ fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, fontSize: headingSize(style, 320), lineHeight: 0.86, letterSpacing: style.typography.headingTracking, color: surface.ink }}>
              {profile.name}.
            </span>
          </div>
        </div>
      );

    case 'brutalist':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: style.spacing.pad, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ marginTop: 110, paddingBottom: 32, borderBottom: `4px solid ${surface.ink}` }}>
            <span
              style={{
                fontFamily: fonts.heading,
                fontWeight: style.typography.headingWeight,
                fontSize: headingSize(style, 280),
                lineHeight: 0.85,
                letterSpacing: '-0.04em',
                color: surface.ink,
                textTransform: 'uppercase',
                display: 'block',
              }}
            >
              {profile.name}
            </span>
            <Body profile={profile} size={14} color={surface.ink} style={{ marginTop: 24, fontFamily: fonts.body, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85 }}>
              [CASE STUDY · 01] {tagline}
            </Body>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 100 }}>
            {['BRAND', 'STRATEGY', 'IDENTITY', 'TEMPLATE'].map((tag) => (
              <span key={tag} style={{ fontFamily: fonts.body, fontSize: 12, padding: '6px 14px', border: `2px solid ${surface.ink}`, color: surface.ink, letterSpacing: '0.08em' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      );

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

    case 'technical':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: style.spacing.pad, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 48, alignItems: 'start' }}>
          <div style={{ marginTop: 110 }}>
            <Body profile={profile} size={11} color={surface.ink} style={{ fontFamily: fonts.body, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 18 }}>
              Document · brand-spec/{profile.id.slice(0, 6)}
            </Body>
            <span
              style={{
                fontFamily: fonts.heading,
                fontWeight: style.typography.headingWeight,
                fontSize: headingSize(style, 200),
                lineHeight: 0.9,
                letterSpacing: style.typography.headingTracking,
                color: surface.ink,
                display: 'block',
              }}
            >
              {profile.name} {' '}<span style={{ color: surface.accent }}>/</span> Brand Document
            </span>
            <Body profile={profile} size={14} color={surface.ink} style={{ opacity: 0.7, marginTop: 28, maxWidth: 780, lineHeight: 1.6 }}>
              {tagline}
            </Body>
          </div>
          <div style={{ marginTop: 110, padding: 24, border: `1px solid ${surface.border}`, fontFamily: fonts.body, color: surface.ink, fontSize: 12, lineHeight: 1.85 }}>
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

    case 'magazine': {
      const region = contentRegion(style);
      // Reserve space for masthead (top) and credit caption (bottom).
      const heroWidth = region.width;
      const heroHeight = region.height - 100; // ~100px for the credit row + breathing
      return (
        <div style={{ position: 'absolute', inset: 0, padding: style.spacing.pad, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          {/* Masthead */}
          <div style={{ position: 'absolute', top: 130, left: style.spacing.pad, right: style.spacing.pad, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: `2px solid ${surface.ink}`, paddingBottom: 16 }}>
            <span style={{ fontFamily: fonts.heading, fontSize: 36, fontWeight: 700, color: surface.ink, letterSpacing: '-0.02em' }}>The {profile.name} Quarterly</span>
            <Body profile={profile} size={11} color={surface.ink} style={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7 }}>
              Issue 01 · Brand Identity
            </Body>
          </div>
          {/* Main hero — auto-fits the tagline to the available region. */}
          <div style={{ marginBottom: 200 }}>
            <FitText
              maxSize={headingSize(style, 200)}
              minSize={48}
              width={heroWidth}
              height={heroHeight}
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
            <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 56, height: 1, background: surface.accent }} />
              <Body profile={profile} size={14} color={surface.ink} style={{ letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: fonts.body }}>
                A Brand Document by {credit}
              </Body>
            </div>
          </div>
        </div>
      );
    }

    case 'playful':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: style.spacing.pad, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 36 }}>
            <span style={{ width: 32, height: 32, borderRadius: 999, background: surface.accent }} />
            <Body profile={profile} size={14} color={surface.ink} style={{ letterSpacing: '0.32em', textTransform: 'uppercase', opacity: 0.7 }}>
              Hello, we are {profile.name}
            </Body>
            <span style={{ width: 32, height: 32, borderRadius: 999, background: shiftLightness(surface.accent, 0.18) }} />
          </div>
          <span
            style={{
              fontFamily: fonts.heading,
              fontWeight: style.typography.headingWeight,
              fontSize: headingSize(style, 280),
              lineHeight: 0.86,
              letterSpacing: style.typography.headingTracking,
              color: surface.ink,
              transform: 'rotate(-2.5deg)',
            }}
          >
            {profile.name}!
          </span>
          <Body profile={profile} size={22} color={surface.ink} style={{ marginTop: 32, opacity: 0.85, maxWidth: 800, lineHeight: 1.4 }}>
            {tagline}
          </Body>
        </div>
      );

    case 'modern':
    default:
      return (
        <div style={{ position: 'absolute', inset: 0, padding: style.spacing.pad, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28, maxWidth: 1300 }}>
          <Body profile={profile} size={13} color={surface.ink} style={{ opacity: 0.55, letterSpacing: style.typography.eyebrowTracking, textTransform: 'uppercase' }}>
            Brand Document · 01
          </Body>
          <span
            style={{
              fontFamily: fonts.heading,
              fontWeight: style.typography.headingWeight,
              fontSize: headingSize(style, 160),
              lineHeight: 1.0,
              letterSpacing: style.typography.headingTracking,
              color: surface.ink,
            }}
          >
            {profile.name}
            <span style={{ color: surface.accent }}>.</span>
          </span>
          <Body profile={profile} size={22} color={surface.ink} style={{ opacity: 0.7, lineHeight: 1.45, maxWidth: 800 }}>
            {tagline}
          </Body>
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
