/**
 * Style-aware Manifesto slide.
 * Big quote / mission statement, styled per active deck style.
 */

import type { CSSProperties } from 'react';
import { SlideFrame } from '../../SlideFrame';
import { resolveSurface, resolveBackground, resolveFonts, headingSize, FitText, contentRegion } from '../../styles';
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
  const region = contentRegion(style);

  switch (style.id) {
    case 'bold':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, display: 'flex', alignItems: 'center' }}>
          <FitText
            maxSize={headingSize(style, 150)}
            minSize={48}
            width={region.width}
            height={region.height}
            style={{
              fontFamily: fonts.heading,
              fontWeight: style.typography.headingWeight,
              lineHeight: 0.95,
              letterSpacing: style.typography.headingTracking,
              color: surface.ink,
            }}
          >
            {headline}
          </FitText>
        </div>
      );

    case 'editorial': {
      const colGap = style.spacing.columnGap;
      const leftW = Math.round((region.width - colGap) * 0.33);
      const rightW = region.width - colGap - leftW;
      // Reserve subhead block ~ 40% of region.height; headline gets the rest.
      const headH = Math.round(region.height * 0.55);
      const subH = region.height - headH - 36;
      return (
        <div
          style={{
            position: 'absolute',
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
            display: 'grid',
            gridTemplateColumns: `${leftW}px ${rightW}px`,
            gap: colGap,
            alignItems: 'start',
          }}
        >
          <div>
            <Body profile={profile} size={15} color={surface.ink} style={{ opacity: 0.65, lineHeight: 1.7, fontStyle: 'italic' }}>
              "What we believe, why we make, and how we make it."
            </Body>
          </div>
          <div>
            <FitText
              as="div"
              maxSize={headingSize(style, 84)}
              minSize={32}
              width={rightW}
              height={headH}
              style={{
                fontFamily: fonts.heading,
                fontWeight: style.typography.headingWeight,
                lineHeight: 1.06,
                letterSpacing: style.typography.headingTracking,
                color: surface.ink,
                fontStyle: 'italic',
              }}
            >
              "{headline}"
            </FitText>
            <FitText
              as="div"
              maxSize={20}
              minSize={12}
              width={rightW}
              height={subH}
              style={{
                opacity: 0.7,
                marginTop: 36,
                lineHeight: 1.65,
                color: surface.ink,
                fontFamily: fonts.body,
              }}
            >
              {subhead}
            </FitText>
          </div>
        </div>
      );
    }

    case 'minimal': {
      const headW = Math.min(region.width, 1100);
      const subW = Math.min(region.width, 720);
      const headH = Math.round(region.height * 0.55);
      const subH = Math.min(220, region.height - headH - 120);
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
          <div style={{ width: 48, height: 1, background: surface.accent, marginBottom: 60 }} />
          <FitText
            as="div"
            maxSize={headingSize(style, 78)}
            minSize={28}
            width={headW}
            height={headH}
            style={{
              fontFamily: fonts.heading,
              fontWeight: 300,
              letterSpacing: '-0.02em',
              lineHeight: 1.18,
              color: surface.ink,
              textAlign: 'center',
            }}
          >
            {headline}
          </FitText>
          <FitText
            as="div"
            maxSize={20}
            minSize={12}
            width={subW}
            height={subH}
            style={{
              marginTop: 56,
              opacity: 0.55,
              lineHeight: 1.7,
              color: surface.ink,
              fontFamily: fonts.body,
              textAlign: 'center',
            }}
          >
            {subhead}
          </FitText>
        </div>
      );
    }

    case 'swiss': {
      const subW = Math.round(region.width * 7 / 12);
      const headH = Math.round(region.height * 0.6);
      const subH = region.height - headH - 32;
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
            alignItems: 'flex-start',
          }}
        >
          <FitText
            as="div"
            maxSize={headingSize(style, 110)}
            minSize={36}
            width={region.width}
            height={headH}
            style={{
              fontFamily: fonts.heading,
              fontWeight: style.typography.headingWeight,
              lineHeight: 0.96,
              letterSpacing: style.typography.headingTracking,
              color: surface.ink,
            }}
          >
            {headline}
          </FitText>
          <FitText
            as="div"
            maxSize={18}
            minSize={11}
            width={subW}
            height={subH}
            style={{
              opacity: 0.7,
              marginTop: 32,
              lineHeight: 1.6,
              color: surface.ink,
              fontFamily: fonts.body,
            }}
          >
            {subhead}
          </FitText>
        </div>
      );
    }

    case 'brutalist': {
      // Headline panel ~ 55% of region; tagline gets the rest minus margin.
      const headPanelH = Math.round(region.height * 0.55);
      const headTextH = headPanelH - 80; // 40px padding top+bottom
      const subH = region.height - headPanelH - 36;
      const subW = Math.min(region.width, 1200);
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
          }}
        >
          <div style={{ borderTop: `4px solid ${surface.ink}`, borderBottom: `4px solid ${surface.ink}`, padding: '40px 0' }}>
            <FitText
              as="div"
              maxSize={headingSize(style, 120)}
              minSize={36}
              width={region.width}
              height={headTextH}
              style={{
                fontFamily: fonts.heading,
                fontWeight: style.typography.headingWeight,
                textTransform: 'uppercase',
                lineHeight: 0.94,
                letterSpacing: '-0.03em',
                color: surface.ink,
              }}
            >
              {headline}
            </FitText>
          </div>
          <FitText
            as="div"
            maxSize={18}
            minSize={11}
            width={subW}
            height={subH}
            style={{
              marginTop: 36,
              fontFamily: fonts.body,
              lineHeight: 1.7,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: surface.ink,
            }}
          >
            {subhead}
          </FitText>
        </div>
      );
    }

    case 'monolith':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: 180, paddingBottom: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FitText
            maxSize={headingSize(style, 150)}
            minSize={48}
            width={Math.min(region.width, 1500)}
            height={region.height - 100}
            style={{
              fontFamily: fonts.heading,
              fontWeight: style.typography.headingWeight,
              lineHeight: 1.0,
              letterSpacing: style.typography.headingTracking,
              color: surface.ink,
              textAlign: 'center',
            }}
          >
            "{headline}"
          </FitText>
        </div>
      );

    case 'technical': {
      const colGap = 60;
      const leftFr = 1.4;
      const rightFr = 1;
      const leftW = Math.round((region.width - colGap) * leftFr / (leftFr + rightFr));
      const rightW = region.width - colGap - leftW;
      const headH = Math.round(region.height * 0.5);
      const subH = region.height - headH - 28;
      return (
        <div
          style={{
            position: 'absolute',
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
            display: 'grid',
            gridTemplateColumns: `${leftW}px ${rightW}px`,
            gap: colGap,
          }}
        >
          <div>
            <FitText
              as="div"
              maxSize={headingSize(style, 70)}
              minSize={28}
              width={leftW}
              height={headH}
              style={{
                fontFamily: fonts.heading,
                fontWeight: style.typography.headingWeight,
                letterSpacing: style.typography.headingTracking,
                lineHeight: 1.1,
                color: surface.ink,
              }}
            >
              {headline}
            </FitText>
            <FitText
              as="div"
              maxSize={18}
              minSize={11}
              width={leftW}
              height={subH}
              style={{
                opacity: 0.65,
                marginTop: 28,
                lineHeight: 1.7,
                color: surface.ink,
                fontFamily: fonts.body,
              }}
            >
              {subhead}
            </FitText>
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
    }

    case 'magazine': {
      const colGap = style.spacing.columnGap;
      const leftFr = 0.8;
      const rightFr = 1.4;
      const leftW = Math.round((region.width - colGap) * leftFr / (leftFr + rightFr));
      const rightW = region.width - colGap - leftW - 60; // 60 left padding
      const headH = Math.round(region.height * 0.5);
      const subH = region.height - headH - 36;
      return (
        <div
          style={{
            position: 'absolute',
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
            display: 'grid',
            gridTemplateColumns: `${leftW}px 1fr`,
            gap: colGap,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 320), fontWeight: 700, lineHeight: 0.7, color: surface.accent, letterSpacing: '-0.06em' }}>
              02
            </span>
          </div>
          <div style={{ alignSelf: 'center', borderLeft: `1px solid ${surface.border}`, paddingLeft: 60 }}>
            <FitText
              as="div"
              maxSize={headingSize(style, 92)}
              minSize={32}
              width={rightW}
              height={headH}
              style={{
                fontFamily: fonts.heading,
                fontWeight: style.typography.headingWeight,
                lineHeight: 1.04,
                color: surface.ink,
                fontStyle: 'italic',
              }}
            >
              "{headline}"
            </FitText>
            <FitText
              as="div"
              maxSize={20}
              minSize={12}
              width={rightW}
              height={subH}
              style={{
                marginTop: 36,
                opacity: 0.7,
                lineHeight: 1.7,
                color: surface.ink,
                fontFamily: fonts.body,
              }}
            >
              {subhead}
            </FitText>
          </div>
        </div>
      );
    }

    case 'playful': {
      const headW = Math.min(region.width, 1400);
      const subW = Math.min(region.width, 1100);
      const headH = Math.round(region.height * 0.55);
      const subH = region.height - headH - 36;
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
          }}
        >
          <div style={{ position: 'absolute', left: 0, top: 80, width: 220, height: 220, background: surface.accent, borderRadius: 999, opacity: 0.18 }} />
          <div style={{ position: 'absolute', right: 0, bottom: 80, width: 160, height: 160, background: shiftLightness(surface.accent, -0.2), borderRadius: 999, opacity: 0.22 }} />
          <FitText
            as="div"
            maxSize={headingSize(style, 140)}
            minSize={36}
            width={headW}
            height={headH}
            style={{
              position: 'relative',
              fontFamily: fonts.heading,
              fontWeight: style.typography.headingWeight,
              lineHeight: 0.94,
              color: surface.ink,
              transform: 'rotate(-1deg)',
            }}
          >
            {headline}
          </FitText>
          <FitText
            as="div"
            maxSize={24}
            minSize={13}
            width={subW}
            height={subH}
            style={{
              position: 'relative',
              marginTop: 36,
              opacity: 0.75,
              lineHeight: 1.5,
              color: surface.ink,
              fontFamily: fonts.body,
            }}
          >
            {subhead}
          </FitText>
        </div>
      );
    }

    case 'modern':
    default: {
      const colGap = style.spacing.columnGap;
      const half = Math.round((region.width - colGap) / 2);
      const rightContentW = half - 32; // 32px paddingLeft
      const subH = Math.round(region.height * 0.6);
      return (
        <div
          style={{
            position: 'absolute',
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
            display: 'grid',
            gridTemplateColumns: `${half}px ${half}px`,
            gap: colGap,
            alignContent: 'center',
          }}
        >
          <div>
            <FitText
              as="div"
              maxSize={headingSize(style, 86)}
              minSize={32}
              width={half}
              height={region.height}
              style={{
                fontFamily: fonts.heading,
                fontWeight: style.typography.headingWeight,
                lineHeight: 1.05,
                color: surface.ink,
                letterSpacing: style.typography.headingTracking,
              }}
            >
              {headline}
            </FitText>
          </div>
          <div style={{ alignSelf: 'center', paddingLeft: 32, borderLeft: `1px solid ${surface.border}` }}>
            <FitText
              as="div"
              maxSize={20}
              minSize={12}
              width={rightContentW}
              height={subH}
              style={{
                opacity: 0.75,
                lineHeight: 1.65,
                color: surface.ink,
                fontFamily: fonts.body,
              }}
            >
              {subhead}
            </FitText>
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
}
