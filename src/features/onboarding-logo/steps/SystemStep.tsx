/**
 * Step 5 — the direction becomes a system the owner shapes.
 *
 * The board on the left is live; the panel on the right edits one part at a
 * time. Each part carries its own approval — the owner signs off colour, type,
 * shapes, pattern, logo use and voice individually, so "approved" means
 * looked at, not clicked through.
 */
import { useEffect, useMemo, useState } from 'react';
import { DsButton, DsCheckbox, DsChip, DsSegmented, DsSwitch } from '@/shared/ds';
import { TONE } from '@/features/onboarding/vocabulary/vocabularies';
import { loadFontFamily } from '@/shared/design-system/fonts';
import { contrastRatio } from '@/shared/brand/logoOnBackground';
import { useLogoFlow } from '../model/flowStore';
import { SECTIONS } from '../model/steps';
import type { BrandSystem, CornerStyle, Palette, PatternKind, ShapeMotif, SystemSection } from '../model/types';
import { NUDGES, ROLE_LABEL, cmykString, nudgePalette, rgbString, swapRoles } from '../engine/palette';
import { alternativesFor } from '../engine/directions';
import { CORNER_LABEL, MOTIF_LABEL, PATTERN_LABEL, cssUrl, graphicElements, patternTileSvg } from '../engine/graphics';
import { logoVariations } from '../engine/logoArt';
import { svgDataUrl } from '../engine/logoRead';
import { BrandBoard } from '../components/BrandBoard';
import { LogoMark, MarkPattern } from '../components/LogoMark';

const MOTIFS: ShapeMotif[] = ['block', 'arc', 'circle', 'diagonal', 'blob', 'line'];
const CORNERS: CornerStyle[] = ['sharp', 'soft', 'rounded', 'pill'];

