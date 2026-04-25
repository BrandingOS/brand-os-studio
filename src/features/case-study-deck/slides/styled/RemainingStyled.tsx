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

export function DigitalStyled({ index, profile, style, total }: StyledSlideProps) {
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const pageNum = String(index + 1).padStart(2, '0');
  const region = contentRegion(style);
  // Browser mock dimensions (inner content region).
  const browserH = 580;
  const browserPad = 30;
  const innerPad = 60;
  const innerW = region.width - browserPad * 2 - innerPad * 2;
  // Hero/mission stack inside the browser hero area.
  const heroH = 220;
  const missionH = 110;

  return (
    <SlideFrame index={index} archetype="digital" variant={style.id} background={bg} ink={surface.ink}>
      <div style={{ position: 'absolute', left: region.x, top: region.y, width: region.width, height: region.height, display: 'flex', flexDirection: 'column', gap: 36 }}>
        <div>
          <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 96), fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink, display: 'block' }}>
            On every screen.
          </span>
        </div>
        {/* Browser mock */}
        <div style={{ background: '#0A0A0A', borderRadius: style.layout.cardCorner, height: browserH, padding: browserPad, position: 'relative', boxShadow: style.effect.shadow !== 'none' ? '0 40px 80px -16px rgba(0,0,0,0.45)' : 'none' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            <span style={{ width: 12, height: 12, borderRadius: 999, background: '#ff5f56' }} />
            <span style={{ width: 12, height: 12, borderRadius: 999, background: '#ffbd2e' }} />
            <span style={{ width: 12, height: 12, borderRadius: 999, background: '#27c93f' }} />
          </div>
          <div style={{ background: surface.bg, borderRadius: 12, padding: innerPad, display: 'flex', flexDirection: 'column', gap: 20, height: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <LogoMark profile={profile} variant={surface.ink === '#FFFFFF' ? 'white' : 'black'} height={32} color={surface.ink} />
              <div style={{ display: 'flex', gap: 18, fontFamily: fonts.body, fontSize: 13, color: surface.ink, opacity: 0.85 }}>
                <span>Home</span><span>Products</span><span>About</span><span>Contact</span>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
              <FitText
                as="span"
                maxSize={70}
                minSize={28}
                width={innerW}
                height={heroH}
                style={{
                  fontFamily: fonts.heading,
                  fontWeight: 700,
                  lineHeight: 1.05,
                  color: surface.ink,
                  letterSpacing: '-0.025em',
                }}
              >
                {profile.tagline}
              </FitText>
              <FitText
                as="div"
                maxSize={18}
                minSize={11}
                width={Math.min(innerW, 720)}
                height={missionH}
                style={{
                  opacity: 0.7,
                  lineHeight: 1.6,
                  color: surface.ink,
                  fontFamily: fonts.body,
                }}
              >
                {profile.mission}
              </FitText>
              <div style={{ display: 'flex', gap: 14, marginTop: 14 }}>
                <span style={{ padding: '12px 28px', borderRadius: style.id === 'playful' ? 999 : 12, background: profile.palette.primary, color: '#FFF', fontFamily: fonts.body, fontSize: 13, fontWeight: 600 }}>Get started</span>
                <span style={{ padding: '12px 28px', borderRadius: style.id === 'playful' ? 999 : 12, border: `1px solid ${surface.border}`, color: surface.ink, fontFamily: fonts.body, fontSize: 13, fontWeight: 600 }}>Learn more</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel="Digital" total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel="Digital" total={total} />
      <CornerNumeral style={style} profile={profile} surface={surface} pageNum={pageNum} />
    </SlideFrame>
  );
}

/* ─────────────────────────  STATIONERY  ─────────────────────── */

export function StationeryStyled({ index, profile, style, total }: StyledSlideProps) {
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const pageNum = String(index + 1).padStart(2, '0');
  const region = contentRegion(style);
  // Card geometry — 3-up grid spanning region.width.
  const cardGap = style.spacing.blockGap;
  const cardW = Math.round((region.width - cardGap * 2) / 3);
  const cardH = 540;
  const cardPad = 36;
  const cardInnerW = cardW - cardPad * 2;
  // Reserve room for the kind label (~24) and url row (~24) inside the card.
  const labelReserve = 80;
  const cardLabelH = cardH - cardPad * 2 - labelReserve;

  const objects: { kind: string; bg: string; ink: string; label: string; prim?: boolean }[] = [
    { kind: 'Folder', bg: profile.palette.primary, ink: '#FFF', label: profile.name, prim: true },
    { kind: 'Card', bg: '#FFF', ink: '#0A0A0A', label: profile.name },
    { kind: 'Envelope', bg: '#0A0A0A', ink: profile.palette.primary, label: profile.name },
  ];

  return (
    <SlideFrame index={index} archetype="stationery" variant={style.id} background={bg} ink={surface.ink}>
      <div style={{ position: 'absolute', left: region.x, top: region.y, width: region.width, height: region.height, display: 'flex', flexDirection: 'column', gap: 36 }}>
        <div>
          <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 96), fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink, display: 'block' }}>
            Three objects, one system.
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: cardGap, height: cardH }}>
          {objects.map((o) => (
            <div key={o.kind} style={{ background: o.bg, borderRadius: style.layout.cardCorner, padding: cardPad, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: style.effect.shadow !== 'none' ? '0 18px 40px -10px rgba(0,0,0,0.2)' : 'none' }}>
              <Body profile={profile} size={11} color={o.ink} style={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7, fontFamily: fonts.body }}>
                {o.kind}
              </Body>
              <FitText
                as="span"
                maxSize={78}
                minSize={20}
                width={cardInnerW}
                height={cardLabelH}
                style={{
                  fontFamily: fonts.heading,
                  fontWeight: 800,
                  color: o.ink,
                  letterSpacing: '-0.03em',
                  lineHeight: 0.9,
                }}
              >
                {o.label}
              </FitText>
              <Body profile={profile} size={11} color={o.ink} style={{ opacity: 0.65, fontFamily: fonts.body }}>
                {o.kind === 'Card' ? 'www.' + profile.name.toLowerCase().replace(/\s+/g, '') + '.com' : '—'}
              </Body>
            </div>
          ))}
        </div>
      </div>
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel="Stationery" total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel="Stationery" total={total} />
      <CornerNumeral style={style} profile={profile} surface={surface} pageNum={pageNum} />
    </SlideFrame>
  );
}

