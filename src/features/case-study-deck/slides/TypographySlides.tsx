/**
 * Typography archetype — 3 variants.
 *
 *   A — Editorial specimen with family name, weight ladder, pangram.
 *   B — Size ladder (h1 → caption) on same phrase, paper bg.
 *   C — Split composition: product slot + huge tagline with inline logo.
 *       Matches reference Fexilc slide 5.
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

export function TypographyA({ index, profile }: Props) {
  const bg = profile.palette.paper;
  const ink = profile.palette.ink;
  const accent = profile.palette.primary;
  const family = profile.typography.headingFamily;

  return (
    <SlideFrame index={index} archetype="typography" variant="A" background={bg} ink={ink}>
      {/* Head */}
      <div style={{ position: 'absolute', top: 80, left: 96, right: 96, display: 'flex', justifyContent: 'space-between' }}>
        <Body profile={profile} size={14} color={accent} style={{ letterSpacing: '0.28em', textTransform: 'uppercase' }}>
          · §05 Typography
        </Body>
        <LogoMark profile={profile} variant="black" height={28} color={ink} />
      </div>
      {/* Giant Aa + family */}
      <div style={{ position: 'absolute', left: 96, top: 160, width: 900, height: 780, background: ink, color: bg, borderRadius: 28, padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Body profile={profile} size={14} color={accent} style={{ letterSpacing: '0.28em', textTransform: 'uppercase' }}>
          Display
        </Body>
        <Display profile={profile} size={520} weight={900} color={bg} style={{ letterSpacing: '-0.06em', lineHeight: 0.85 }}>
          Aa
        </Display>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
          <Display profile={profile} size={40} weight={700} color={bg}>
            {family}
          </Display>
          <Body profile={profile} size={14} color={bg} style={{ opacity: 0.7, fontFamily: 'ui-monospace, monospace' }}>
            400 · 500 · 700 · 800 · 900
          </Body>
        </div>
      </div>
      {/* Specimen ladder */}
      <div style={{ position: 'absolute', right: 96, top: 160, width: 760, height: 780, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <Body profile={profile} size={12} color={accent} style={{ letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 12 }}>
            Pangram
          </Body>
          <Display profile={profile} size={78} weight={700} color={ink} style={{ letterSpacing: '-0.02em', lineHeight: 1.02 }}>
            The craft is the message. Every letterform carries intent.
          </Display>
        </div>
        <div style={{ borderTop: `1px solid ${ink}33`, paddingTop: 36 }}>
          <Display profile={profile} size={110} weight={900} color={ink} style={{ letterSpacing: '-0.04em' }}>
            Heading 01
          </Display>
          <Display profile={profile} size={72} weight={700} color={ink} style={{ letterSpacing: '-0.03em', marginTop: 12 }}>
            Heading 02
          </Display>
          <Display profile={profile} size={44} weight={600} color={ink} style={{ letterSpacing: '-0.02em', marginTop: 12 }}>
            Heading 03
          </Display>
        </div>
        <div style={{ borderTop: `1px solid ${ink}33`, paddingTop: 24 }}>
          <Body profile={profile} size={22} color={ink} style={{ lineHeight: 1.55, maxWidth: 600 }}>
            {profile.mission}
          </Body>
          <Body profile={profile} size={13} color={ink} style={{ opacity: 0.6, marginTop: 16, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Body · {profile.typography.bodyFamily}
          </Body>
        </div>
      </div>
    </SlideFrame>
  );
}

export function TypographyB({ index, profile }: Props) {
  const bg = profile.palette.paper;
  const ink = profile.palette.ink;
  const accent = profile.palette.primary;
  const phrase = profile.tagline.split(/[.!?]/)[0] || profile.name;

  const sizes = [168, 110, 72, 48, 32, 22, 16];

  return (
    <SlideFrame index={index} archetype="typography" variant="B" background={bg} ink={ink}>
      <div style={{ position: 'absolute', top: 80, left: 96, right: 96, display: 'flex', justifyContent: 'space-between' }}>
        <Body profile={profile} size={14} color={accent} style={{ letterSpacing: '0.28em', textTransform: 'uppercase' }}>
          · §05 Typography Ladder
        </Body>
        <LogoMark profile={profile} variant="black" height={32} color={ink} />
      </div>

      <div style={{ position: 'absolute', top: 160, left: 96, right: 96, bottom: 80, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
        {sizes.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 40, borderBottom: `1px solid ${ink}12`, paddingBottom: 18 }}>
            <Body profile={profile} size={12} color={accent} style={{ fontFamily: 'ui-monospace, monospace', opacity: 0.7, minWidth: 80 }}>
              {s}px / {Math.round(s * 1.15)}
            </Body>
            <Display profile={profile} size={s} weight={i < 2 ? 900 : i < 4 ? 700 : 500} color={ink} style={{ letterSpacing: `${-0.035 + i * 0.005}em` }}>
              {phrase}
            </Display>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

export function TypographyC({ index, profile, overrides }: Props) {
  const bg = profile.palette.primary;
  const ink = inkOn(bg);
  const hero = overrides?.image ?? profile.assets.allImages[0];
  const headline = overrides?.headline ?? `Smarter Decisions Start with ${profile.name} Better Data`;

  // Split headline so we can insert the logomark inline (mimics the reference composition).
  const words = headline.split(/\s+/);
  const splitAt = Math.floor(words.length / 2) + 1;
  const before = words.slice(0, splitAt).join(' ');
  const after = words.slice(splitAt).join(' ');

  return (
    <SlideFrame index={index} archetype="typography" variant="C" background={bg} ink={ink}>
      {/* left: product mockup (vertical banner device) */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 820, background: shiftLightness(bg, -0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {hero ? (
          <img src={hero} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'relative', width: 240, height: 760, background: '#0A0A0A', borderRadius: 12, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '80px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: 'linear-gradient(180deg, #C0C0C0, #808080)' }} />
            <Body profile={profile} size={10} color="#fff" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.9, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              Powering Growth Through {profile.name}
            </Body>
            <LogoMark profile={profile} variant="primary" height={60} color={bg} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} />
            <Body profile={profile} size={10} color="#fff" style={{ opacity: 0.6 }}>
              www.{profile.name.toLowerCase().replace(/\s+/g, '')}.com
            </Body>
          </div>
        )}
      </div>

      {/* right: huge headline with inline logo */}
      <div style={{ position: 'absolute', left: 820, top: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', padding: '0 72px' }}>
        <Display profile={profile} size={118} weight={900} color={ink} style={{ letterSpacing: '-0.035em', lineHeight: 0.98 }}>
          {before}{' '}
          <span style={{ display: 'inline-flex', verticalAlign: 'middle', padding: '0 18px', background: ink, borderRadius: 14 }}>
            <LogoMark profile={profile} variant="primary" height={100} color={bg} style={{ filter: ink === '#FFFFFF' ? 'none' : 'invert(1)' }} />
          </span>{' '}
          {after}
        </Display>
      </div>
    </SlideFrame>
  );
}
