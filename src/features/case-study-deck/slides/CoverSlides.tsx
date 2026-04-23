/**
 * Cover archetype — 4 variants.
 *
 *   A — Color flood + silhouette portrait + logo+wordmark centered on top.
 *       (Matches the reference Fexilc cover composition exactly.)
 *   B — Photo hero filling the frame with a color-washed overlay.
 *   C — Typographic — wordmark huge, no image, brand color flood.
 *   D — Split 50/50 — brand color × deep-ink panel, logo at the seam.
 */

import type { SlideOverrides } from '../types';
import type { BrandProfile } from '../types';
import { SlideFrame } from '../SlideFrame';
import { Body, Display, LogoMark, SilhouettePlaceholder, TMark } from './shared';
import { inkOn, shiftLightness } from '../utils';
import { DEFAULT_CREDIT } from '../constants';

interface Props {
  index: number;
  profile: BrandProfile;
  overrides?: SlideOverrides;
}

export function CoverA({ index, profile, overrides }: Props) {
  const bg = profile.palette.primary;
  const ink = inkOn(bg);
  const credit = overrides?.credit ?? DEFAULT_CREDIT;
  const portrait = overrides?.image ?? profile.assets.portraits[0];

  return (
    <SlideFrame index={index} archetype="cover" variant="A" background={bg} ink={ink}>
      {/* silhouette — fills most of the slide */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        {portrait ? (
          <img
            src={portrait}
            alt=""
            style={{
              height: '92%',
              objectFit: 'cover',
              filter: 'brightness(0.15) saturate(0.6)',
              mixBlendMode: 'multiply',
            }}
          />
        ) : (
          <SilhouettePlaceholder
            accent={bg}
            style={{ height: '92%', width: 'auto' }}
          />
        )}
      </div>

      {/* centered logo lockup */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        <LogoMark profile={profile} variant="white" height={150} color={ink} />
      </div>

      {/* credit at bottom-center */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 48,
          textAlign: 'center',
          fontFamily: `'${profile.typography.bodyFamily}', sans-serif`,
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: ink,
          opacity: 0.95,
          lineHeight: 1.7,
        }}
      >
        <div>— {profile.name.toUpperCase()}{profile.name ? '™' : ''} —</div>
        <div>Brand Identity</div>
        <div>{credit}</div>
        <div>© {new Date().getFullYear()}</div>
      </div>
    </SlideFrame>
  );
}

export function CoverB({ index, profile, overrides }: Props) {
  const bg = profile.palette.ink;
  const ink = '#fff';
  const hero = overrides?.image ?? profile.assets.scenes[0] ?? profile.assets.allImages[0];
  const accent = profile.palette.primary;
  const credit = overrides?.credit ?? DEFAULT_CREDIT;

  return (
    <SlideFrame index={index} archetype="cover" variant="B" background={bg} ink={ink}>
      {/* full-bleed hero */}
      {hero ? (
        <img
          src={hero}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 30% 50%, ${shiftLightness(accent, -0.1)}, #0a0a0a 70%)`,
          }}
        />
      )}
      {/* color wash */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, ${accent}00 0%, ${accent}aa 80%, ${accent}ff 100%)`,
        }}
      />
      {/* content */}
      <div style={{ position: 'absolute', left: 96, bottom: 96, right: 96, display: 'flex', alignItems: 'end', justifyContent: 'space-between' }}>
        <div>
          <LogoMark profile={profile} variant="white" height={120} color="#fff" />
          <div style={{ marginTop: 20, fontFamily: `'${profile.typography.bodyFamily}', sans-serif`, fontSize: 18, opacity: 0.9, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Brand Identity System
          </div>
        </div>
        <Body profile={profile} size={14} color="#fff" style={{ textAlign: 'right', opacity: 0.75, letterSpacing: '0.18em', textTransform: 'uppercase', lineHeight: 1.8 }}>
          {credit}
          <br />© {new Date().getFullYear()}
        </Body>
      </div>
    </SlideFrame>
  );
}

export function CoverC({ index, profile, overrides }: Props) {
  const bg = profile.palette.primary;
  const ink = inkOn(bg);
  const credit = overrides?.credit ?? DEFAULT_CREDIT;

  return (
    <SlideFrame index={index} archetype="cover" variant="C" background={bg} ink={ink}>
      {/* gigantic wordmark center-fill */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Display
          profile={profile}
          size={420}
          weight={900}
          color={ink}
          style={{ letterSpacing: '-0.06em', position: 'relative' }}
        >
          {profile.name}
          <TMark size={54} color={ink} />
        </Display>
      </div>
      {/* corner details */}
      <div style={{ position: 'absolute', top: 80, left: 96, display: 'flex', alignItems: 'center', gap: 16 }}>
        <LogoMark profile={profile} variant="white" height={60} color={ink} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 80,
          right: 96,
          fontFamily: `'${profile.typography.bodyFamily}', sans-serif`,
          fontSize: 14,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          textAlign: 'right',
          color: ink,
          opacity: 0.9,
          lineHeight: 1.8,
        }}
      >
        Brand Identity<br />Case Study
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 96,
          right: 96,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: `'${profile.typography.bodyFamily}', sans-serif`,
          fontSize: 14,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: ink,
          opacity: 0.85,
        }}
      >
        <span>{credit}</span>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </SlideFrame>
  );
}

export function CoverD({ index, profile, overrides }: Props) {
  const bg = profile.palette.primary;
  const inkBg = profile.palette.ink;
  const ink = inkOn(bg);
  const credit = overrides?.credit ?? DEFAULT_CREDIT;
  const hero = overrides?.image ?? profile.assets.allImages[0];

  return (
    <SlideFrame index={index} archetype="cover" variant="D" background={inkBg} ink="#fff">
      {/* left panel — brand color flood */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '50%',
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Display profile={profile} size={200} weight={900} color={ink} style={{ textAlign: 'center' }}>
          {profile.name}
          <TMark size={28} color={ink} />
        </Display>
      </div>
      {/* right panel — ink or photo */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%', overflow: 'hidden' }}>
        {hero ? (
          <img src={hero} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7)' }} />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at 30% 40%, ${shiftLightness(inkBg, 0.06)}, ${inkBg})`,
            }}
          />
        )}
        <div style={{ position: 'absolute', inset: 64, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <LogoMark profile={profile} variant="white" height={54} color="#fff" />
          <div>
            <Display profile={profile} size={52} weight={700} color="#fff" style={{ marginBottom: 20, letterSpacing: '-0.01em' }}>
              {profile.tagline.length > 60 ? profile.tagline.slice(0, 58) + '…' : profile.tagline}
            </Display>
            <Body profile={profile} size={14} color="#fff" style={{ opacity: 0.7, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              {credit} · © {new Date().getFullYear()}
            </Body>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
