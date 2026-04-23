/**
 * Digital archetype — 3 variants.
 *
 *   A — Laptop on desk with branded website screenshot.
 *       Matches reference Fexilc slide 6.
 *   B — Phone stack (3 phones fanned) showing app flow.
 *   C — Dashboard collage (large screen + small cards).
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

/** Tiny website mock rendered inside a laptop screen. */
function WebsiteScreen({ profile }: { profile: BrandProfile }) {
  const bg = profile.palette.primary;
  const ink = inkOn(bg);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, #14110e 0%, ${shiftLightness(bg, -0.6)} 100%)`,
        color: '#fff',
        padding: '18px 42px 18px 42px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* topbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark profile={profile} variant="white" height={20} color="#fff" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 13, color: '#fff' }}>
          <span>Home</span>
          <span style={{ opacity: 0.7 }}>Products</span>
          <span style={{ opacity: 0.7 }}>Pricing</span>
          <span style={{ padding: '6px 14px', background: bg, color: ink, borderRadius: 999, fontWeight: 600 }}>Demo</span>
          <span style={{ padding: '6px 14px', border: `1px solid ${bg}`, color: bg, borderRadius: 999, fontWeight: 600 }}>Sign up</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
        <Display profile={profile} size={46} weight={800} color={bg} style={{ lineHeight: 1.05, textAlign: 'center' }}>
          Smarter Decisions<br />Start with Better Data
        </Display>
        <Body profile={profile} size={11} color="#fff" style={{ textAlign: 'center', opacity: 0.8, maxWidth: 430, lineHeight: 1.55 }}>
          Welcome to {profile.name}, where cutting-edge technology meets user-friendly solutions. Join us in shaping a future where innovation is accessible to all.
        </Body>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <span style={{ padding: '8px 16px', background: bg, color: ink, borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Book demo</span>
          <span style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${bg}`, color: bg, borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Get a free access</span>
        </div>
      </div>

      {/* fake logos row */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 32, marginTop: 18, opacity: 0.78, fontSize: 15, fontWeight: 600, color: '#fff', fontStyle: 'italic' }}>
        <span>Davent Tech.</span>
        <span style={{ fontFamily: 'serif' }}>Motors X</span>
        <span>Engin<span style={{ color: bg }}>ee</span>z</span>
        <span>Space <span style={{ border: '1px solid #fff', borderRadius: '50%', padding: '0 6px' }}>Z</span></span>
      </div>

      {/* bottom accent bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 30, background: `linear-gradient(90deg, transparent 0%, ${bg} 40%, ${bg} 100%)` }} />

      <div style={{ position: 'absolute', left: 42, bottom: 46 }}>
        <Body profile={profile} size={13} color="#fff" style={{ fontWeight: 600 }}>
          How We're?
        </Body>
      </div>
    </div>
  );
}

function Laptop({ profile, style }: { profile: BrandProfile; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'absolute', ...style }}>
      {/* laptop body */}
      <div
        style={{
          position: 'relative',
          width: 1080,
          perspective: 2400,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* screen */}
        <div
          style={{
            width: 1080,
            height: 676,
            borderRadius: 14,
            background: '#0a0a0a',
            padding: 14,
            transform: 'rotateX(8deg) rotateY(-14deg) rotateZ(2deg)',
            boxShadow: '0 80px 140px -40px rgba(0,0,0,0.8), 0 40px 60px -20px rgba(0,0,0,0.6)',
            border: '2px solid #1c1c1c',
          }}
        >
          <div style={{ width: '100%', height: '100%', borderRadius: 4, overflow: 'hidden', background: '#000' }}>
            <WebsiteScreen profile={profile} />
          </div>
        </div>
        {/* base */}
        <div
          style={{
            width: 1180,
            height: 24,
            marginLeft: -50,
            marginTop: -8,
            background: 'linear-gradient(180deg, #1b1b1b 0%, #0a0a0a 100%)',
            transform: 'rotateX(60deg) rotateY(-14deg) rotateZ(2deg) translateY(40px)',
            borderRadius: 12,
            boxShadow: '0 40px 100px -20px rgba(0,0,0,0.8)',
          }}
        />
      </div>
    </div>
  );
}

export function DigitalA({ index, profile }: Props) {
  const bg = '#080808';
  const ink = '#fff';
  return (
    <SlideFrame index={index} archetype="digital" variant="A" background={bg} ink={ink}>
      {/* soft light pool */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 70%, #1f1a18 0%, #050505 70%)' }} />
      {/* desk edge */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 220, background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 100%)' }} />
      <Laptop profile={profile} style={{ left: 420, top: 170 }} />

      <div style={{ position: 'absolute', top: 60, left: 80, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: 1760 }}>
        <LogoMark profile={profile} variant="white" height={34} color={ink} />
        <Body profile={profile} size={13} color={ink} style={{ opacity: 0.6, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          Digital Presence · §08
        </Body>
      </div>
      <div style={{ position: 'absolute', bottom: 48, left: 80, right: 80, display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
        <Body profile={profile} size={12} color={ink} style={{ opacity: 0.5, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Website · Marketing
        </Body>
        <Display profile={profile} size={40} weight={700} color={ink} style={{ textAlign: 'right', letterSpacing: '-0.015em', opacity: 0.95 }}>
          www.{profile.name.toLowerCase().replace(/\s+/g, '')}.com
        </Display>
      </div>
    </SlideFrame>
  );
}

export function DigitalB({ index, profile }: Props) {
  const bg = profile.palette.primary;
  const ink = inkOn(bg);
  return (
    <SlideFrame index={index} archetype="digital" variant="B" background={bg} ink={ink}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 60%, ${shiftLightness(bg, 0.08)} 0%, ${shiftLightness(bg, -0.2)} 100%)` }} />
      {/* 3 phones */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
        {[-18, 0, 18].map((rot, i) => (
          <div key={i} style={{ width: 300, height: 620, background: '#0A0A0A', borderRadius: 46, padding: 8, transform: `rotate(${rot}deg) translateY(${i === 1 ? -30 : 0}px)`, boxShadow: '0 60px 100px -30px rgba(0,0,0,0.5)', border: '2px solid #222' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: 40, background: i === 1 ? `linear-gradient(180deg, ${shiftLightness(bg, 0.18)} 0%, ${bg} 50%, ${shiftLightness(bg, -0.25)} 100%)` : '#ECE9E2', color: i === 1 ? ink : '#111', padding: '46px 20px 26px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <LogoMark profile={profile} variant={i === 1 ? 'white' : 'black'} height={18} color={i === 1 ? ink : '#111'} />
                <span style={{ fontSize: 10, opacity: 0.7 }}>·</span>
              </div>
              <div>
                <Display profile={profile} size={i === 1 ? 34 : 28} weight={800} color={i === 1 ? ink : '#111'} style={{ letterSpacing: '-0.02em', lineHeight: 1.05 }}>
                  {i === 0 ? 'Welcome' : i === 1 ? profile.tagline.slice(0, 40) : 'Sign in'}
                </Display>
                <Body profile={profile} size={11} color={i === 1 ? ink : '#111'} style={{ opacity: 0.8, marginTop: 10 }}>
                  {i === 0 ? 'Get started in seconds' : i === 1 ? 'Built for the way you work' : 'Enter your email'}
                </Body>
              </div>
              <div style={{ height: 38, borderRadius: 999, background: i === 1 ? '#fff' : profile.palette.primary, color: i === 1 ? profile.palette.primary : inkOn(profile.palette.primary), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
                Continue →
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 60, left: 80, right: 80, display: 'flex', justifyContent: 'space-between' }}>
        <Body profile={profile} size={13} color={ink} style={{ opacity: 0.8, letterSpacing: '0.24em', textTransform: 'uppercase' }}>
          · Digital · Product Screens
        </Body>
        <LogoMark profile={profile} variant="white" height={34} color={ink} />
      </div>
      <div style={{ position: 'absolute', bottom: 48, left: 80 }}>
        <Display profile={profile} size={44} weight={700} color={ink} style={{ letterSpacing: '-0.015em' }}>
          Feel it in your pocket.
        </Display>
      </div>
    </SlideFrame>
  );
}

export function DigitalC({ index, profile }: Props) {
  const bg = '#F1EDE7';
  const ink = '#111';
  const accent = profile.palette.primary;

  return (
    <SlideFrame index={index} archetype="digital" variant="C" background={bg} ink={ink}>
      <div style={{ position: 'absolute', top: 64, left: 80, right: 80, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <Body profile={profile} size={13} color={accent} style={{ letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 8 }}>
            · §08 Product Dashboard
          </Body>
          <Display profile={profile} size={66} weight={700} color={ink} style={{ letterSpacing: '-0.02em' }}>
            Data in uniform.
          </Display>
        </div>
        <LogoMark profile={profile} variant="black" height={30} color={ink} />
      </div>

      {/* Main dashboard */}
      <div style={{ position: 'absolute', left: 80, top: 260, right: 80, bottom: 80, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            <Body profile={profile} size={15} color={ink} style={{ fontWeight: 600 }}>Revenue · 7d</Body>
            <Body profile={profile} size={13} color={accent} style={{ fontWeight: 700 }}>+18.4%</Body>
          </div>
          <svg viewBox="0 0 600 180" style={{ width: '100%', height: 260 }}>
            <path d="M0,140 C80,110 160,150 240,90 C320,40 400,130 480,70 C540,30 580,50 600,40" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M0,140 C80,110 160,150 240,90 C320,40 400,130 480,70 C540,30 580,50 600,40 L600,180 L0,180 Z" fill={accent} opacity="0.15" />
          </svg>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 18 }}>
            {['Active', 'Conversion', 'Churn', 'LTV'].map((label, i) => (
              <div key={label} style={{ borderTop: `1px solid ${ink}10`, paddingTop: 10 }}>
                <Body profile={profile} size={11} color={ink} style={{ opacity: 0.7, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{label}</Body>
                <Display profile={profile} size={26} weight={700} color={ink} style={{ marginTop: 2 }}>
                  {[ '4.2k', '3.7%', '1.1%', '$2.8k' ][i]}
                </Display>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr 1fr', gap: 16 }}>
          {['Insights', 'Alerts', 'Pipelines'].map((title, i) => (
            <div key={title} style={{ background: i === 0 ? accent : '#fff', color: i === 0 ? inkOn(accent) : ink, borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Body profile={profile} size={13} color={i === 0 ? inkOn(accent) : ink} style={{ letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.9 }}>
                {title}
              </Body>
              <Display profile={profile} size={32} weight={700} color={i === 0 ? inkOn(accent) : ink} style={{ letterSpacing: '-0.015em' }}>
                {[ 'Signals powering growth', '3 anomalies detected', '12 flows synced' ][i]}
              </Display>
            </div>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}
