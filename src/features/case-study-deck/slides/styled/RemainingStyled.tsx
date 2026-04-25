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
import { resolveShape } from '../../shapes';
import type { StyledSlideProps } from './CoverStyled';

interface ShapedSlideProps extends StyledSlideProps {
  shapeId?: string;
}

// Backwards-compat alias for branches that referenced ShapeAwareProps.
type ShapeAwareProps = ShapedSlideProps;

/* ─────────────────────────  MOODBOARD  ─────────────────────── */

export function MoodboardStyled({ index, profile, style, total, overrides, shapeId }: ShapedSlideProps) {
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const region = contentRegion(style);
  const pageNum = String(index + 1).padStart(2, '0');
  const sectionLabel = 'Moodboard';
  const shape = resolveShape('moodboard', shapeId, style);

  return (
    <SlideFrame index={index} archetype="moodboard" variant={style.id} background={bg} ink={surface.ink}>
      <div style={{ position: 'absolute', left: region.x, top: region.y, width: region.width, height: region.height }}>
        {shape ? shape.render({ profile, style, surface, fonts, region, overrides }) : null}
      </div>
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <CornerNumeral style={style} profile={profile} surface={surface} pageNum={pageNum} />
    </SlideFrame>
  );
}

/* ─────────────────────────  SIGNATURE  ─────────────────────── */

export function SignatureStyled({ index, profile, style, overrides, shapeId }: ShapedSlideProps) {
  const surface = resolveSurface(style, profile);
  // Always tilt signature toward brand-flood for impact regardless of style bg
  const bg = style.color.bgRole === 'brand' ? surface.bg : profile.palette.primary;
  const ink = bg === profile.palette.primary ? (surface.ink === '#FFFFFF' || profile.palette.primaryIsDark ? '#FFF' : '#0A0A0A') : surface.ink;
  const fonts = resolveFonts(style, profile);
  // Build a synthetic surface so shapes inherit ink/border that read on the brand-flood bg.
  const sigSurface: SurfaceTokens = { ...surface, bg, ink, subtle: shiftLightness(bg, ink === '#FFF' ? 0.1 : -0.1), border: shiftLightness(bg, ink === '#FFF' ? 0.18 : -0.18) };
  const padX = style.spacing.pad;
  const region = contentRegion(style);
  const metaW = 280;
  const headW = region.width - metaW - 32;
  const shape = resolveShape('signature', shapeId, style);

  return (
    <SlideFrame index={index} archetype="signature" variant={style.id} background={bg} ink={ink}>
      {shape ? shape.render({ profile, style, surface: sigSurface, fonts, region, overrides }) : null}
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

export function EnvironmentalStyled({ index, profile, style, total, overrides, shapeId }: ShapedSlideProps) {
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const region = contentRegion(style);
  const pageNum = String(index + 1).padStart(2, '0');
  const sectionLabel = 'Environmental';
  const shape = resolveShape('environmental', shapeId, style);

  return (
    <SlideFrame index={index} archetype="environmental" variant={style.id} background={bg} ink={surface.ink}>
      <div style={{ position: 'absolute', left: region.x, top: region.y, width: region.width, height: region.height }}>
        {shape ? shape.render({ profile, style, surface, fonts, region, overrides }) : null}
      </div>
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
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
