/**
 * Style-aware Typography slide.
 */

import { SlideFrame } from '../../SlideFrame';
import { resolveSurface, resolveBackground, resolveFonts, headingSize } from '../../styles';
import { TopBar, BottomBar, CornerNumeral } from '../../styles/chrome';
import { Body } from '../shared';
import { shiftLightness } from '../../utils';
import type { StyledSlideProps } from './CoverStyled';

export function TypographyStyled({ index, profile, style, total }: StyledSlideProps) {
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const pageNum = String(index + 1).padStart(2, '0');
  const sectionLabel = 'Typography';
  const family = profile.typography.headingFamily;

  return (
    <SlideFrame index={index} archetype="typography" variant={style.id} background={bg} ink={surface.ink}>
      <TypographyBody style={style} surface={surface} fonts={fonts} family={family} profile={profile} />
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <CornerNumeral style={style} profile={profile} surface={surface} pageNum={pageNum} />
    </SlideFrame>
  );
}

function TypographyBody({ style, surface, fonts, family, profile }: any) {
  const padX = style.spacing.pad;

  // Common header + sample
  const Header = () => (
    <>
      <Body profile={profile} size={12} color={surface.ink} style={{ letterSpacing: style.typography.eyebrowTracking, textTransform: 'uppercase', opacity: 0.55, marginBottom: 14, fontFamily: fonts.body }}>
        §05 · Typography
      </Body>
      <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 96), fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink, display: 'block' }}>
        {family}.
      </span>
    </>
  );

  switch (style.id) {
    case 'bold':
    case 'monolith':
    case 'playful': {
      const isPlayful = style.id === 'playful';
      const isBold = style.id === 'bold';
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: 160, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
          <div>
            <Header />
            <Body profile={profile} size={16} color={surface.ink} style={{ marginTop: 24, opacity: 0.7, lineHeight: 1.6, maxWidth: 480 }}>
              The single typeface that carries every word of {profile.name}. Weight ladder ready for any moment.
            </Body>
          </div>
          <div style={{ background: isBold ? shiftLightness(surface.bg, 0.08) : surface.subtle, borderRadius: style.layout.cardCorner, padding: 60, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 600 }}>
            <Body profile={profile} size={11} color={surface.ink} style={{ letterSpacing: '0.32em', textTransform: 'uppercase', opacity: 0.6 }}>
              Display Specimen
            </Body>
            <span style={{ fontFamily: fonts.heading, fontWeight: 900, fontSize: headingSize(style, 380), lineHeight: 0.85, color: surface.ink, letterSpacing: '-0.05em', transform: isPlayful ? 'rotate(-2deg)' : 'none' }}>
              Aa
            </span>
            <Body profile={profile} size={14} color={surface.ink} style={{ fontFamily: fonts.body, opacity: 0.6, letterSpacing: '0.06em' }}>
              400 · 500 · 600 · 700 · 800 · 900
            </Body>
          </div>
        </div>
      );
    }

    case 'editorial':
    case 'magazine':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: 170, display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: style.spacing.columnGap }}>
          <div>
            <Header />
            <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 320), fontWeight: 700, lineHeight: 0.85, color: surface.ink, letterSpacing: '-0.04em', display: 'block', marginTop: 32 }}>
              Aa
            </span>
            <Body profile={profile} size={14} color={surface.ink} style={{ marginTop: 24, opacity: 0.7, fontFamily: fonts.body, letterSpacing: '0.06em' }}>
              Specimen · 400 / 500 / 600 / 700 / 900
            </Body>
          </div>
          <div style={{ paddingLeft: 40, borderLeft: `1px solid ${surface.border}`, display: 'flex', flexDirection: 'column', gap: 28 }}>
            {[
              { size: 96, weight: 700, label: 'Heading 01' },
              { size: 60, weight: 600, label: 'Heading 02' },
              { size: 36, weight: 500, label: 'Heading 03' },
              { size: 18, weight: 400, label: 'Body — Lorem ipsum dolor sit amet, consectetur.' },
            ].map((row, i) => (
              <div key={i} style={{ borderBottom: i === 3 ? 'none' : `1px solid ${surface.border}`, paddingBottom: 16 }}>
                <Body profile={profile} size={10} color={surface.ink} style={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 6, fontFamily: fonts.body }}>
                  {row.size}px / {row.weight}
                </Body>
                <span style={{ fontFamily: fonts.heading, fontSize: row.size, fontWeight: row.weight, lineHeight: 1, color: surface.ink, letterSpacing: '-0.01em' }}>
                  {row.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'swiss':
    case 'minimal':
    case 'modern':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: 170 }}>
          <Header />
          <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 24 }}>
            {[300, 400, 500, 600, 700, 900].map((w) => (
              <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontFamily: fonts.heading, fontSize: 140, fontWeight: w, lineHeight: 0.85, color: surface.ink }}>Aa</span>
                <Body profile={profile} size={11} color={surface.ink} style={{ fontFamily: fonts.body, opacity: 0.65, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{w}</Body>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 60, paddingTop: 28, borderTop: `1px solid ${surface.border}` }}>
            <span style={{ fontFamily: fonts.heading, fontSize: 78, fontWeight: 600, lineHeight: 1, color: surface.ink, letterSpacing: '-0.02em' }}>
              The craft is the message.
            </span>
            <Body profile={profile} size={15} color={surface.ink} style={{ marginTop: 18, opacity: 0.65, lineHeight: 1.6, maxWidth: 720 }}>
              {profile.mission}
            </Body>
          </div>
        </div>
      );

    case 'brutalist':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: 170 }}>
          <Header />
          <div style={{ marginTop: 40, border: `3px solid ${surface.ink}`, padding: 40 }}>
            <span style={{ fontFamily: fonts.heading, fontSize: 240, fontWeight: 700, textTransform: 'uppercase', lineHeight: 0.9, color: surface.ink, letterSpacing: '-0.04em' }}>
              ABCDEFG
            </span>
            <div style={{ marginTop: 16, fontFamily: fonts.body, fontSize: 14, color: surface.ink, letterSpacing: '0.04em', opacity: 0.85 }}>
              [01] {family} / mono — sole typeface, all-caps default, 400 / 700 weights.
            </div>
          </div>
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {['HEAD-01', 'HEAD-02', 'BODY-01', 'CAPTION'].map((label, i) => (
              <div key={label} style={{ border: `2px solid ${surface.ink}`, padding: 20 }}>
                <Body profile={profile} size={11} color={surface.ink} style={{ fontFamily: fonts.body, opacity: 0.7, marginBottom: 10 }}>
                  {label}
                </Body>
                <span style={{ fontFamily: fonts.heading, fontSize: [56, 38, 18, 12][i], fontWeight: 700, color: surface.ink, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                  ABC
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'technical':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: 170, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 50 }}>
          <div>
            <Header />
            <span style={{ fontFamily: fonts.heading, fontSize: 280, fontWeight: 600, lineHeight: 0.85, color: surface.ink, marginTop: 32, display: 'block' }}>Aa</span>
            <Body profile={profile} size={12} color={surface.ink} style={{ marginTop: 16, fontFamily: fonts.body, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.65 }}>
              Stack · 400 / 500 / 600 / 700 / 900
            </Body>
          </div>
          <div style={{ border: `1px solid ${surface.border}`, padding: 24, fontFamily: fonts.body, color: surface.ink, fontSize: 11, lineHeight: 1.85, alignSelf: 'start' }}>
            <div style={{ opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>// SCALE</div>
            {[
              ['display', 96],
              ['heading-01', 64],
              ['heading-02', 44],
              ['heading-03', 28],
              ['body', 16],
              ['caption', 12],
            ].map(([name, size]) => (
              <div key={name as string}>{name}&nbsp;&nbsp;{size}px</div>
            ))}
            <div style={{ opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 22, marginBottom: 16 }}>// FAMILY</div>
            <div>primary&nbsp;&nbsp;{family}</div>
            <div>body&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{profile.typography.bodyFamily}</div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
