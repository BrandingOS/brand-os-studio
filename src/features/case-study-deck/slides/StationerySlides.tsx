/**
 * Stationery archetype — 3 variants.
 *
 *   A — Overhead flatlay with folder, envelope, letterhead, business cards.
 *       Matches reference Fexilc slide 7.
 *   B — Isometric stack of items.
 *   C — Individual hero shots — 3 items in a row.
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

export function StationeryA({ index, profile }: Props) {
  const bg = '#EFEBE6';
  const ink = '#111';
  const accent = profile.palette.primary;
  const accentInk = inkOn(accent);
  const dark = profile.palette.ink;

  return (
    <SlideFrame index={index} archetype="stationery" variant="A" background={bg} ink={ink}>
      {/* subtle paper texture */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 60% 50%, #f1ede8 0%, ${bg} 100%)` }} />

      {/* folder — large */}
      <div
        style={{
          position: 'absolute',
          left: 420,
          top: 200,
          width: 720,
          height: 900,
          background: accent,
          color: accentInk,
          padding: 48,
          boxShadow: '0 80px 120px -40px rgba(0,0,0,0.5)',
          transform: 'rotate(-6deg)',
        }}
      >
        <div style={{ position: 'absolute', top: 48, left: 48, right: 48, display: 'flex', justifyContent: 'space-between', opacity: 0.85 }}>
          <Body profile={profile} size={12} color={accentInk}>info@{profile.name.toLowerCase().replace(/\s+/g, '')}.com</Body>
          <Body profile={profile} size={12} color={accentInk}>contact@{profile.name.toLowerCase().replace(/\s+/g, '')}.com</Body>
        </div>
        {/* envelope flap triangle */}
        <svg viewBox="0 0 720 900" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <path d="M40,820 L400,460 L680,820" stroke={accentInk} strokeOpacity="0.35" strokeWidth="1.5" fill="none" />
        </svg>
        <div style={{ position: 'absolute', bottom: 60, left: 48 }}>
          <Display profile={profile} size={110} weight={900} color={accentInk} style={{ letterSpacing: '-0.04em' }}>
            {profile.name}
            <span style={{ fontSize: '0.3em', verticalAlign: 'super' }}>™</span>
          </Display>
        </div>
      </div>

      {/* letterhead paper — right */}
      <div
        style={{
          position: 'absolute',
          right: 140,
          top: 120,
          width: 540,
          height: 640,
          background: '#fff',
          padding: 44,
          boxShadow: '0 60px 90px -30px rgba(0,0,0,0.25)',
          transform: 'rotate(4deg)',
        }}
      >
        <Body profile={profile} size={11} color={ink} style={{ textAlign: 'right', opacity: 0.85, marginBottom: 18 }}>info@{profile.name.toLowerCase().replace(/\s+/g, '')}.com</Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{ height: 1, background: '#ccc' }} />
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 40, left: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
          <LogoMark profile={profile} variant="black" height={22} color={ink} />
          <Display profile={profile} size={30} weight={800} color={ink}>{profile.name}</Display>
        </div>
      </div>

      {/* letterhead — bottom right */}
      <div
        style={{
          position: 'absolute',
          right: 240,
          bottom: 100,
          width: 520,
          height: 340,
          background: '#fff',
          padding: 40,
          boxShadow: '0 40px 80px -30px rgba(0,0,0,0.25)',
          transform: 'rotate(-5deg)',
        }}
      >
        <Body profile={profile} size={11} color={ink} style={{ opacity: 0.7, marginBottom: 14 }}>contact@{profile.name.toLowerCase().replace(/\s+/g, '')}.com</Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ height: 1, background: '#ccc' }} />
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 24, right: 30, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ padding: '6px 14px', background: accent, color: accentInk, fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>{profile.name}</span>
        </div>
      </div>

      {/* business cards */}
      <div style={{ position: 'absolute', left: 140, bottom: 220, transform: 'rotate(-20deg)' }}>
        <div style={{ width: 300, height: 180, background: dark, color: accent, padding: 22, borderRadius: 4, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <LogoMark profile={profile} variant="white" height={22} color={accent} />
          <Body profile={profile} size={11} color={accent} style={{ letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.8 }}>
            info@{profile.name.toLowerCase().replace(/\s+/g, '')}.com
          </Body>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 260, bottom: 120, transform: 'rotate(-14deg)' }}>
        <div style={{ width: 300, height: 180, background: accent, color: accentInk, padding: 22, borderRadius: 4, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 22, fontWeight: 800 }}>{profile.name}</span>
          <Body profile={profile} size={11} color={accentInk} style={{ opacity: 0.85 }}>
            {profile.tagline.slice(0, 40)}
          </Body>
        </div>
      </div>

      {/* meta */}
      <div style={{ position: 'absolute', top: 40, left: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
        <LogoMark profile={profile} variant="black" height={22} color={ink} />
      </div>
      <div style={{ position: 'absolute', bottom: 32, right: 40 }}>
        <Body profile={profile} size={12} color={ink} style={{ opacity: 0.55, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Stationery · Collateral
        </Body>
      </div>
    </SlideFrame>
  );
}

export function StationeryB({ index, profile }: Props) {
  const bg = '#0A0A0A';
  const ink = '#FFF';
  const accent = profile.palette.primary;

  return (
    <SlideFrame index={index} archetype="stationery" variant="B" background={bg} ink={ink}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 60%, ${shiftLightness(bg, 0.08)} 0%, #000 100%)` }} />

      {/* 4 stacked items, isometric style */}
      <div style={{ position: 'absolute', inset: 120, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 24 }}>
        {/* business card stack */}
        <div style={{ position: 'relative' }}>
          <Body profile={profile} size={12} color={accent} style={{ letterSpacing: '0.24em', textTransform: 'uppercase' }}>Cards</Body>
          <div style={{ position: 'absolute', top: 60, left: 10, width: 320, height: 200, background: accent, borderRadius: 6, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7)' }} />
          <div style={{ position: 'absolute', top: 90, left: 40, width: 320, height: 200, background: '#FFF', borderRadius: 6, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7)', padding: 22, color: '#111', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <LogoMark profile={profile} variant="black" height={20} color="#111" />
            <div>
              <Body profile={profile} size={14} color="#111" style={{ fontWeight: 700 }}>{profile.name}</Body>
              <Body profile={profile} size={10} color="#111" style={{ opacity: 0.7 }}>www.{profile.name.toLowerCase().replace(/\s+/g, '')}.com</Body>
            </div>
          </div>
        </div>
        {/* letterhead */}
        <div style={{ position: 'relative' }}>
          <Body profile={profile} size={12} color={accent} style={{ letterSpacing: '0.24em', textTransform: 'uppercase' }}>Letterhead</Body>
          <div style={{ position: 'absolute', top: 60, width: 280, height: 400, background: '#FFF', borderRadius: 6, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7)', padding: 20 }}>
            <LogoMark profile={profile} variant="black" height={16} color="#111" />
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 10 }).map((_, i) => <div key={i} style={{ height: 1, background: '#ddd' }} />)}
            </div>
          </div>
        </div>
        {/* envelope */}
        <div style={{ position: 'relative' }}>
          <Body profile={profile} size={12} color={accent} style={{ letterSpacing: '0.24em', textTransform: 'uppercase' }}>Envelope</Body>
          <div style={{ position: 'absolute', top: 60, width: 320, height: 220, background: '#111', borderRadius: 6, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7)', border: `2px solid ${accent}` }}>
            <svg viewBox="0 0 320 220" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <path d="M0,220 L160,100 L320,220" stroke={accent} strokeOpacity="0.5" strokeWidth="2" fill="none" />
            </svg>
            <div style={{ position: 'absolute', bottom: 16, left: 16 }}>
              <LogoMark profile={profile} variant="white" height={22} color="#fff" />
            </div>
          </div>
        </div>
        {/* notebook */}
        <div style={{ position: 'relative' }}>
          <Body profile={profile} size={12} color={accent} style={{ letterSpacing: '0.24em', textTransform: 'uppercase' }}>Notebook</Body>
          <div style={{ position: 'absolute', top: 60, width: 240, height: 320, background: accent, borderRadius: 8, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Display profile={profile} size={60} weight={900} color={inkOn(accent)} style={{ textAlign: 'center', letterSpacing: '-0.04em' }}>
              {profile.name}
            </Display>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 60, left: 80, right: 80, display: 'flex', justifyContent: 'space-between' }}>
        <Body profile={profile} size={13} color={ink} style={{ opacity: 0.6, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          · §09 Collateral
        </Body>
        <LogoMark profile={profile} variant="white" height={30} color={ink} />
      </div>
      <div style={{ position: 'absolute', bottom: 60, left: 80 }}>
        <Display profile={profile} size={70} weight={700} color={ink} style={{ letterSpacing: '-0.02em' }}>
          Tactile craft.
        </Display>
      </div>
    </SlideFrame>
  );
}

export function StationeryC({ index, profile }: Props) {
  const bg = profile.palette.paper;
  const ink = profile.palette.ink;
  const accent = profile.palette.primary;

  return (
    <SlideFrame index={index} archetype="stationery" variant="C" background={bg} ink={ink}>
      <div style={{ position: 'absolute', top: 80, left: 96, right: 96, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <Body profile={profile} size={13} color={accent} style={{ letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 10 }}>· §09 Stationery · Hero</Body>
          <Display profile={profile} size={72} weight={700} color={ink} style={{ letterSpacing: '-0.02em' }}>
            Three objects, one system.
          </Display>
        </div>
        <LogoMark profile={profile} variant="black" height={34} color={ink} />
      </div>
      <div style={{ position: 'absolute', top: 320, left: 96, right: 96, bottom: 80, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30 }}>
        {/* item 1: folder */}
        <div style={{ borderRadius: 24, background: accent, padding: 40, position: 'relative', overflow: 'hidden', color: inkOn(accent), display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Body profile={profile} size={12} color={inkOn(accent)} style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>01 · Folder</Body>
          <Display profile={profile} size={82} weight={900} color={inkOn(accent)} style={{ letterSpacing: '-0.04em' }}>{profile.name}<span style={{ fontSize: '0.25em', verticalAlign: 'super' }}>™</span></Display>
          <svg viewBox="0 0 400 400" style={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
            <path d="M30,380 L200,150 L370,380" stroke={inkOn(accent)} strokeWidth="2" fill="none" />
          </svg>
        </div>
        {/* item 2: card front */}
        <div style={{ borderRadius: 24, background: '#fff', padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: `1px solid ${ink}10`, color: ink }}>
          <Body profile={profile} size={12} color={accent} style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>02 · Card</Body>
          <div>
            <LogoMark profile={profile} variant="black" height={44} color={ink} />
            <Display profile={profile} size={44} weight={700} color={ink} style={{ letterSpacing: '-0.015em', marginTop: 18 }}>
              {profile.name}
            </Display>
          </div>
          <Body profile={profile} size={14} color={ink} style={{ opacity: 0.7 }}>www.{profile.name.toLowerCase().replace(/\s+/g, '')}.com</Body>
        </div>
        {/* item 3: envelope */}
        <div style={{ borderRadius: 24, background: ink, padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: accent, position: 'relative', overflow: 'hidden' }}>
          <Body profile={profile} size={12} color={accent} style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>03 · Envelope</Body>
          <svg viewBox="0 0 400 400" style={{ position: 'absolute', left: 0, top: 60, width: '100%', height: '60%', opacity: 0.4 }}>
            <path d="M0,320 L200,100 L400,320" stroke={accent} strokeWidth="2" fill="none" />
          </svg>
          <div>
            <Display profile={profile} size={54} weight={900} color={accent}>{profile.name}</Display>
            <Body profile={profile} size={13} color={accent} style={{ opacity: 0.75, marginTop: 10 }}>contact@{profile.name.toLowerCase().replace(/\s+/g, '')}.com</Body>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
