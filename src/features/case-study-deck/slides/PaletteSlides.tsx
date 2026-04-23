/**
 * Palette archetype — 3 variants.
 *
 *   A — Horizontal color bands with full specs (hex/rgb/cmyk/hsv/hsl) +
 *       vertical hero image panel. Matches reference Fexilc slide 3.
 *   B — Vertical squares grid on paper bg, hex-only, minimal.
 *   C — Overlapping circles visualizing harmonic relationships.
 */

import type { BrandProfile, SlideOverrides } from '../types';
import { SlideFrame } from '../SlideFrame';
import { Body, Display, LogoMark } from './shared';
import { inkOn } from '../utils';

interface Props {
  index: number;
  profile: BrandProfile;
  overrides?: SlideOverrides;
}

export function PaletteA({ index, profile, overrides }: Props) {
  const bg = '#F6F3EE';
  const ink = '#111';
  const accent = profile.palette.primary;
  const swatches = profile.palette.swatches.slice(0, 5);
  const hero = overrides?.image ?? profile.assets.allImages[0];

  return (
    <SlideFrame index={index} archetype="palette" variant="A" background={bg} ink={ink}>
      {/* left: 5 color rows with specs */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 1350,
          display: 'grid',
          gridTemplateRows: `repeat(${swatches.length}, 1fr)`,
        }}
      >
        {swatches.map((s, idx) => {
          const sInk = inkOn(s.hex);
          return (
            <div
              key={`${s.hex}-${idx}`}
              style={{
                position: 'relative',
                background: s.hex,
                color: sInk,
                padding: '28px 56px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Body profile={profile} size={14} color={sInk} style={{ letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.85 }}>
                Color 0{idx + 1}
              </Body>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                <Display profile={profile} size={54} weight={800} color={sInk} style={{ letterSpacing: '-0.025em', maxWidth: 500 }}>
                  {s.name}
                </Display>
                <div
                  style={{
                    fontFamily: `'${profile.typography.bodyFamily}', monospace`,
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: sInk,
                    opacity: 0.95,
                    textAlign: 'left',
                    display: 'grid',
                    gridTemplateColumns: '80px 18px auto',
                    gap: '0 12px',
                  }}
                >
                  <span>HEX</span><span>→</span><span>{s.hex}</span>
                  <span>RGB</span><span>→</span><span>{s.rgb}</span>
                  <span>CMYK</span><span>→</span><span>{s.cmyk}</span>
                  <span>HSV</span><span>→</span><span>{s.hsv}</span>
                  <span>HSL</span><span>→</span><span>{s.hsl}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* right: hero strip */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 570,
          overflow: 'hidden',
          background: accent,
        }}
      >
        {hero ? (
          <img src={hero} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.95)' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${accent}, ${profile.palette.ink})` }} />
        )}
        <div style={{ position: 'absolute', left: 40, bottom: 48, opacity: 0.92 }}>
          <LogoMark profile={profile} variant="white" height={56} color={inkOn(accent)} />
        </div>
      </div>
    </SlideFrame>
  );
}

export function PaletteB({ index, profile }: Props) {
  const bg = profile.palette.paper;
  const ink = profile.palette.ink;
  const accent = profile.palette.primary;
  const swatches = profile.palette.swatches.slice(0, 6);

  return (
    <SlideFrame index={index} archetype="palette" variant="B" background={bg} ink={ink}>
      <div style={{ position: 'absolute', top: 96, left: 96, right: 96 }}>
        <Body profile={profile} size={14} color={accent} style={{ letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 12 }}>
          · §04 Color System
        </Body>
        <Display profile={profile} size={96} weight={700} color={ink} style={{ letterSpacing: '-0.025em' }}>
          Palette.
        </Display>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 380,
          left: 96,
          right: 96,
          bottom: 80,
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 20,
        }}
      >
        {swatches.map((s, idx) => (
          <div
            key={`${s.hex}-${idx}`}
            style={{
              background: s.hex,
              color: inkOn(s.hex),
              borderRadius: 20,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Body profile={profile} size={12} color={inkOn(s.hex)} style={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.85 }}>
              0{idx + 1}
            </Body>
            <div>
              <Display profile={profile} size={28} weight={800} color={inkOn(s.hex)} style={{ letterSpacing: '-0.015em', marginBottom: 6, lineHeight: 1.1 }}>
                {s.name}
              </Display>
              <Body profile={profile} size={13} color={inkOn(s.hex)} style={{ letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                {s.hex}
              </Body>
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 40, left: 96 }}>
        <LogoMark profile={profile} variant="black" height={28} color={ink} />
      </div>
    </SlideFrame>
  );
}

export function PaletteC({ index, profile }: Props) {
  const bg = profile.palette.ink;
  const ink = '#FFF';
  const accent = profile.palette.primary;
  const swatches = profile.palette.swatches.slice(0, 5);

  return (
    <SlideFrame index={index} archetype="palette" variant="C" background={bg} ink={ink}>
      <div style={{ position: 'absolute', top: 80, left: 96, right: 96, display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <Body profile={profile} size={14} color={accent} style={{ letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 10 }}>
            · §04 Color Harmony
          </Body>
          <Display profile={profile} size={84} weight={700} color={ink}>
            Palette in motion.
          </Display>
        </div>
        <LogoMark profile={profile} variant="white" height={40} color={ink} />
      </div>

      {/* Overlapping color circles */}
      <div style={{ position: 'absolute', top: 360, left: 140, width: 900, height: 620 }}>
        {swatches.map((s, i) => {
          const angle = (i / swatches.length) * Math.PI * 2;
          const r = 180;
          const cx = 400 + Math.cos(angle) * r;
          const cy = 310 + Math.sin(angle) * r;
          return (
            <div
              key={`${s.hex}-${i}`}
              style={{
                position: 'absolute',
                left: cx - 160,
                top: cy - 160,
                width: 320,
                height: 320,
                borderRadius: '50%',
                background: s.hex,
                mixBlendMode: 'screen',
                opacity: 0.92,
              }}
            />
          );
        })}
      </div>

      {/* Spec list right side */}
      <div
        style={{
          position: 'absolute',
          top: 360,
          right: 96,
          width: 640,
          display: 'grid',
          gridTemplateColumns: '60px 1fr auto',
          gap: '18px 24px',
          alignItems: 'center',
        }}
      >
        {swatches.map((s, i) => (
          <div key={`spec-${s.hex}-${i}`} style={{ display: 'contents' }}>
            <div style={{ background: s.hex, width: 48, height: 48, borderRadius: 10 }} />
            <div>
              <Display profile={profile} size={22} weight={700} color={ink} style={{ marginBottom: 4 }}>
                {s.name}
              </Display>
              <Body profile={profile} size={13} color={ink} style={{ opacity: 0.7, letterSpacing: '0.08em', fontFamily: 'ui-monospace, monospace' }}>
                {s.hex} · {s.rgb}
              </Body>
            </div>
            <Body profile={profile} size={12} color={accent} style={{ letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.8 }}>
              0{i + 1}
            </Body>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}