/* ─────────────────────────  OUTDOOR  ─────────────────────── */

export function OutdoorStyled({ index, profile, style, total }: StyledSlideProps) {
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const pageNum = String(index + 1).padStart(2, '0');
  const region = contentRegion(style);
  // Banner geometry — outer dark frame + inner brand panel.
  const bannerW = Math.min(region.width, 1200);
  const bannerH = 480;
  const bannerPad = 40;
  const innerPad = 50;
  const innerW = bannerW - bannerPad * 2 - innerPad * 2;
  const innerH = bannerH - bannerPad * 2 - innerPad * 2;
  // 3 stacked rows: top caption (~30) + center wordmark + bottom caption (~30) with space-between.
  const captionH = 30;
  const wordmarkH = innerH - captionH * 2 - 40;
  // Headline reserve at top.
  const headerH = 130;
  const bannerStackH = region.height - headerH - 36;

  return (
    <SlideFrame index={index} archetype="outdoor" variant={style.id} background={bg} ink={surface.ink}>
      <div style={{ position: 'absolute', left: region.x, top: region.y, width: region.width, height: region.height, display: 'flex', flexDirection: 'column', gap: 36 }}>
        <div>
          <span style={{ fontFamily: fonts.heading, fontSize: headingSize(style, 96), fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink, display: 'block' }}>
            Out in the wild.
          </span>
        </div>
        <div style={{ height: bannerStackH, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ background: '#1f2937', width: '100%', maxWidth: bannerW, height: bannerH, borderRadius: style.layout.cardCorner, padding: bannerPad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: style.effect.shadow !== 'none' ? '0 30px 60px -12px rgba(0,0,0,0.4)' : 'none' }}>
            <div style={{ background: profile.palette.primary, width: '100%', height: '100%', borderRadius: style.layout.cardCorner / 2, padding: innerPad, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <FitText
                as="div"
                maxSize={16}
                minSize={10}
                width={innerW}
                height={captionH}
                style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: fonts.body, opacity: 0.85, color: '#FFF' }}
              >
                Powering Growth Through {profile.name}
              </FitText>
              <FitText
                as="span"
                maxSize={280}
                minSize={56}
                width={innerW}
                height={wordmarkH}
                style={{
                  fontFamily: fonts.heading,
                  fontWeight: 900,
                  color: '#FFF',
                  letterSpacing: '-0.04em',
                  lineHeight: 0.85,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {profile.name}
              </FitText>
              <Body profile={profile} size={14} color="#FFF" style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: fonts.body, opacity: 0.85, textAlign: 'right' }}>
                Mesh banner · {style.name}
              </Body>
            </div>
          </div>
        </div>
      </div>
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel="Outdoor" total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel="Outdoor" total={total} />
      <CornerNumeral style={style} profile={profile} surface={surface} pageNum={pageNum} />
    </SlideFrame>
  );
}
