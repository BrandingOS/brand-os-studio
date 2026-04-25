/**
 * Style-aware renderers for moodboard / signature / environmental /
 * digital / stationery / outdoor — the seven non-typography archetypes.
 *
 * These share the same chrome and tokens (TopBar / BottomBar /
 * CornerNumeral) but each archetype has its own body composition. To
 * keep the scope tractable for the v1 template system, the body picks
 * one of three internal layouts driven by `style.layout.columns` /
 * `style.color.bgRole` and adapts typography + spacing from the style.
 *
 * Tomorrow's polish: deepen each archetype's per-style branches the
 * same way Cover/Manifesto/Palette/Typography are written.
 */

import type { CSSProperties } from 'react';
import { SlideFrame } from '../../SlideFrame';
import {
  resolveSurface,
  resolveBackground,
  resolveFonts,
  headingSize,
  FitText,
  contentRegion,
  type SurfaceTokens,
} from '../../styles';
import { TopBar, BottomBar, CornerNumeral } from '../../styles/chrome';
import { Body, LogoMark } from '../shared';
import { shiftLightness, seedRandom } from '../../utils';
import type { StyledSlideProps } from './CoverStyled';
import type { BrandProfile } from '../../types';
import type { DeckStyle } from '../../styles';
import { resolveShape } from '../../shapes';

interface ShapeAwareProps extends StyledSlideProps {
  shapeId?: string;
}

interface CommonProps {
  profile: BrandProfile;
  style: DeckStyle;
  surface: SurfaceTokens;
  fonts: ReturnType<typeof resolveFonts>;
}

/* ─────────────────────────  MOODBOARD  ─────────────────────── */

export function MoodboardStyled({ index, profile, style, total, overrides }: StyledSlideProps) {
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const pageNum = String(index + 1).padStart(2, '0');
  const region = contentRegion(style);
  const swatches = profile.palette.swatches.slice(0, 4);
  const colGap = style.spacing.columnGap;
  // 1fr / 1.6fr split.
  const leftW = Math.round((region.width - colGap) * 1 / 2.6);
  const rightW = region.width - colGap - leftW;
  const descH = Math.min(160, region.height - 200);

  return (
    <SlideFrame index={index} archetype="moodboard" variant={style.id} background={bg} ink={surface.ink}>
      <div style={{ position: 'absolute', left: region.x, top: region.y, width: region.width, height: region.height, display: 'grid', gridTemplateColumns: `${leftW}px ${rightW}px`, gap: colGap }}>
        <div>
          <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 96), fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink, display: 'block' }}>
            Mood &<br />reference.
          </span>
          <FitText
            as="div"
            maxSize={18}
            minSize={11}
            width={leftW}
            height={descH}
            style={{
              marginTop: 28,
              opacity: 0.7,
              lineHeight: 1.65,
              color: surface.ink,
              fontFamily: fonts.body,
            }}
          >
            The visual vocabulary that informs every decision across {profile.name}'s system.
          </FitText>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: style.spacing.blockGap, height: 600 }}>
          {/* card cluster — color blocks + typography sample + iconmark */}
          {swatches.map((s, i) => (
            <div key={s.hex} style={{ background: s.hex, borderRadius: style.layout.cardCorner, gridColumn: i === 0 ? 'span 2' : 'span 1', padding: 20, display: 'flex', alignItems: 'flex-end' }}>
              <Body profile={profile} size={12} color={s.hex.toLowerCase() === '#ffffff' ? '#000' : '#fff'} style={{ letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.85 }}>
                {s.name}
              </Body>
            </div>
          ))}
          <div style={{ gridColumn: 'span 2', background: surface.subtle, borderRadius: style.layout.cardCorner, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: fonts.heading, fontSize: 92, fontWeight: 700, color: surface.ink }}>Aa</span>
          </div>
          <div style={{ background: surface.bg === '#0A0A0A' ? shiftLightness('#0A0A0A', 0.08) : '#0A0A0A', color: '#fff', borderRadius: style.layout.cardCorner, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Body profile={profile} size={11} color="#fff" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7 }}>
              Voice
            </Body>
            <span style={{ fontFamily: fonts.heading, fontSize: 28, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>
              The craft<br />is the<br />message.
            </span>
          </div>
        </div>
      </div>
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel="Moodboard" total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel="Moodboard" total={total} />
      <CornerNumeral style={style} profile={profile} surface={surface} pageNum={pageNum} />
    </SlideFrame>
  );
}

/* ─────────────────────────  SIGNATURE  ─────────────────────── */

