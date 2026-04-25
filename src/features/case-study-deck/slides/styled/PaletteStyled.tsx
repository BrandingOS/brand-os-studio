/**
 * Style-aware Palette slide.
 * Brand color system, treatment varies per active deck style.
 */

import { SlideFrame } from '../../SlideFrame';
import { resolveSurface, resolveBackground, resolveFonts, headingSize, chromeTopPad } from '../../styles';
import { TopBar, BottomBar, CornerNumeral } from '../../styles/chrome';
import { Body } from '../shared';
import type { StyledSlideProps } from './CoverStyled';
import type { Swatch } from '../../types';

export function PaletteStyled({ index, profile, style, total }: StyledSlideProps) {
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const pageNum = String(index + 1).padStart(2, '0');
  const sectionLabel = 'Palette';
  const swatches = profile.palette.swatches.slice(0, 6);

  return (
    <SlideFrame index={index} archetype="palette" variant={style.id} background={bg} ink={surface.ink}>
      <PaletteBody style={style} surface={surface} fonts={fonts} swatches={swatches} profile={profile} />
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <CornerNumeral style={style} profile={profile} surface={surface} pageNum={pageNum} />
    </SlideFrame>
  );
}

function PaletteBody({ style, surface, fonts, swatches, profile }: any) {
  const padX = style.spacing.pad;
  const topPad = chromeTopPad(style);

  // Common header. Section/page indicators are owned by the chrome's
  // TopBar (see styles/chrome.tsx); the body just shows the headline.
  const Header = () => (
    <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 96), fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink, display: 'block' }}>
      Palette.
    </span>
  );

  switch (style.id) {
    case 'bold':
    case 'monolith':
      // Big circle stack
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: topPad, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
          <div>
            <Header />
            <Body profile={profile} size={16} color={surface.ink} style={{ marginTop: 24, opacity: 0.7, maxWidth: 480, lineHeight: 1.6 }}>
              Six tones, scored, sequenced. Each pulls its weight in the system.
            </Body>
          </div>
          <div style={{ position: 'relative', height: 600 }}>
            {swatches.map((s: Swatch, i: number) => (
              <div
                key={s.hex}
                style={{
                  position: 'absolute',
                  width: 240,
                  height: 240,
                  borderRadius: 999,
                  background: s.hex,
                  left: (i % 3) * 130,
                  top: Math.floor(i / 3) * 200 + (i % 2) * 30,
                  boxShadow: '0 30px 60px -10px rgba(0,0,0,0.35)',
                  mixBlendMode: 'normal',
                }}
              />
            ))}
          </div>
        </div>
      );

    case 'editorial':
    case 'magazine':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: topPad, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: style.spacing.columnGap }}>
          <div>
            <Header />
            <Body profile={profile} size={15} color={surface.ink} style={{ opacity: 0.7, marginTop: 22, lineHeight: 1.7 }}>
              The brand color system, hand-tuned. Every value catalogued, contrast-checked, ready for craft.
            </Body>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {swatches.map((s: Swatch) => (
              <div key={s.hex} style={{ background: s.hex, height: 220, padding: 18, color: s.hex.toLowerCase() === '#ffffff' ? '#000' : '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: style.layout.cardCorner }}>
                <Body profile={profile} size={13} color={undefined} style={{ letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.85 }}>
                  {s.name}
                </Body>
                <Body profile={profile} size={12} color={undefined} style={{ fontFamily: fonts.body, opacity: 0.75 }}>
                  {s.hex}<br />{s.rgb}
                </Body>
              </div>
            ))}
          </div>
        </div>
      );

    case 'swiss':
    case 'minimal':
    case 'modern':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: topPad }}>
          <Header />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginTop: 60 }}>
            {swatches.map((s: Swatch) => (
              <div key={s.hex} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ aspectRatio: '3 / 4', background: s.hex, border: style.layout.bordering === 'inset' ? `1px solid ${surface.border}` : 'none', borderRadius: style.layout.cardCorner }} />
                <div>
                  <Body profile={profile} size={13} color={surface.ink} style={{ fontWeight: 600, marginBottom: 4 }}>{s.name}</Body>
                  <Body profile={profile} size={11} color={surface.ink} style={{ fontFamily: fonts.body, opacity: 0.55 }}>{s.hex}</Body>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'brutalist':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: topPad }}>
          <Header />
          <div style={{ marginTop: 50, border: `3px solid ${surface.ink}` }}>
            {swatches.map((s: Swatch, i: number) => (
              <div key={s.hex} style={{ display: 'grid', gridTemplateColumns: '60px 200px 1fr 200px', borderTop: i === 0 ? 'none' : `2px solid ${surface.ink}`, alignItems: 'stretch' }}>
                <div style={{ background: s.hex, borderRight: `2px solid ${surface.ink}` }} />
                <div style={{ padding: '20px 16px', borderRight: `2px solid ${surface.ink}`, fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, textTransform: 'uppercase', color: surface.ink }}>
                  [{String(i + 1).padStart(2, '0')}] {s.name}
                </div>
                <div style={{ padding: '20px 16px', borderRight: `2px solid ${surface.ink}`, fontFamily: fonts.body, fontSize: 13, color: surface.ink, opacity: 0.85 }}>
                  {s.hex} · {s.rgb}
                </div>
                <div style={{ padding: '20px 16px', fontFamily: fonts.body, fontSize: 13, color: surface.ink, opacity: 0.85 }}>
                  {s.role ?? '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'technical':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: topPad }}>
          <Header />
          <div style={{ marginTop: 40, border: `1px solid ${surface.border}`, fontFamily: fonts.body, fontSize: 12, color: surface.ink }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 130px 180px 130px 1fr', borderBottom: `1px solid ${surface.border}`, padding: '12px 18px', opacity: 0.6, letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: 10 }}>
              <span>#</span><span>NAME</span><span>HEX</span><span>RGB</span><span>HSL</span><span>ROLE</span>
            </div>
            {swatches.map((s: Swatch, i: number) => (
              <div key={s.hex} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 130px 180px 130px 1fr', alignItems: 'center', padding: '14px 18px', borderBottom: i === swatches.length - 1 ? 'none' : `1px solid ${surface.border}` }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ display: 'inline-block', width: 18, height: 18, background: s.hex, border: `1px solid ${surface.border}` }} /></span>
                <span style={{ fontFamily: fonts.heading, fontSize: 16, fontWeight: 600 }}>{s.name}</span>
                <span>{s.hex}</span>
                <span>{s.rgb}</span>
                <span>{s.hsl ?? '—'}</span>
                <span style={{ opacity: 0.7 }}>{s.role ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'playful':
      return (
        <div style={{ position: 'absolute', inset: 0, padding: padX, paddingTop: topPad }}>
          <Header />
          <div style={{ marginTop: 60, display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            {swatches.map((s: Swatch, i: number) => (
              <div key={s.hex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 3}deg)` }}>
                <div style={{ width: 220, height: 220, borderRadius: 999, background: s.hex, boxShadow: '0 18px 40px -8px rgba(0,0,0,0.25)' }} />
                <Body profile={profile} size={15} color={surface.ink} style={{ fontWeight: 700 }}>{s.name}</Body>
                <Body profile={profile} size={11} color={surface.ink} style={{ opacity: 0.55, fontFamily: fonts.body }}>{s.hex}</Body>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}
