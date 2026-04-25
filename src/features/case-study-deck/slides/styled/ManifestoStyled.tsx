/**
 * Style-aware Manifesto slide.
 * Big quote / mission statement, styled per active deck style.
 */

import type { CSSProperties } from 'react';
import { SlideFrame } from '../../SlideFrame';
import { resolveSurface, resolveBackground, resolveFonts, headingSize, fitHeadingSize, chromeTopPad } from '../../styles';
import { TopBar, BottomBar, CornerNumeral } from '../../styles/chrome';
import { Body } from '../shared';
import { shiftLightness } from '../../utils';
import type { StyledSlideProps } from './CoverStyled';

export function ManifestoStyled({ index, profile, style, overrides, total }: StyledSlideProps) {
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const pageNum = String(index + 1).padStart(2, '0');
  const sectionLabel = 'Manifesto';

  const headline = overrides?.headline ?? profile.tagline;
  const subhead = overrides?.subhead ?? profile.mission;

  return (
    <SlideFrame index={index} archetype="manifesto" variant={style.id} background={bg} ink={surface.ink}>
      <ManifestoBody style={style} surface={surface} fonts={fonts} headline={headline} subhead={subhead} profile={profile} />
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <CornerNumeral style={style} profile={profile} surface={surface} pageNum={pageNum} />
    </SlideFrame>
  );
}