export function SignatureStyled({ index, profile, style, total }: StyledSlideProps) {
  const surface = resolveSurface(style, profile);
  // Always tilt signature toward brand-flood for impact regardless of style bg
  const bg = style.color.bgRole === 'brand' ? surface.bg : profile.palette.primary;
  const ink = bg === profile.palette.primary ? (surface.ink === '#FFFFFF' || profile.palette.primaryIsDark ? '#FFF' : '#0A0A0A') : surface.ink;
  const fonts = resolveFonts(style, profile);
  const pageNum = String(index + 1).padStart(2, '0');
  const padX = style.spacing.pad;
  const rand = seedRandom(profile.id + profile.name + style.id);
  const swatches = profile.palette.swatches.slice(0, 4).map((s) => s.hex);
  if (swatches.length < 2) swatches.push(profile.palette.ink);

  // Generate generative tiles
  const tiles: JSX.Element[] = [];
  const cols = 12;
  const rows = 7;
  const size = 130;
  const startX = (1920 - cols * size) / 2;
  const startY = (1080 - rows * size) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * size;
      const y = startY + r * size;
      const roll = rand();
      const colorIdx = Math.floor(rand() * swatches.length);
      const color = swatches[colorIdx];
      if (roll < 0.3) {
        tiles.push(<rect key={`s-${r}-${c}`} x={x + 22} y={y + 22} width={size - 44} height={size - 44} fill={color} opacity={0.85} />);
      } else if (roll < 0.6) {
        tiles.push(<circle key={`c-${r}-${c}`} cx={x + size / 2} cy={y + size / 2} r={size * 0.28} fill={color} opacity={0.85} />);
      } else if (roll < 0.78) {
        tiles.push(<path key={`a-${r}-${c}`} d={`M ${x} ${y + size} A ${size} ${size} 0 0 1 ${x + size} ${y}`} fill="none" stroke={color} strokeWidth={Math.max(6, Math.floor(rand() * 18))} strokeLinecap="round" opacity={0.9} />);
      }
    }
  }

  // Bottom headline + meta sit inside contentRegion; the generative
  // tessellation owns the full canvas behind them.
  const region = contentRegion(style);
  const metaW = 280;
  const headW = region.width - metaW - 32;

  return (
    <SlideFrame index={index} archetype="signature" variant={style.id} background={bg} ink={ink}>
      <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', mixBlendMode: 'multiply' }}>
        {tiles}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: region.x,
          top: region.y + region.height - 240,
          width: region.width,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 32,
          zIndex: 2,
        }}
      >
        <FitText
          as="span"
          maxSize={headingSize(style, 96)}
          minSize={32}
          width={headW}
          height={220}
          style={{
            fontFamily: fonts.heading,
            fontWeight: style.typography.headingWeight,
            lineHeight: 0.95,
            letterSpacing: style.typography.headingTracking,
            color: ink,
            textShadow: `0 2px 24px ${shiftLightness(bg, -0.3)}`,
          }}
        >
          A pattern only {profile.name} could wear.
        </FitText>
        <Body profile={profile} size={12} color={ink} style={{ letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.85, fontFamily: fonts.body, textAlign: 'right', lineHeight: 1.7 }}>
          Seed · {profile.id.slice(0, 8)}<br />Generative · {style.name}<br />© {new Date().getFullYear()}
        </Body>
      </div>
      {/* Section label is rendered by the chrome's TopBar; signature uses
          its own bottom-aligned headline + corner logo for emphasis. */}
      <div style={{ position: 'absolute', top: 80, right: padX, zIndex: 2 }}>
        <LogoMark profile={profile} variant={ink === '#FFFFFF' || ink === '#FFF' ? 'white' : 'black'} height={32} color={ink} />
      </div>
    </SlideFrame>
  );
}

/* ─────────────────────────  ENVIRONMENTAL  ─────────────────────── */

