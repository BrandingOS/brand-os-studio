/**
 * Step 3 — what only the owner knows.
 *
 * Four required answers (what, who, where in the market, how it should feel)
 * and one optional one (colour feelings). Every answer is a controlled
 * vocabulary id — the same lists Setup's Brand Strategy uses — so the brand
 * this flow creates reads back in Setup without translation.
 *
 * The logo has already told us something about personality; those chips are
 * marked as suggestions from the mark, never pre-selected.
 */
import { useMemo, useState } from 'react';
import { DsChip, DsInput } from '@/shared/ds';
import { AUDIENCE, INDUSTRY, PERSONALITY, POSITIONING } from '@/features/onboarding/vocabulary/vocabularies';
import { useLogoFlow } from '../model/flowStore';
import type { HueFamily } from '../model/types';
import { personalityFromTraits } from '../engine/personality';
import { HUE_CENTERS } from '../engine/palette';
import { hslToHex } from '@/shared/color/colorEngine';

const MAX_PERSONALITY = 3;
const FEATURED_INDUSTRIES = 12;

const HUES: HueFamily[] = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'neutral'];

function hueSwatch(h: HueFamily): string {
  return h === 'neutral' ? '#a8a29e' : hslToHex(HUE_CENTERS[h], 72, 52);
}


function Question({ n, label, hint, children }: { n: number; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="lf-q">
      <header>
        <span className="lf-q-num">{n}</span>
        <div>
          <h2>{label}</h2>
          {hint && <p>{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

export function ContextStep() {
  const context = useLogoFlow((s) => s.context);
  const read = useLogoFlow((s) => s.read);
  const update = useLogoFlow((s) => s.updateContext);
  const [allIndustries, setAllIndustries] = useState(false);
  const suggested = useMemo(() => (read ? personalityFromTraits(read.traits) : []), [read]);

  const industries = allIndustries || INDUSTRY.findIndex((i) => i.id === context.industry) >= FEATURED_INDUSTRIES
    ? INDUSTRY
    : INDUSTRY.slice(0, FEATURED_INDUSTRIES);

  // Read live, not from the render: two quick taps must both land.
  const togglePersonality = (id: string) => {
    const context = useLogoFlow.getState().context;
    const has = context.personality.includes(id);
    if (has) update({ personality: context.personality.filter((p) => p !== id) });
    else if (context.personality.length < MAX_PERSONALITY) update({ personality: [...context.personality, id] });
  };

  const toggleHue = (list: 'loveHues' | 'avoidHues', hue: HueFamily) => {
    const context = useLogoFlow.getState().context;
    const other = list === 'loveHues' ? 'avoidHues' : 'loveHues';
    const has = context[list].includes(hue);
    update({
      [list]: has ? context[list].filter((h) => h !== hue) : [...context[list], hue],
      [other]: context[other].filter((h) => h !== hue),
    } as Partial<typeof context>);
  };

  return (
    <div className="lf-stack lf-medium">
      <Question n={1} label={`What does ${context.name || 'your brand'} do?`}>
        <div className="lf-chips" role="group" aria-label="Industry">
          {industries.map((i) => (
            <DsChip key={i.id} active={context.industry === i.id} aria-pressed={context.industry === i.id} onClick={() => update({ industry: i.id })}>
              {i.label}
            </DsChip>
          ))}
          {!allIndustries && industries.length < INDUSTRY.length && (
            <DsChip dashed onClick={() => setAllIndustries(true)}>
              More…
            </DsChip>
          )}
        </div>
        <DsInput
          placeholder="In one sentence, what you offer (optional)"
          value={context.oneLiner}
          maxLength={140}
          onChange={(e) => update({ oneLiner: e.target.value })}
        />
      </Question>

      <Question n={2} label="Who is it for?">
        <div className="lf-chips" role="group" aria-label="Audience">
          {AUDIENCE.map((a) => (
            <DsChip key={a.id} active={context.audience === a.id} aria-pressed={context.audience === a.id} onClick={() => update({ audience: a.id })}>
              {a.label}
            </DsChip>
          ))}
        </div>
      </Question>

      <Question n={3} label="Where does it stand in its market?">
        <div className="lf-chips" role="group" aria-label="Positioning">
          {POSITIONING.map((p) => (
            <DsChip key={p.id} active={context.positioning === p.id} aria-pressed={context.positioning === p.id} onClick={() => update({ positioning: p.id })}>
              {p.label}
            </DsChip>
          ))}
        </div>
      </Question>

      <Question n={4} label="How should it feel?" hint={`Pick up to ${MAX_PERSONALITY}. Dotted ones are what your logo already says.`}>
        <div className="lf-chips" role="group" aria-label="Personality">
          {PERSONALITY.map((p) => {
            const active = context.personality.includes(p.id);
            const full = !active && context.personality.length >= MAX_PERSONALITY;
            return (
              <DsChip
                key={p.id}
                active={active}
                aria-pressed={active}
                disabled={full}
                className={suggested.includes(p.id) && !active ? 'lf-chip-suggested' : undefined}
                title={suggested.includes(p.id) ? 'Suggested by your logo' : undefined}
                onClick={() => togglePersonality(p.id)}
              >
                {p.label}
              </DsChip>
            );
          })}
        </div>
      </Question>

      <Question n={5} label="Any colour feelings?" hint="Optional. We’ll lean towards what you love and never use what you rule out.">
        <div className="lf-hue-rows">
          {(['loveHues', 'avoidHues'] as const).map((list) => (
            <div key={list} className="lf-hue-row">
              <span className="lf-hue-row-label">{list === 'loveHues' ? 'Love' : 'Avoid'}</span>
              <div className="lf-chips" role="group" aria-label={list === 'loveHues' ? 'Colours you love' : 'Colours to avoid'}>
                {HUES.map((h) => (
                  <DsChip key={h} active={context[list].includes(h)} aria-pressed={context[list].includes(h)} onClick={() => toggleHue(list, h)}>
                    <span className="lf-hue-dot" style={{ background: hueSwatch(h) }} aria-hidden="true" />
                    {h[0].toUpperCase() + h.slice(1)}
                  </DsChip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Question>
    </div>
  );
}