function ManifestoBody({ style, surface, fonts, headline, subhead, profile }: any) {
  const padX = style.spacing.pad;
  const topPad = chromeTopPad(style);
  const headingFs = headingSize(style, 90);

  switch (style.id) {
    case 'bold':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 130), fontWeight: style.typography.headingWeight, lineHeight: 0.95, letterSpacing: style.typography.headingTracking, color: surface.ink, maxWidth: 1500 }}>
            {headline}
          </span>
        </div>
      );

    case 'editorial':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: style.spacing.columnGap, alignItems: 'start', paddingTop: topPad }}>
          <div>
            <Body profile={profile} size={15} color={surface.ink} style={{ opacity: 0.65, lineHeight: 1.7, fontStyle: 'italic' }}>
              "What we believe, why we make, and how we make it."
            </Body>
          </div>
          <div>
            <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 84), fontWeight: style.typography.headingWeight, lineHeight: 1.06, letterSpacing: style.typography.headingTracking, color: surface.ink, fontStyle: 'italic' }}>
              "{headline}"
            </span>
            <Body profile={profile} size={18} color={surface.ink} style={{ opacity: 0.7, marginTop: 36, lineHeight: 1.65, maxWidth: 900 }}>
              {subhead}
            </Body>
          </div>
        </div>
      );

    case 'minimal':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: 48, height: 1, background: surface.accent, marginBottom: 60 }} />
          <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 78), fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.18, color: surface.ink, maxWidth: 1100 }}>
            {headline}
          </span>
          <Body profile={profile} size={16} color={surface.ink} style={{ marginTop: 56, opacity: 0.55, maxWidth: 720, lineHeight: 1.7 }}>
            {subhead}
          </Body>
        </div>
      );

    case 'swiss':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16, paddingTop: topPad, alignContent: 'start' }}>
          <span style={{ gridColumn: '1 / 13', fontFamily: fonts.heading, fontSize: headingSize(style, 110), fontWeight: style.typography.headingWeight, lineHeight: 0.96, letterSpacing: style.typography.headingTracking, color: surface.ink }}>
            {headline}
          </span>
          <Body profile={profile} size={14} color={surface.ink} style={{ gridColumn: '1 / 8', opacity: 0.7, marginTop: 32, lineHeight: 1.6 }}>
            {subhead}
          </Body>
        </div>
      );

    case 'brutalist':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: topPad, display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderTop: `4px solid ${surface.ink}`, borderBottom: `4px solid ${surface.ink}`, padding: '40px 0' }}>
            <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 120), fontWeight: style.typography.headingWeight, textTransform: 'uppercase', lineHeight: 0.94, letterSpacing: '-0.03em', color: surface.ink }}>
              {headline}
            </span>
          </div>
          <Body profile={profile} size={14} color={surface.ink} style={{ marginTop: 36, fontFamily: fonts.body, lineHeight: 1.7, maxWidth: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {subhead}
          </Body>
        </div>
      );

    case 'monolith': {
      const txt = headline.length > 88 ? headline.slice(0, 86) + '…' : headline;
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: 180, paddingBottom: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span style={{ fontFamily: fonts.heading, fontSize: fitHeadingSize(style, 130, txt, 28), fontWeight: style.typography.headingWeight, lineHeight: 1.0, letterSpacing: style.typography.headingTracking, color: surface.ink, maxWidth: 1500 }}>
            "{txt}"
          </span>
        </div>
      );
    }

    case 'technical':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: topPad, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 60 }}>
          <div>
            <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 70), fontWeight: style.typography.headingWeight, letterSpacing: style.typography.headingTracking, lineHeight: 1.1, color: surface.ink }}>
              {headline}
            </span>
            <Body profile={profile} size={13} color={surface.ink} style={{ opacity: 0.65, marginTop: 28, lineHeight: 1.7, fontFamily: fonts.body }}>
              {subhead}
            </Body>
          </div>
          <div style={{ padding: 24, border: `1px solid ${surface.border}`, fontFamily: fonts.body, fontSize: 12, color: surface.ink, lineHeight: 1.85 }}>
            <div style={{ opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>// SOURCE</div>
            <div>brand.strategy.mission</div>
            <div>profile.tagline</div>
            <div style={{ opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 22, marginBottom: 16 }}>// PRINCIPLES</div>
            {(profile.personality.length ? profile.personality : ['Clarity', 'Craft', 'Care']).slice(0, 5).map((p: string, i: number) => (
              <div key={i}>{String(i + 1).padStart(2, '0')} · {p}</div>
            ))}
          </div>
        </div>
      );

    case 'magazine':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: topPad, display: 'grid', gridTemplateColumns: '0.8fr 1.4fr', gap: style.spacing.columnGap }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 320), fontWeight: 700, lineHeight: 0.7, color: surface.accent, letterSpacing: '-0.06em' }}>
              02
            </span>
          </div>
          <div style={{ alignSelf: 'center', borderLeft: `1px solid ${surface.border}`, paddingLeft: 60 }}>
            <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 92), fontWeight: style.typography.headingWeight, lineHeight: 1.04, color: surface.ink, fontStyle: 'italic' }}>
              "{headline}"
            </span>
            <Body profile={profile} size={17} color={surface.ink} style={{ marginTop: 36, opacity: 0.7, lineHeight: 1.7, columnCount: 2, columnGap: 36 }}>
              {subhead}
            </Body>
          </div>
        </div>
      );

    case 'playful':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', left: padX, top: 200, width: 220, height: 220, background: surface.accent, borderRadius: 999, opacity: 0.18 }} />
          <div style={{ position: 'absolute', right: padX, bottom: 220, width: 160, height: 160, background: shiftLightness(surface.accent, -0.2), borderRadius: 999, opacity: 0.22 }} />
          <span style={{ position: 'relative', fontFamily: fonts.heading, fontSize: headingSize(style, 140), fontWeight: style.typography.headingWeight, lineHeight: 0.94, color: surface.ink, maxWidth: 1400, transform: 'rotate(-1deg)' }}>
            {headline}
          </span>
          <Body profile={profile} size={20} color={surface.ink} style={{ position: 'relative', marginTop: 36, opacity: 0.75, maxWidth: 1100, lineHeight: 1.5 }}>
            {subhead}
          </Body>
        </div>
      );

    case 'modern':
    default:
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: topPad, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: style.spacing.columnGap, alignContent: 'center' }}>
          <div>
            <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 86), fontWeight: style.typography.headingWeight, lineHeight: 1.05, color: surface.ink, letterSpacing: style.typography.headingTracking }}>
              {headline}
            </span>
          </div>
          <div style={{ alignSelf: 'center', paddingLeft: 32, borderLeft: `1px solid ${surface.border}` }}>
            <Body profile={profile} size={17} color={surface.ink} style={{ opacity: 0.75, lineHeight: 1.65 }}>
              {subhead}
            </Body>
            <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(profile.personality.length ? profile.personality : ['Clarity', 'Craft', 'Care']).slice(0, 4).map((p: string) => (
                <span key={p} style={{ padding: '6px 14px', borderRadius: 999, background: surface.subtle, color: surface.ink, fontFamily: fonts.body, fontSize: 12, opacity: 0.85 }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      );
  }
}