function ColorPanel({ system, update }: PanelProps) {
  const p = system.palette;
  const setPalette = (palette: Palette) => update({ palette });
  return (
    <>
      <ul className="lf-roles">
        {(['primary', 'secondary', 'accent', 'dark', 'light'] as const).map((role) => (
          <li key={role}>
            <span className="lf-role-swatch" style={{ background: p[role] }} />
            <div className="lf-role-meta">
              <strong>{ROLE_LABEL[role]}</strong>
              <code>{p[role].toUpperCase()}</code>
              <span>RGB {rgbString(p[role])} · CMYK≈ {cmykString(p[role])}</span>
            </div>
            {(role === 'secondary' || role === 'accent') && (
              <DsButton tone="tertiary" size="sm" onClick={() => setPalette(swapRoles(p, 'primary', role))}>
                Make primary
              </DsButton>
            )}
          </li>
        ))}
      </ul>
      <div className="lf-panel-group">
        <span className="lf-panel-label">Adjust</span>
        <div className="lf-chips">
          {NUDGES.map((n) => (
            <DsChip key={n.id} onClick={() => setPalette(nudgePalette(p, n.id))}>
              {n.label}
            </DsChip>
          ))}
        </div>
      </div>
      {system.paletteAlternates.length > 0 && (
        <div className="lf-panel-group">
          <span className="lf-panel-label">Other palettes in this direction</span>
          <div className="lf-alt-palettes">
            {system.paletteAlternates.map((alt, i) => (
              <button
                key={i}
                type="button"
                className="lf-alt-palette"
                aria-label={`Use alternative palette ${i + 1}`}
                onClick={() =>
                  update({
                    palette: alt,
                    paletteAlternates: system.paletteAlternates.map((x, j) => (j === i ? p : x)),
                  })
                }
              >
                {(['primary', 'secondary', 'accent', 'dark'] as const).map((r) => (
                  <span key={r} style={{ background: alt[r] }} />
                ))}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function TypePanel({ system, update }: PanelProps) {
  const { pairings } = useMemo(() => alternativesFor(system), [system]);
  useEffect(() => {
    for (const pr of pairings) {
      loadFontFamily(pr.heading, [pr.headingWeight]);
      loadFontFamily(pr.body, [400]);
    }
  }, [pairings]);
  return (
    <>
      <div className="lf-type-scale" style={{ color: system.palette.dark }}>
        <div style={{ fontFamily: `"${system.type.heading}"`, fontWeight: system.type.headingWeight, fontSize: 30, lineHeight: 1.1 }}>Headline · 48</div>
        <div style={{ fontFamily: `"${system.type.heading}"`, fontWeight: system.type.headingWeight, fontSize: 20 }}>Subhead · 24</div>
        <div style={{ fontFamily: `"${system.type.body}"`, fontSize: 14, lineHeight: 1.55 }}>
          Body · 16. {system.voice.principles[0]?.detail}
        </div>
      </div>
      <div className="lf-panel-group">
        <span className="lf-panel-label">Pairings</span>
        <div className="lf-pairings" role="radiogroup" aria-label="Type pairing">
          {pairings.map((pr) => {
            const active = pr.heading === system.type.heading && pr.body === system.type.body;
            return (
              <button
                key={`${pr.heading}|${pr.body}`}
                type="button"
                role="radio"
                aria-checked={active}
                className={`lf-pairing${active ? ' is-active' : ''}`}
                onClick={() => update({ type: pr })}
              >
                <span style={{ fontFamily: `"${pr.heading}"`, fontWeight: pr.headingWeight }}>{pr.heading}</span>
                <span style={{ fontFamily: `"${pr.body}"` }}>with {pr.body}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function ShapePanel({ system, update }: PanelProps) {
  const elements = graphicElements(system.motif, system.palette, system.corner);
  return (
    <>
      <div className="lf-panel-group">
        <span className="lf-panel-label">Corners</span>
        <DsSegmented
          aria-label="Corner style"
          options={CORNERS.map((c) => ({ value: c, label: CORNER_LABEL[c] }))}
          value={system.corner}
          onChange={(v) => update({ corner: v as CornerStyle })}
        />
      </div>
      <div className="lf-panel-group">
        <span className="lf-panel-label">Shape language</span>
        <div className="lf-chips">
          {MOTIFS.map((m) => (
            <DsChip key={m} active={system.motif === m} aria-pressed={system.motif === m} onClick={() => update({ motif: m })}>
              {MOTIF_LABEL[m]}
            </DsChip>
          ))}
        </div>
      </div>
      <div className="lf-elements">
        {elements.map((el) => (
          <figure key={el.id}>
            <img src={svgDataUrl(el.svg)} alt="" />
            <figcaption>{el.name}</figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}

function PatternPanel({ system, update, logo }: PanelProps) {
  const { patterns } = alternativesFor(system);
  const p = system.palette;
  return (
    <div className="lf-patterns" role="radiogroup" aria-label="Pattern">
      {patterns.map((k: PatternKind) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={system.pattern === k}
          className={`lf-pattern${system.pattern === k ? ' is-active' : ''}`}
          onClick={() => update({ pattern: k })}
        >
          <span className="lf-pattern-swatch">
            {k === 'mark' ? (
              <MarkPattern logo={logo} color={p.light} ground={p.secondary} tile={40} style={{ position: 'absolute', inset: 0 }} />
            ) : (
              <span style={{ position: 'absolute', inset: 0, backgroundImage: cssUrl(patternTileSvg(k, { fg: p.primary, bg: p.secondary, accent: p.accent }, 28)) }} />
            )}
          </span>
          <span>{PATTERN_LABEL[k]}</span>
        </button>
      ))}
    </div>
  );
}

function LogoPanel({ system, update, logo, canLockup }: PanelProps) {
  const variations = logoVariations(system);
  return (
    <>
      <div className="lf-panel-group">
        <span className="lf-panel-label">Default logo colour</span>
        <DsSegmented
          aria-label="Default logo colour"
          options={[
            { value: 'dark', label: 'Ink' },
            { value: 'primary', label: 'Brand colour' },
          ]}
          value={system.logo.ink}
          onChange={(v) => update({ logo: { ...system.logo, ink: v as 'dark' | 'primary' } })}
        />
      </div>
      {canLockup && (
        <DsSwitch
          label="Set our name beside the symbol (lockup)"
          checked={system.logo.lockup}
          onChange={(lockup) => update({ logo: { ...system.logo, lockup } })}
        />
      )}
      <div className="lf-variations">
        {variations.map((v) => {
          const ground = v.ground ?? (v.ink === '#ffffff' ? system.palette.dark : system.palette.light);
          const ratio = contrastRatio(v.ink, ground);
          return (
            <figure key={v.id}>
              <div className="lf-variation-stage" style={{ background: ground }}>
                <LogoMark logo={logo} color={v.ink} height={30} />
              </div>
              <figcaption>
                <strong>{v.name}</strong>
                <span>{ratio < 3 ? 'Low contrast — avoid on this ground' : v.usage}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>
      <dl className="lf-rules">
        <div>
          <dt>Clear space</dt>
          <dd>{Math.round(system.logo.clearSpace * 100)}% of the logo’s height on every side</dd>
        </div>
        <div>
          <dt>Minimum size</dt>
          <dd>{system.logo.minWidthPx}px wide on screen</dd>
        </div>
        <div>
          <dt>Never</dt>
          <dd>stretch, rotate, outline, add effects, or recolour outside the palette</dd>
        </div>
      </dl>
    </>
  );
}

function VoicePanel({ system, update }: PanelProps) {
  const v = system.voice;
  return (
    <>
      <div className="lf-panel-group">
        <span className="lf-panel-label">Tone</span>
        <div className="lf-chips">
          {TONE.map((t) => (
            <DsChip key={t.id} active={v.tone === t.id} aria-pressed={v.tone === t.id} onClick={() => update({ voice: { ...v, tone: t.id } })}>
              {t.label}
            </DsChip>
          ))}
        </div>
      </div>
      <ul className="lf-principles">
        {v.principles.map((pr) => (
          <li key={pr.title}>
            <strong>{pr.title}</strong>
            <span>{pr.detail}</span>
          </li>
        ))}
      </ul>
      <div className="lf-dodont">
        <div>
          <span className="lf-panel-label">Do</span>
          <ul>{v.doList.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
        <div>
          <span className="lf-panel-label">Don’t</span>
          <ul>{v.dontList.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
      </div>
      <div className="lf-panel-group">
        <span className="lf-panel-label">Sounds like</span>
        <ul className="lf-samples" style={{ fontFamily: `"${system.type.heading}"` }}>
          {v.samples.map((s) => (
            <li key={s}>“{s}”</li>
          ))}
        </ul>
      </div>
    </>
  );
}

interface PanelProps {
  system: BrandSystem;
  update(patch: Partial<BrandSystem>): void;
  logo: NonNullable<ReturnType<typeof useLogoFlow.getState>['logo']>;
  canLockup: boolean;
}

const PANELS: Record<SystemSection, (p: PanelProps) => JSX.Element> = {
  color: ColorPanel,
  type: TypePanel,
  shape: ShapePanel,
  pattern: PatternPanel,
  logo: LogoPanel,
  voice: VoicePanel,
};

export function SystemStep() {
  const logo = useLogoFlow((s) => s.logo);
  const read = useLogoFlow((s) => s.read);
  const name = useLogoFlow((s) => s.context.name);
  const system = useLogoFlow((s) => s.system);
  const update = useLogoFlow((s) => s.updateSystem);
  const approve = useLogoFlow((s) => s.approve);
  const [section, setSection] = useState<SystemSection>('color');

  if (!logo || !system) return null;
  const Panel = PANELS[section];
  const approved = system.approved.includes(section);
  const canLockup = read?.traits.composition !== 'wordmark' && read?.traits.composition !== 'combination';

  const approveAndNext = (value: boolean) => {
    approve(section, value);
    if (!value) return;
    const nextOpen = SECTIONS.find((s) => s.value !== section && !useLogoFlow.getState().system?.approved.includes(s.value));
    if (nextOpen) setSection(nextOpen.value);
  };

  return (
    <div className="lf-system">
      <div className="lf-system-board">
        <BrandBoard name={name} logo={logo} system={system} />
      </div>
      <aside className="lf-panel" aria-label="Refine the brand system">
        <div className="lf-panel-head">
          <span className="lf-panel-eyebrow">{system.directionName}</span>
          <span className="lf-approval-count">
            {system.approved.length} of {SECTIONS.length} approved
          </span>
        </div>
        <div className="lf-section-tabs">
          <DsSegmented
            aria-label="Section"
            options={SECTIONS.map((s) => ({
              value: s.value,
              label: (
                <span className="lf-tab-label">
                  {system.approved.includes(s.value) && <span className="lf-tab-check" aria-label="approved">✓</span>}
                  {s.label}
                </span>
              ),
            }))}
            value={section}
            onChange={(v) => setSection(v as SystemSection)}
          />
        </div>
        <div className="lf-panel-body">
          <Panel system={system} update={update} logo={logo} canLockup={canLockup} />
        </div>
        <div className={`lf-approve${approved ? ' is-approved' : ''}`}>
          <DsCheckbox
            label={approved ? 'Approved' : `Approve ${SECTIONS.find((s) => s.value === section)?.label.toLowerCase()}`}
            checked={approved}
            onChange={approveAndNext}
          />
        </div>
      </aside>
    </div>
  );
}
