/**
 * Manifesto archetype — 3 variants.
 *
 *   A — Quote card on soft paper bg with decorative rule.
 *   B — Oversize headline on brand color, split grid.
 *   C — Serif editorial — dark ink bg, long-form mission paragraph.
 */

import type { BrandProfile, SlideOverrides } from '../types';
import { SlideFrame } from '../SlideFrame';
import { Body, Display, LabelRule, LogoMark } from './shared';
import { inkOn } from '../utils';

interface Props {
  index: number;
  profile: BrandProfile;
  overrides?: SlideOverrides;
}

export function ManifestoA({ index, profile, overrides }: Props) {
  const bg = profile.palette.paper;
  const ink = profile.palette.ink;
  const accent = profile.palette.primary;
  const headline = overrides?.headline ?? profile.mission;
  const subhead = overrides?.subhead ?? `${profile.name} — Brand Manifesto`;

  return (
    <SlideFrame index={index} archetype="manifesto" variant="A" background={bg} ink={ink}>
      <div style={{ position: 'absolute', top: 80, left: 96, right: 96 }}>
        <LabelRule profile={profile} label={`§ 01 · Manifesto`} color={accent} />
      </div>
      <div style={{ position: 'absolute', top: 220, left: 200, right: 200 }}>
        <Display profile={profile} size={96} weight={700} color={ink} style={{ letterSpacing: '-0.025em' }}>
          <span style={{ color: accent, fontSize: '1.25em', lineHeight: 0 }}>"</span>
          {headline}
          <span style={{ color: accent, fontSize: '1.25em', lineHeight: 0 }}>"</span>
        </Display>
      </div>
      <div style={{ position: 'absolute', bottom: 120, left: 200, right: 200, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 60, height: 2, background: accent }} />
        <Body profile={profile} size={18} color={ink} style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {subhead}
        </Body>
      </div>
      <div style={{ position: 'absolute', bottom: 60, right: 96 }}>
        <LogoMark profile={profile} variant="black" height={32} color={ink} />
      </div>
    </SlideFrame>
  );
}

export function ManifestoB({ index, profile, overrides }: Props) {
  const bg = profile.palette.primary;
  const ink = inkOn(bg);
  const headline = overrides?.headline ?? profile.tagline;
  const subhead = overrides?.subhead ?? profile.mission;

  return (
    <SlideFrame index={index} archetype="manifesto" variant="B" background={bg} ink={ink}>
      {/* huge headline flood */}
      <div style={{ position: 'absolute', inset: 80, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <Body profile={profile} size={16} color={ink} style={{ letterSpacing: '0.26em', textTransform: 'uppercase', opacity: 0.9 }}>
            · Manifesto · Section 01
          </Body>
          <LogoMark profile={profile} variant="white" height={48} color={ink} />
        </div>
        <Display profile={profile} size={160} weight={900} color={ink} style={{ letterSpacing: '-0.035em', maxWidth: '90%' }}>
          {headline}
        </Display>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40, alignItems: 'end', maxWidth: 1600 }}>
          <div style={{ gridColumn: '1 / span 2' }}>
            <Body profile={profile} size={20} color={ink} style={{ opacity: 0.9, lineHeight: 1.55 }}>
              {subhead}
            </Body>
          </div>
          <Body profile={profile} size={14} color={ink} style={{ opacity: 0.8, textAlign: 'right', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            {profile.name.toUpperCase()}
            <br />Brand Manifesto
            <br />© {new Date().getFullYear()}
          </Body>
        </div>
      </div>
    </SlideFrame>
  );
}

export function ManifestoC({ index, profile, overrides }: Props) {
  const bg = profile.palette.ink;
  const ink = '#ECE9E2';
  const accent = profile.palette.primary;
  const headline = overrides?.headline ?? profile.tagline;
  const body = overrides?.subhead ?? profile.mission;

  return (
    <SlideFrame index={index} archetype="manifesto" variant="C" background={bg} ink={ink}>
      {/* Editorial grid with hairline dividers */}
      <div style={{ position: 'absolute', inset: 96, display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 120 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <Body profile={profile} size={14} color={accent} style={{ letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 28 }}>
              · §01 Manifesto
            </Body>
            <div style={{ height: 1, background: ink, opacity: 0.15, margin: '0 0 28px 0' }} />
            <Display profile={profile} size={72} weight={500} color={ink} style={{ letterSpacing: '-0.01em', fontStyle: 'italic' }}>
              {headline}
            </Display>
          </div>
          <LogoMark profile={profile} variant="white" height={40} color={ink} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'end', paddingBottom: 60 }}>
          <div style={{ borderLeft: `2px solid ${accent}`, paddingLeft: 32 }}>
            <Body profile={profile} size={26} color={ink} style={{ lineHeight: 1.6, opacity: 0.94 }}>
              {body}
            </Body>
          </div>
          <div style={{ marginTop: 48, display: 'flex', gap: 36, opacity: 0.6 }}>
            {profile.personality.slice(0, 4).map((p) => (
              <Body profile={profile} size={12} color={ink} style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }} key={p}>
                · {p}
              </Body>
            ))}
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