export function EnvironmentalStyled({ index, profile, style, total }: StyledSlideProps) {
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const pageNum = String(index + 1).padStart(2, '0');
  const region = contentRegion(style);
  const colGap = style.spacing.columnGap;
  const halfW = Math.round((region.width - colGap) / 2);
  const descH = Math.min(160, region.height - 360);
  // Card geometry — keep it bounded so long brand names auto-shrink.
  const cardW = 580;
  const cardH = 540;
  const cardPad = 60;
  const cardInnerW = cardW - cardPad * 2;
  const cardLogoH = 48;
  const cardCaptionH = 22;
  const cardNameH = cardH - cardPad * 2 - cardLogoH - cardCaptionH - 60; // gaps

  return (
    <SlideFrame index={index} archetype="environmental" variant={style.id} background={bg} ink={surface.ink}>
      <div style={{ position: 'absolute', left: region.x, top: region.y, width: region.width, height: region.height, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: colGap }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 96), fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink, display: 'block' }}>
              Built<br />for the<br />street.
            </span>
            <FitText
              as="div"
              maxSize={18}
              minSize={11}
              width={halfW}
              height={descH}
              style={{
                marginTop: 24,
                opacity: 0.7,
                lineHeight: 1.65,
                color: surface.ink,
                fontFamily: fonts.body,
              }}
            >
              {profile.name} as you encounter it — signage, flagship moments, environmental presence.
            </FitText>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: cardW, height: cardH, background: profile.palette.primary, borderRadius: style.layout.cardCorner, padding: cardPad, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: style.effect.shadow !== 'none' ? '0 30px 60px -12px rgba(0,0,0,0.25)' : 'none', color: surface.ink === '#FFFFFF' ? '#FFF' : '#0A0A0A' }}>
            <LogoMark profile={profile} variant="white" height={cardLogoH} color="#FFF" />
            <FitText
              as="span"
              maxSize={180}
              minSize={48}
              width={cardInnerW}
              height={cardNameH}
              style={{
                fontFamily: fonts.heading,
                fontWeight: 900,
                lineHeight: 0.85,
                letterSpacing: '-0.04em',
                color: '#FFF',
              }}
            >
              {profile.name}
            </FitText>
            <Body profile={profile} size={12} color="#FFF" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.8, fontFamily: fonts.body }}>
              Lobby installation · {style.name}
            </Body>
          </div>
        </div>
      </div>
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel="Environmental" total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel="Environmental" total={total} />
      <CornerNumeral style={style} profile={profile} surface={surface} pageNum={pageNum} />
    </SlideFrame>
  );
}

/* ─────────────────────────  DIGITAL  ─────────────────────── */

export function DigitalStyled(props: ShapeAwareProps) {
  const { index, profile, style, total, overrides, shapeId } = props;
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const region = contentRegion(style);
  const pageNum = String(index + 1).padStart(2, '0');
  const sectionLabel = 'Digital';
  const shape = resolveShape('digital', shapeId, style);

  return (
    <SlideFrame index={index} archetype="digital" variant={style.id} background={bg} ink={surface.ink}>
      <div style={{ position: 'absolute', left: region.x, top: region.y, width: region.width, height: region.height }}>
        {shape ? shape.render({ profile, style, surface, fonts, region, overrides }) : null}
      </div>
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <CornerNumeral style={style} profile={profile} surface={surface} pageNum={pageNum} />
    </SlideFrame>
  );
}

/* ─────────────────────────  STATIONERY  ─────────────────────── */

export function StationeryStyled(props: ShapeAwareProps) {
  const { index, profile, style, total, overrides, shapeId } = props;
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const region = contentRegion(style);
  const pageNum = String(index + 1).padStart(2, '0');
  const sectionLabel = 'Stationery';
  const shape = resolveShape('stationery', shapeId, style);

  return (
    <SlideFrame index={index} archetype="stationery" variant={style.id} background={bg} ink={surface.ink}>
      <div style={{ position: 'absolute', left: region.x, top: region.y, width: region.width, height: region.height }}>
        {shape ? shape.render({ profile, style, surface, fonts, region, overrides }) : null}
      </div>
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <CornerNumeral style={style} profile={profile} surface={surface} pageNum={pageNum} />
    </SlideFrame>
  );
}

/* ─────────────────────────  OUTDOOR  ─────────────────────── */

export function OutdoorStyled(props: ShapeAwareProps) {
  const { index, profile, style, total, overrides, shapeId } = props;
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const region = contentRegion(style);
  const pageNum = String(index + 1).padStart(2, '0');
  const sectionLabel = 'Outdoor';
  const shape = resolveShape('outdoor', shapeId, style);

  return (
    <SlideFrame index={index} archetype="outdoor" variant={style.id} background={bg} ink={surface.ink}>
      <div style={{ position: 'absolute', left: region.x, top: region.y, width: region.width, height: region.height }}>
        {shape ? shape.render({ profile, style, surface, fonts, region, overrides }) : null}
      </div>
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <CornerNumeral style={style} profile={profile} surface={surface} pageNum={pageNum} />
    </SlideFrame>
  );
}
