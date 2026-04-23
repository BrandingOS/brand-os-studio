/**
 * Outdoor archetype — 3 variants.
 *
 *   A — Mesh banner on fence (matches reference Fexilc slide 8) + side poster.
 *   B — Highway billboard mockup.
 *   C — Metro / transit poster.
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

export function OutdoorA({ index, profile }: Props) {
  const bg = '#8F9B96';
  const ink = '#1a1a1a';
  const accent = profile.palette.primary;

  return (
    <SlideFrame index={index} archetype="outdoor" variant="A" background={bg} ink={ink}>
      {/* industrial bg */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #e8e8e8 0%, #9ea39d 45%, #7f8379 100%)' }} />
      {/* ceiling beams */}
      <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.6 }}>
        <rect x="0" y="0" width="1920" height="140" fill="#2a2a2a" />
        <line x1="0" y1="120" x2="1920" y2="120" stroke="#111" strokeWidth="2" />
        <rect x="360" y="140" width="1200" height="16" fill="#4a4a4a" />
        <rect x="340" y="140" width="20" height="800" fill="#5a5a5a" />
        <rect x="1560" y="140" width="20" height="800" fill="#5a5a5a" />
        {/* chain link suggestion */}
        {Array.from({ length: 30 }).map((_, i) => (
          <line key={i} x1={400 + i * 40} y1="160" x2={400 + i * 40} y2="800" stroke="#666" strokeWidth="1" opacity="0.5" />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`h-${i}`} x1="380" y1={200 + i * 50} x2="1560" y2={200 + i * 50} stroke="#666" strokeWidth="1" opacity="0.5" />
        ))}
      </svg>
      {/* main mesh banner */}
      <div
        style={{
          position: 'absolute',
          left: '18%',
          top: '16%',
          width: '56%',
          height: '56%',
          background: `linear-gradient(180deg, ${accent} 0%, ${shiftLightness(accent, -0.15)} 100%)`,
          color: inkOn(accent),
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 60px 100px -30px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Body profile={profile} size={28} color={inkOn(accent)} style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            Powering Growth<br />Through {profile.name}
          </Body>
          <Body profile={profile} size={22} color={inkOn(accent)} style={{ textAlign: 'right' }}>
            www.{profile.name.toLowerCase().replace(/\s+/g, '')}.com
          </Body>
        </div>
        <Display profile={profile} size={310} weight={900} color={inkOn(accent)} style={{ letterSpacing: '-0.05em', lineHeight: 0.95 }}>
          {profile.name}
          <span style={{ fontSize: '0.2em', verticalAlign: 'super', marginLeft: 6 }}>™</span>
        </Display>
      </div>

      {/* side poster (dark) */}
      <div
        style={{
          position: 'absolute',
          right: '2%',
          top: '18%',
          width: '18%',
          height: '52%',
          background: '#111',
          color: accent,
          padding: 30,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 60px 100px -30px rgba(0,0,0,0.5)',
        }}
      >
        <Body profile={profile} size={18} color="#fff" style={{ fontWeight: 700, lineHeight: 1.2 }}>
          Powering Growth<br />Through {profile.name}
        </Body>
        <Display profile={profile} size={110} weight={900} color={accent} style={{ letterSpacing: '-0.04em' }}>
          {profile.name.slice(0, 3)}
        </Display>
      </div>

      {/* pipes and floor */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(180deg, #777 0%, #4a4a4a 100%)' }} />
      <div style={{ position: 'absolute', bottom: 80, left: 0, height: 80, width: 240, background: 'linear-gradient(180deg, #666 0%, #333 100%)', borderRadius: '0 40px 40px 0' }} />

      <div style={{ position: 'absolute', top: 20, left: 30 }}>
        <Body profile={profile} size={12} color="#fff" style={{ opacity: 0.8, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          · §10 Outdoor · Mesh Banner
        </Body>
      </div>
    </SlideFrame>
  );
}

export function OutdoorB({ index, profile }: Props) {
  const bg = '#1a1e27';
  const ink = '#fff';
  const accent = profile.palette.primary;

  return (
    <SlideFrame index={index} archetype="outdoor" variant="B" background={bg} ink={ink}>
      {/* twilight sky */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #b47c6f 0%, #6b4c4a 35%, #2a2a3a 70%, #0a0a14 100%)' }} />
      {/* city silhouette */}
      <svg viewBox="0 0 1920 600" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 300, width: '100%', opacity: 0.55 }}>
        <path d="M0,600 L0,400 L80,400 L80,340 L160,340 L160,450 L250,450 L250,320 L340,320 L340,400 L430,400 L430,280 L540,280 L540,400 L640,400 L640,350 L740,350 L740,280 L860,280 L860,360 L960,360 L960,320 L1060,320 L1060,420 L1180,420 L1180,360 L1280,360 L1280,300 L1380,300 L1380,400 L1480,400 L1480,360 L1580,360 L1580,260 L1700,260 L1700,380 L1820,380 L1820,430 L1920,430 L1920,600 Z" fill="#0f1017" />
      </svg>

      {/* billboard */}
      <div
        style={{
          position: 'absolute',
          left: '16%',
          top: '16%',
          width: '68%',
          height: '44%',
          background: accent,
          color: inkOn(accent),
          padding: 60,
          boxShadow: '0 60px 100px -30px rgba(0,0,0,0.7)',
          border: '10px solid #0a0a0a',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
          <LogoMark profile={profile} variant="white" height={56} color={inkOn(accent)} />
          <Body profile={profile} size={18} color={inkOn(accent)} style={{ letterSpacing: '0.22em', textTransform: 'uppercase', textAlign: 'right' }}>
            Highway<br />Billboard
          </Body>
        </div>
        <Display profile={profile} size={180} weight={900} color={inkOn(accent)} style={{ letterSpacing: '-0.045em', lineHeight: 0.92 }}>
          {profile.tagline.slice(0, 44)}
        </Display>
      </div>
      {/* billboard pole */}
      <div style={{ position: 'absolute', left: '49%', top: '60%', width: 30, height: 220, background: 'linear-gradient(180deg, #222 0%, #0a0a0a 100%)' }} />
      <div style={{ position: 'absolute', left: '46%', top: '60%', width: 120, height: 20, background: '#111' }} />

      <div style={{ position: 'absolute', bottom: 30, left: 40, right: 40, display: 'flex', justifyContent: 'space-between' }}>
        <Body profile={profile} size={12} color={ink} style={{ opacity: 0.7, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          · §10 Outdoor · Highway
        </Body>
        <Body profile={profile} size={12} color={ink} style={{ opacity: 0.5 }}>
          {profile.name} · © {new Date().getFullYear()}
        </Body>
      </div>
    </SlideFrame>
  );
}

export function OutdoorC({ index, profile }: Props) {
  const bg = '#1a1a1a';
  const ink = '#fff';
  const accent = profile.palette.primary;

  return (
    <SlideFrame index={index} archetype="outdoor" variant="C" background={bg} ink={ink}>
      {/* metro tiles bg */}
      <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <pattern id="tile" width="80" height="80" patternUnits="userSpaceOnUse">
            <rect width="80" height="80" fill="#f0efeb" />
            <rect x="1" y="1" width="78" height="78" fill="#e8e6df" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tile)" />
        <rect x="0" y="0" width="1920" height="1080" fill="#1a1a1a" opacity="0.45" />
      </svg>

      {/* poster frame */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 680,
          height: 880,
          background: accent,
          color: inkOn(accent),
          padding: 50,
          boxShadow: '0 60px 100px -30px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <LogoMark profile={profile} variant="white" height={56} color={inkOn(accent)} />
          <Display profile={profile} size={90} weight={900} color={inkOn(accent)} style={{ letterSpacing: '-0.04em', marginTop: 24, lineHeight: 0.95 }}>
            {profile.tagline.length > 60 ? profile.tagline.slice(0, 58) + '…' : profile.tagline}
          </Display>
        </div>
        <div>
          <Body profile={profile} size={20} color={inkOn(accent)} style={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.9, marginBottom: 10 }}>
            Take the line that thinks.
          </Body>
          <Body profile={profile} size={16} color={inkOn(accent)} style={{ opacity: 0.7 }}>
            www.{profile.name.toLowerCase().replace(/\s+/g, '')}.com
          </Body>
        </div>
      </div>

      {/* ambient light + people silhouettes */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, transparent 0%, rgba(0,0,0,0.4) 80%)' }} />
      <svg viewBox="0 0 1920 300" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: 200, opacity: 0.5 }}>
        <rect x="100" y="140" width="24" height="180" fill="#000" />
        <circle cx="112" cy="120" r="22" fill="#000" />
        <rect x="1700" y="120" width="26" height="200" fill="#000" />
        <circle cx="1713" cy="100" r="22" fill="#000" />
      </svg>
      <div style={{ position: 'absolute', top: 24, left: 36 }}>
        <Body profile={profile} size={12} color="#fff" style={{ opacity: 0.8, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          · §10 Outdoor · Metro Poster
        </Body>
      </div>
    </SlideFrame>
  );
}
