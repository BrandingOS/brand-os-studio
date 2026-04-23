/**
 * Moodboard archetype — 3 variants.
 *
 *   A — Dark bg with 4 floating brand-cards (quote, photo, chart, CTA).
 *       Matches reference Fexilc slide 2.
 *   B — Light minimal — stacked blocks on paper bg, negative space hero.
 *   C — Asymmetric 3-column grid of brand moments.
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

function QuoteCard({
  profile,
  color,
  ink,
  quote,
  style,
}: {
  profile: BrandProfile;
  color: string;
  ink: string;
  quote: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: color,
        color: ink,
        padding: '32px 34px',
        borderRadius: 18,
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.35)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <LogoMark profile={profile} variant="iconmark" height={26} color={ink} />
        <Body profile={profile} size={12} color={ink} style={{ letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.8 }}>
          {profile.name}
        </Body>
      </div>
      <Display profile={profile} size={34} weight={700} color={ink} style={{ lineHeight: 1.1 }}>
        {quote}
      </Display>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
        <span style={{ width: 28, height: 28, background: ink, opacity: 0.2, borderRadius: 999 }} />
        <span style={{ width: 28, height: 28, background: ink, opacity: 0.3, borderRadius: 999, marginLeft: -10 }} />
        <span style={{ width: 28, height: 28, background: profile.palette.primary, borderRadius: 999, marginLeft: -10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: inkOn(profile.palette.primary) }}>+</span>
      </div>
    </div>
  );
}

function InsightCard({
  profile,
  color,
  ink,
  title,
  cta,
  style,
}: {
  profile: BrandProfile;
  color: string;
  ink: string;
  title: string;
  cta: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: color,
        color: ink,
        padding: '32px 34px',
        borderRadius: 18,
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.35)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <span style={{ fontSize: 14, letterSpacing: '0.05em' }}>→</span>
        <LogoMark profile={profile} variant="iconmark" height={24} color={ink} />
      </div>
      <Display profile={profile} size={40} weight={700} color={ink} style={{ lineHeight: 1.04 }}>
        {title}
      </Display>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 36 }}>
        <Body profile={profile} size={13} color={ink} style={{ opacity: 0.85 }}>
          → {cta}
        </Body>
      </div>
    </div>
  );
}

function ChartCard({
  profile,
  color,
  ink,
  style,
}: {
  profile: BrandProfile;
  color: string;
  ink: string;
  style?: React.CSSProperties;
}) {
  const bars = [45, 65, 48, 80, 62, 92, 70];
  return (
    <div
      style={{
        background: color,
        color: ink,
        padding: '26px 28px',
        borderRadius: 18,
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.35)',
        ...style,
      }}
    >
      <Body profile={profile} size={13} color={ink} style={{ opacity: 0.8, marginBottom: 14 }}>
        → Get in touch
      </Body>
      <div style={{ display: 'flex', alignItems: 'end', gap: 9, height: 160 }}>
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              background: ink,
              borderRadius: 4,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PhotoCard({
  src,
  accent,
  style,
}: {
  src?: string;
  accent: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.5)',
        position: 'relative',
        background: `linear-gradient(135deg, ${shiftLightness(accent, -0.15)}, ${shiftLightness(accent, -0.35)})`,
        ...style,
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.9)' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 0%, ${accent}aa 100%)` }} />
      )}
    </div>
  );
}

export function MoodboardA({ index, profile, overrides }: Props) {
  const bg = '#0A0A0A';
  const ink = '#FFF';
  const accent = profile.palette.primary;
  const accentInk = inkOn(accent);
  const accentMuted = shiftLightness(accent, -0.22);
  const quote = overrides?.headline ?? profile.tagline;
  const hero = overrides?.image ?? profile.assets.scenes[0] ?? profile.assets.portraits[0] ?? profile.assets.allImages[0];

  return (
    <SlideFrame index={index} archetype="moodboard" variant="A" background={bg} ink={ink}>
      {/* faint geometric outlines bg */}
      <svg
        viewBox="0 0 1920 1080"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.3 }}
      >
        <path d="M -100 800 L 600 400 L 1200 700 L 2020 300" stroke={accent} strokeOpacity="0.35" fill="none" strokeWidth="2" />
        <path d="M -100 900 L 500 700 L 900 900 L 1400 600 L 2020 900" stroke={accent} strokeOpacity="0.2" fill="none" strokeWidth="2" />
        <rect x="1200" y="140" width="600" height="500" fill="none" stroke={accent} strokeOpacity="0.2" strokeWidth="2" rx="24" />
      </svg>

      {/* card cluster */}
      <QuoteCard
        profile={profile}
        color="#FAF2EE"
        ink="#222"
        quote={`"${quote.length > 38 ? quote.slice(0, 36) + '…' : quote}"`}
        style={{ position: 'absolute', left: 360, top: 120, width: 360 }}
      />
      <PhotoCard
        src={hero}
        accent={accent}
        style={{ position: 'absolute', left: 620, top: 260, width: 360, height: 520 }}
      />
      <InsightCard
        profile={profile}
        color={accentMuted}
        ink="#FFF"
        title="Insights That Power Growth."
        cta="Get In Touch"
        style={{ position: 'absolute', left: 1000, top: 380, width: 400 }}
      />
      <ChartCard
        profile={profile}
        color={accent}
        ink={accentInk}
        style={{ position: 'absolute', left: 470, top: 620, width: 280 }}
      />

      {/* small avatar floater */}
      <div
        style={{
          position: 'absolute',
          left: 940,
          top: 220,
          width: 86,
          height: 86,
          borderRadius: '50%',
          background: '#1f2937',
          border: '4px solid #FFF',
          overflow: 'hidden',
        }}
      >
        {profile.assets.portraits[0] ? (
          <img src={profile.assets.portraits[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${accent}, ${shiftLightness(accent, -0.3)})` }} />
        )}
      </div>
    </SlideFrame>
  );
}

export function MoodboardB({ index, profile, overrides }: Props) {
  const bg = profile.palette.paper;
  const ink = profile.palette.ink;
  const accent = profile.palette.primary;
  const hero = overrides?.image ?? profile.assets.allImages[0];

  return (
    <SlideFrame index={index} archetype="moodboard" variant="B" background={bg} ink={ink}>
      {/* 4-column masonry */}
      <div style={{ position: 'absolute', top: 96, left: 96, right: 96, bottom: 96, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: 'repeat(6, 1fr)', gap: 20 }}>
        {/* Title block */}
        <div style={{ gridColumn: '1 / span 2', gridRow: '1 / span 3', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 36 }}>
          <Body profile={profile} size={14} color={accent} style={{ letterSpacing: '0.28em', textTransform: 'uppercase' }}>
            · Moodboard
          </Body>
          <Display profile={profile} size={84} weight={700} color={ink} style={{ letterSpacing: '-0.02em' }}>
            Mood &amp; reference.
          </Display>
          <Body profile={profile} size={16} color={ink} style={{ opacity: 0.7, maxWidth: 360 }}>
            The visual vocabulary that informs every decision across {profile.name}'s system.
          </Body>
        </div>

        {/* Accent square */}
        <div style={{ gridColumn: '3', gridRow: '1 / span 2', background: accent, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogoMark profile={profile} variant="white" height={54} color={inkOn(accent)} />
        </div>

        {/* Photo tall */}
        <div style={{ gridColumn: '4', gridRow: '1 / span 4', borderRadius: 16, overflow: 'hidden', background: `linear-gradient(160deg, ${shiftLightness(accent, -0.1)}, ${shiftLightness(accent, -0.35)})` }}>
          {hero && <img src={hero} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>

        {/* Quote */}
        <div style={{ gridColumn: '3', gridRow: '3 / span 2', background: '#FFF', borderRadius: 16, padding: 26, display: 'flex', alignItems: 'center', boxShadow: '0 20px 40px -20px rgba(0,0,0,0.1)' }}>
          <Display profile={profile} size={22} weight={600} color={ink} style={{ lineHeight: 1.25 }}>
            "{(overrides?.headline ?? profile.tagline).slice(0, 90)}"
          </Display>
        </div>

        {/* Small color chips */}
        <div style={{ gridColumn: '1', gridRow: '4 / span 3', display: 'grid', gridTemplateRows: '1fr 1fr 1fr', gap: 16 }}>
          {profile.palette.swatches.slice(0, 3).map((s) => (
            <div key={s.hex} style={{ background: s.hex, borderRadius: 14, display: 'flex', alignItems: 'end', padding: 20 }}>
              <Body profile={profile} size={13} color={inkOn(s.hex)} style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
                {s.name}
              </Body>
            </div>
          ))}
        </div>

        {/* Type specimen */}
        <div style={{ gridColumn: '2 / span 2', gridRow: '5 / span 2', background: '#FFF', borderRadius: 16, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 20px 40px -20px rgba(0,0,0,0.08)' }}>
            <Display profile={profile} size={120} weight={900} color={ink} style={{ letterSpacing: '-0.04em' }}>
              Aa
            </Display>
            <Body profile={profile} size={14} color={ink} style={{ opacity: 0.7 }}>
              {profile.typography.headingFamily}
            </Body>
        </div>

        {/* CTA */}
        <div style={{ gridColumn: '3', gridRow: '5 / span 2', background: ink, color: '#FFF', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 18 }}>→</span>
          <Display profile={profile} size={30} weight={700} color="#FFF" style={{ lineHeight: 1.1 }}>
            The craft is the message.
          </Display>
        </div>
        <div style={{ gridColumn: '4', gridRow: '5 / span 2', background: accent, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Display profile={profile} size={120} weight={900} color={inkOn(accent)} style={{ letterSpacing: '-0.05em' }}>
            {profile.name[0] ?? 'B'}
          </Display>
        </div>
      </div>
    </SlideFrame>
  );
}

export function MoodboardC({ index, profile, overrides }: Props) {
  const bg = profile.palette.ink;
  const ink = '#FFF';
  const accent = profile.palette.primary;
  const accentInk = inkOn(accent);
  const images = (overrides?.image ? [overrides.image] : []).concat(profile.assets.allImages).slice(0, 5);

  return (
    <SlideFrame index={index} archetype="moodboard" variant="C" background={bg} ink={ink}>
      <div style={{ position: 'absolute', top: 80, left: 96, right: 96, display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <Body profile={profile} size={14} color={accent} style={{ letterSpacing: '0.28em', textTransform: 'uppercase' }}>
          · Moodboard · Section 03
        </Body>
        <LogoMark profile={profile} variant="white" height={36} color={ink} />
      </div>

      {/* 3-column asymmetric grid */}
      <div style={{ position: 'absolute', top: 160, left: 96, right: 96, bottom: 80, display: 'grid', gridTemplateColumns: '1fr 1.4fr 0.9fr', gridTemplateRows: '1fr 1fr 1fr', gap: 20 }}>
        <div style={{ gridRow: '1 / span 2', borderRadius: 18, overflow: 'hidden', background: `linear-gradient(135deg, ${accent}, ${shiftLightness(accent, -0.35)})`, display: 'flex', alignItems: 'end', padding: 28 }}>
          {images[0] && <img src={images[0]} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
          <Display profile={profile} size={44} weight={800} color="#FFF" style={{ position: 'relative', zIndex: 2 }}>
            {profile.name}
          </Display>
        </div>
        <div style={{ gridRow: '1', background: accent, color: accentInk, borderRadius: 18, padding: 30, display: 'flex', alignItems: 'center' }}>
          <Display profile={profile} size={48} weight={700} color={accentInk} style={{ letterSpacing: '-0.01em' }}>
            {profile.tagline.slice(0, 48)}
          </Display>
        </div>
        <div style={{ gridRow: '2', borderRadius: 18, overflow: 'hidden', background: '#222' }}>
          {images[1] && <img src={images[1]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ gridRow: '1 / span 2', borderRadius: 18, background: '#111', border: `1px solid ${accent}55`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 26 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Body profile={profile} size={12} color={accent} style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>→ Voice</Body>
            <LogoMark profile={profile} variant="iconmark" height={28} color={accent} />
          </div>
          {profile.personality.slice(0, 5).map((t) => (
            <Body profile={profile} size={28} color={ink} key={t} style={{ letterSpacing: '-0.01em', fontWeight: 600, lineHeight: 1.3 }}>
              {t}
            </Body>
          ))}
        </div>
        <div style={{ gridRow: '3', gridColumn: '1 / span 2', borderRadius: 18, overflow: 'hidden', background: '#1a1a1a', position: 'relative' }}>
          {images[2] && <img src={images[2]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.7) brightness(0.8)' }} />}
          <div style={{ position: 'absolute', left: 32, bottom: 32, right: 32 }}>
            <Display profile={profile} size={48} weight={700} color="#FFF" style={{ letterSpacing: '-0.01em' }}>
              Made with rigor.
            </Display>
          </div>
        </div>
        <div style={{ gridRow: '3', background: ink, borderRadius: 18, padding: 30, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: `1px solid ${accent}` }}>
          <Body profile={profile} size={12} color={accent} style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>→ Legend</Body>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {profile.palette.swatches.slice(0, 4).map((s) => (
              <div key={s.hex} style={{ width: 52, height: 52, background: s.hex, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }} />
            ))}
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
