/**
 * The brand board — the system on one page.
 *
 * It is CONTENT, not chrome: every colour, face and radius on it comes from
 * the owner's system, never from `--ds-*`. It is the same component on the
 * refine step (live, as the owner edits), on the package hub, and inside the
 * board export (snapshotted), so what is approved is what is downloaded.
 */
import { forwardRef, type CSSProperties } from 'react';
import type { BrandSystem, LogoSource } from '../model/types';
import { cssUrl, graphicElements, patternTileSvg, PATTERN_LABEL } from '../engine/graphics';
import { primaryInk } from '../engine/logoArt';
import { svgDataUrl } from '../engine/logoRead';
import { LogoMark, MarkPattern } from './LogoMark';
import { ink, tileRadius, useSystemFonts } from './boardStyle';

interface Props {
  name: string;
  logo: LogoSource;
  system: BrandSystem;
  /** Fewer tiles — for small previews. */
  compact?: boolean;
}


export const BrandBoard = forwardRef<HTMLDivElement, Props>(function BrandBoard({ name, logo, system, compact }, ref) {
  useSystemFonts(system);
  const p = system.palette;
  const radius = tileRadius(system);
  const heading = `"${system.type.heading}", serif`;
  const body = `"${system.type.body}", sans-serif`;
  const style = {
    '--lfb-radius': `${radius}px`,
    '--lfb-heading': heading,
    '--lfb-body': body,
    '--lfb-heading-weight': system.type.headingWeight,
    background: p.light,
  } as CSSProperties;
  const elements = graphicElements(system.motif, p, system.corner);
  const markInk = primaryInk(system);
  const sample = system.voice.samples[0] ?? name;

  return (
    <div ref={ref} className={`lf-board${compact ? ' is-compact' : ''}`} style={style} data-testid="brand-board">
      <section className="lf-board-tile lf-board-logo" style={{ background: p.light, color: p.dark }}>
        <span className="lf-board-caption" style={{ color: p.dark }}>{name}</span>
        <div className="lf-board-logo-stage">
          {system.logo.lockup ? (
            <div className="lf-lockup">
              <LogoMark logo={logo} color={markInk} height={72} />
              <span style={{ color: markInk, fontFamily: heading, fontWeight: system.type.headingWeight }}>{name}</span>
            </div>
          ) : (
            <LogoMark logo={logo} color={markInk} height={104} />
          )}
        </div>
      </section>

      <section className="lf-board-tile lf-board-rev" style={{ background: p.primary }}>
        <LogoMark logo={logo} color="#ffffff" height={56} />
      </section>

      <section className="lf-board-tile lf-board-palette" aria-label="Colour palette">
        {(['primary', 'secondary', 'accent', 'dark', 'light'] as const).map((role) => (
          <div key={role} className="lf-board-swatch" style={{ background: p[role], color: ink(p[role]) }}>
            <span>{p[role].toUpperCase()}</span>
          </div>
        ))}
      </section>

      <section className="lf-board-tile lf-board-type" style={{ background: '#ffffff', color: p.dark }}>
        <div className="lf-board-aa" style={{ fontFamily: heading, fontWeight: system.type.headingWeight, color: p.primary }}>Aa</div>
        <div className="lf-board-type-meta">
          <div style={{ fontFamily: heading, fontWeight: system.type.headingWeight }} className="lf-board-type-name">{system.type.heading}</div>
          <div style={{ fontFamily: body }} className="lf-board-type-body">
            {system.type.body} — {system.voice.principles[0]?.detail ?? 'Body copy set for comfortable reading.'}
          </div>
        </div>
      </section>

      {!compact && (
        <section className="lf-board-tile lf-board-pattern" aria-label={PATTERN_LABEL[system.pattern]}>
          {system.pattern === 'mark' ? (
            <MarkPattern logo={logo} color={p.light} ground={p.secondary} style={{ position: 'absolute', inset: 0 }} />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: cssUrl(patternTileSvg(system.pattern, { fg: p.primary, bg: p.secondary, accent: p.accent }, 44)),
              }}
            />
          )}
        </section>
      )}

      {!compact && (
        <section className="lf-board-tile lf-board-voice" style={{ background: p.dark, color: ink(p.dark) }}>
          <span className="lf-board-caption" style={{ color: p.accent }}>Voice</span>
          <p style={{ fontFamily: heading, fontWeight: system.type.headingWeight }}>{sample}</p>
        </section>
      )}

      {!compact && (
        <section className="lf-board-tile lf-board-shapes" style={{ background: '#ffffff' }} aria-label="Graphic elements">
          {elements.slice(0, 2).map((el) => (
            <img key={el.id} src={svgDataUrl(el.svg)} alt="" />
          ))}
        </section>
      )}

      {!compact && (
        <section className="lf-board-tile lf-board-avatar" style={{ background: p.accent }}>
          <div className="lf-board-avatar-disc" style={{ background: p.primary }}>
            <LogoMark logo={logo} color="#ffffff" height={30} />
          </div>
        </section>
      )}
    </div>
  );
});
