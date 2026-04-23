/**
 * Environmental archetype — 3 variants.
 *
 *   A — Trade-show booth CSS mockup with illuminated wall.
 *       Matches reference Fexilc slide 4.
 *   B — Office / lobby signage (metal letters on wall).
 *   C — Brand activation — outdoor event with banner + people crowd.
 */

import type { BrandProfile, SlideOverrides } from '../types';
import { SlideFrame } from '../SlideFrame';
import { Body, Display, LogoMark } from './shared';
import { inkOn, shiftLightness } from '../utils';

interface Props {
  index: number;
  profile: BrandProfile;
  overrides?: SlideOverrides;
}

export function EnvironmentalA({ index, profile, overrides }: Props) {
  const bg = '#0A0A0A';
  const ink = '#fff';
  const accent = profile.palette.primary;
  const hero = overrides?.image;

  return (
    <SlideFrame index={index} archetype="environmental" variant="A" background={bg} ink={ink}>
      {/* floor gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 70%, #2a2420 100%)' }} />
      {/* ceiling grid (track lights suggestion) */}
      <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.3 }}>
        <line x1="0" y1="80" x2="1920" y2="80" stroke="#444" strokeWidth="2" />
        <line x1="0" y1="120" x2="1920" y2="120" stroke="#222" strokeWidth="1" />
        {Array.from({ length: 10 }).map((_, i) => (
          <circle key={i} cx={150 + i * 190} cy={80} r="6" fill="#ffe8a0" opacity="0.9" />
        ))}
        {/* floor guide lines (perspective) */}
        <path d="M0,760 L1920,760" stroke="#222" strokeWidth="1" />
        <path d="M0,1080 L520,740 L1400,740 L1920,1080" fill="none" stroke="#2a2420" strokeWidth="1" />
      </svg>

      {/* main wall */}
      {hero ? (
        <img
          src={hero}
          alt=""
          style={{ position: 'absolute', left: '18%', top: '16%', width: '52%', height: '62%', objectFit: 'cover', borderRadius: 4, filter: 'brightness(0.85)' }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            left: '18%',
            top: '16%',
            width: '52%',
            height: '62%',
            background: `linear-gradient(180deg, ${shiftLightness(accent, 0.15)} 0%, ${accent} 45%, ${shiftLightness(accent, -0.3)} 100%)`,
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7)',
          }}
        >
          {/* decorative line art */}
          <svg viewBox="0 0 600 400" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
            <path d="M-40,240 L220,80 L380,200 L660,40" stroke={inkOn(accent)} strokeWidth="2" fill="none" />
            <rect x="340" y="120" width="180" height="140" rx="12" stroke={inkOn(accent)} strokeWidth="2" fill="none" />
            <path d="M320,320 Q400,260 480,320" stroke={inkOn(accent)} strokeWidth="2" fill="none" />
          </svg>
          {/* logo + wordmark */}
          <div style={{ position: 'absolute', left: '8%', top: '14%', display: 'flex', alignItems: 'center', gap: 18 }}>
            <LogoMark profile={profile} variant="iconmark" height={72} color={inkOn(accent)} />
          </div>
          <div style={{ position: 'absolute', left: '8%', bottom: '14%' }}>
            <Display profile={profile} size={150} weight={900} color={inkOn(accent)} style={{ letterSpacing: '-0.035em', lineHeight: 0.9 }}>
              {profile.name}
              <span style={{ fontSize: '0.25em', verticalAlign: 'super', marginLeft: 6 }}>™</span>
            </Display>
            <Body profile={profile} size={18} color={inkOn(accent)} style={{ marginTop: 12, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.9 }}>
              {profile.tagline.slice(0, 40)}
            </Body>
          </div>
        </div>
      )}

      {/* side column (booth entrance pillar) */}
      <div
        style={{
          position: 'absolute',
          right: '10%',
          top: '8%',
          width: '18%',
          height: '78%',
          background: `linear-gradient(180deg, ${shiftLightness(accent, 0.1)} 0%, ${shiftLightness(accent, -0.2)} 100%)`,
          borderRadius: 4,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '36px 0',
        }}
      >
        <LogoMark profile={profile} variant="iconmark" height={48} color={inkOn(accent)} />
        <Display profile={profile} size={70} weight={800} color={inkOn(accent)} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '-0.02em' }}>
          {profile.name}
        </Display>
        <Body profile={profile} size={10} color={inkOn(accent)} style={{ opacity: 0.8, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Brand · 2026
        </Body>
      </div>

      {/* screen + desk accent (lower-third) */}
      <div style={{ position: 'absolute', left: '42%', bottom: '12%', width: 240, height: 140, background: '#111', borderRadius: 10, border: '2px solid #222', overflow: 'hidden' }}>
        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${shiftLightness(accent, -0.1)} 0%, ${accent} 50%, ${shiftLightness(accent, -0.4)} 100%)`, padding: 16, color: inkOn(accent), display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <LogoMark profile={profile} variant="iconmark" height={14} color={inkOn(accent)} />
          <div>
            <Body profile={profile} size={12} color={inkOn(accent)} style={{ fontWeight: 700, lineHeight: 1.15 }}>
              Integrity &amp; Trust — Data Handled With Responsibility
            </Body>
            <Body profile={profile} size={8} color={inkOn(accent)} style={{ opacity: 0.8, marginTop: 8 }}>
              Built on Accuracy, Driven by Insight
            </Body>
          </div>
        </div>
      </div>

      {/* metadata */}
      <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <LogoMark profile={profile} variant="white" height={22} color="#fff" />
        <Body profile={profile} size={12} color="#fff" style={{ opacity: 0.9 }}>
          {profile.name}
        </Body>
      </div>
      <div style={{ position: 'absolute', bottom: 24, right: 32 }}>
        <Body profile={profile} size={12} color="#fff" style={{ opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Environmental · Flagship Mockup
        </Body>
      </div>
    </SlideFrame>
  );
}

export function EnvironmentalB({ index, profile }: Props) {
  const bg = '#DCD4CB';
  const ink = '#1a1a1a';
  const accent = profile.palette.primary;

  return (
    <SlideFrame index={index} archetype="environmental" variant="B" background={bg} ink={ink}>
      {/* concrete texture */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, #dcd4cb 0%, #c3b9ad 40%, #a69d90 100%)' }} />
      <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.25 }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <circle
            key={i}
            cx={(i * 197) % 1920}
            cy={(i * 283) % 1080}
            r={(i % 5) + 2}
            fill="#888"
            opacity={0.3}
          />
        ))}
      </svg>
      {/* wall strip for signage */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 260, height: 520, background: 'linear-gradient(180deg, #c9c0b6 0%, #b2a89c 100%)', boxShadow: '0 30px 60px -20px rgba(0,0,0,0.2)' }}>
        {/* 3D shadowed metal letters */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Display profile={profile} size={280} weight={900} color={accent} style={{ letterSpacing: '-0.055em', filter: `drop-shadow(0 26px 18px rgba(0,0,0,0.35)) drop-shadow(-6px 6px 0 ${shiftLightness(accent, -0.2)})` }}>
            {profile.name}
          </Display>
        </div>
      </div>
      {/* brand strip */}
      <div style={{ position: 'absolute', top: 40, left: 40, right: 40, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LogoMark profile={profile} variant="black" height={26} color="#1a1a1a" />
        </div>
        <Body profile={profile} size={13} color="#1a1a1a" style={{ opacity: 0.7, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Environmental · Lobby Signage
        </Body>
      </div>
      <div style={{ position: 'absolute', bottom: 80, left: 0, right: 0, textAlign: 'center' }}>
        <Body profile={profile} size={18} color="#1a1a1a" style={{ letterSpacing: '0.32em', textTransform: 'uppercase', opacity: 0.7 }}>
          {profile.tagline.slice(0, 80)}
        </Body>
      </div>
    </SlideFrame>
  );
}

export function EnvironmentalC({ index, profile }: Props) {
  const bg = profile.palette.primary;
  const ink = inkOn(bg);

  return (
    <SlideFrame index={index} archetype="environmental" variant="C" background={bg} ink={ink}>
      {/* sunset sky */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${shiftLightness(bg, 0.25)} 0%, ${bg} 50%, ${shiftLightness(bg, -0.25)} 100%)` }} />
      {/* silhouette crowd */}
      <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 200, opacity: 0.6 }}>
        {Array.from({ length: 40 }).map((_, i) => {
          const x = i * 48;
          const h = 80 + Math.abs(Math.sin(i * 0.7)) * 100;
          return (
            <g key={i} transform={`translate(${x} ${200 - h})`}>
              <ellipse cx={16} cy={10} rx={10} ry={12} fill="#000" />
              <rect x={4} y={22} width={24} height={h - 22} fill="#000" />
            </g>
          );
        })}
      </svg>
      {/* banner frame */}
      <div style={{ position: 'absolute', left: '12%', top: '18%', width: '76%', height: '48%', background: 'rgba(0,0,0,0.35)', border: `6px solid rgba(0,0,0,0.4)`, boxShadow: '0 60px 80px -30px rgba(0,0,0,0.5)' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${shiftLightness(bg, 0.1)} 0%, ${bg} 50%, ${shiftLightness(bg, -0.2)} 100%)` }} />
        <div style={{ position: 'absolute', top: 32, left: 32, right: 32, display: 'flex', justifyContent: 'space-between' }}>
          <Body profile={profile} size={20} color={ink} style={{ letterSpacing: '0.12em', fontWeight: 600 }}>
            Powering Growth Through {profile.name}
          </Body>
          <LogoMark profile={profile} variant="white" height={40} color={ink} />
        </div>
        <div style={{ position: 'absolute', bottom: 32, left: 32, right: 32 }}>
          <Display profile={profile} size={170} weight={900} color={ink} style={{ letterSpacing: '-0.045em', lineHeight: 0.95 }}>
            {profile.name}<span style={{ fontSize: '0.22em', verticalAlign: 'super' }}>™</span>
          </Display>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 32, right: 40 }}>
        <Body profile={profile} size={12} color={ink} style={{ opacity: 0.85, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Activation · Outdoor Event
        </Body>
      </div>
    </SlideFrame>
  );
}
