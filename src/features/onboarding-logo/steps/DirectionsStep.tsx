/**
 * Step 4 — three ways the brand could feel.
 *
 * Each card is a small brand board, not a mood word: the owner's actual logo
 * in the direction's colours and type, its pattern, and the reasons it fits —
 * every reason traced to the logo read or an answer. "Show different ones"
 * never repeats a direction already seen in this session until the library
 * runs out.
 */
import { useEffect, useMemo, useState } from 'react';
import { BrandMark, DsButton } from '@/shared/ds';
import { useLogoFlow } from '../model/flowStore';
import type { Direction, LogoSource } from '../model/types';
import { localDirectionGenerator, systemFromDirection } from '../engine/directions';
import { cssUrl, patternTileSvg } from '../engine/graphics';
import { LogoMark, MarkPattern } from '../components/LogoMark';
import { ink, tileRadius, useSystemFonts } from '../components/boardStyle';

function DirectionPreview({ d, logo, name, lockup }: { d: Direction; logo: LogoSource; name: string; lockup: boolean }) {
  useSystemFonts(d);
  const p = d.palette;
  const r = tileRadius(d, 40);
  const heading = `"${d.type.heading}", serif`;
  return (
    <div className="lf-dir-preview" style={{ background: p.light, borderRadius: r }}>
      <div className="lf-dir-hero" style={{ borderRadius: r }}>
        <div className="lf-dir-hero-logo">
          {lockup ? (
            <div className="lf-lockup lf-lockup-sm">
              <LogoMark logo={logo} color={p.primary} height={34} />
              <span style={{ color: p.primary, fontFamily: heading, fontWeight: d.type.headingWeight }}>{name}</span>
            </div>
          ) : (
            <LogoMark logo={logo} color={p.primary} height={56} />
          )}
        </div>
        <div className="lf-dir-hero-rev" style={{ background: p.primary, borderRadius: r }}>
          <LogoMark logo={logo} color="#ffffff" height={40} />
        </div>
      </div>
      <div className="lf-dir-strip">
        {(['primary', 'secondary', 'accent', 'dark'] as const).map((role) => (
          <span key={role} style={{ background: p[role] }} />
        ))}
      </div>
      <div className="lf-dir-type" style={{ color: p.dark }}>
        <span style={{ fontFamily: heading, fontWeight: d.type.headingWeight, color: p.primary }}>Aa</span>
        <span style={{ fontFamily: `"${d.type.body}", sans-serif` }}>{d.voice.samples[0]}</span>
      </div>
      <div className="lf-dir-pattern" style={{ borderRadius: r }}>
        {d.pattern === 'mark' ? (
          <MarkPattern logo={logo} color={p.light} ground={p.secondary} tile={48} style={{ position: 'absolute', inset: 0 }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: cssUrl(patternTileSvg(d.pattern, { fg: p.primary, bg: p.secondary, accent: p.accent }, 32)) }} />
        )}
        <span className="lf-dir-pattern-chip" style={{ background: p.accent, color: ink(p.accent) }}>
          {d.type.heading} · {d.type.body}
        </span>
      </div>
    </div>
  );
}

export function DirectionsStep({ onChosen }: { onChosen(): void }) {
  const logo = useLogoFlow((s) => s.logo);
  const read = useLogoFlow((s) => s.read);
  const context = useLogoFlow((s) => s.context);
  const directions = useLogoFlow((s) => s.directions);
  const basis = useLogoFlow((s) => s.basis);
  const round = useLogoFlow((s) => s.round);
  const system = useLogoFlow((s) => s.system);
  const setDirections = useLogoFlow((s) => s.setDirections);
  const choose = useLogoFlow((s) => s.choose);
  const [busy, setBusy] = useState(false);

  const currentBasis = useMemo(() => JSON.stringify({ context, traits: read?.traits }), [context, read]);

  useEffect(() => {
    if (!read || (directions.length && basis === currentBasis)) return;
    let live = true;
    setBusy(true);
    localDirectionGenerator
      .generate({ read, context, round: 0 })
      .then((ds) => live && setDirections(ds, 0, currentBasis))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
    // Regenerate only when what the directions were made from has changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBasis, read]);

  const more = async () => {
    if (!read) return;
    setBusy(true);
    const next = round + 1;
    const { shown } = useLogoFlow.getState();
    const ds = await localDirectionGenerator.generate({ read, context, round: next, exclude: shown });
    setDirections(ds, next, currentBasis);
    setBusy(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pick = (d: Direction) => {
    if (!read) return;
    if (system?.directionId !== d.id) choose(systemFromDirection(d, read));
    onChosen();
  };

  if (!logo || !read) return null;
  if (busy && !directions.length) {
    return (
      <div className="lf-reading" aria-live="polite">
        <BrandMark size={44} loading />
        <p>Weighing your answers against your mark…</p>
      </div>
    );
  }

  const lockup = read.traits.composition === 'symbol' || read.traits.composition === 'unclear';
  return (
    <div className="lf-stack">
      <div className="lf-directions" aria-busy={busy}>
        {directions.map((d) => {
          const current = system?.directionId === d.id;
          return (
            <article key={d.id} className={`lf-dir${current ? ' is-current' : ''}`} data-testid="direction-card">
              <DirectionPreview d={d} logo={logo} name={context.name} lockup={lockup} />
              <div className="lf-dir-body">
                <h2>{d.name}</h2>
                <p className="lf-dir-essence">{d.essence}</p>
                <ul className="lf-dir-why">
                  {d.rationale.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <DsButton tone={current ? 'primary' : 'secondary'} arrow onClick={() => pick(d)}>
                  {current ? 'Continue with this' : 'Choose this direction'}
                </DsButton>
              </div>
            </article>
          );
        })}
      </div>
      <div className="lf-row-center">
        <DsButton tone="tertiary" onClick={more} disabled={busy}>
          {busy ? 'Thinking…' : 'Show me three different directions'}
        </DsButton>
      </div>
    </div>
  );
}
