/**
 * Step 3 — tell us about the brand, in whatever form you already have.
 *
 * Not a questionnaire. One box takes a brief, a website, or a few sentences;
 * the product reads it (`model/intake.ts`) and shows what it understood as
 * four short rows. The owner changes only what is wrong — each row opens its
 * own choices on demand — and an empty box is fine too: the logo suggests the
 * feel and the directions cope with an open answer.
 *
 * Every answer is a controlled-vocabulary id, so Setup reads it back as-is.
 */
import { useState } from 'react';
import { DsButton, DsChip, DsTextArea, LoadingPill } from '@/shared/ds';
import { AiPromptMenu } from '@/shared/ai-handoff/AiPromptMenu';
import { buildBriefPrompt } from '@/features/onboarding/brief/prompt';
import { AUDIENCE, INDUSTRY, PERSONALITY, POSITIONING, type VocabularyMember } from '@/features/onboarding/vocabulary/vocabularies';
import { hslToHex } from '@/shared/color/colorEngine';
import { useLogoFlow } from '../model/flowStore';
import { readIntake } from '../model/intake';
import type { HueFamily, IntakeField, IntakeSource } from '../model/types';
import { HUE_CENTERS } from '../engine/palette';

const MAX_PERSONALITY = 3;
const HUES: HueFamily[] = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'neutral'];

const SOURCE_LABEL: Record<IntakeSource, string> = {
  website: 'from your website',
  brief: 'from your brief',
  text: 'from what you wrote',
  logo: 'suggested by your logo',
  you: 'your choice',
};

function hueSwatch(h: HueFamily): string {
  return h === 'neutral' ? '#a8a29e' : hslToHex(HUE_CENTERS[h], 72, 52);
}

type Row = { field: Exclude<IntakeField, 'oneLiner'>; label: string; vocab: VocabularyMember[]; multi?: boolean };

const ROWS: Row[] = [
  { field: 'industry', label: 'What it does', vocab: INDUSTRY },
  { field: 'audience', label: 'Who it’s for', vocab: AUDIENCE },
  { field: 'positioning', label: 'Where it stands', vocab: POSITIONING },
  { field: 'personality', label: 'How it feels', vocab: PERSONALITY, multi: true },
];

function AnswerRow({ row }: { row: Row }) {
  const context = useLogoFlow((s) => s.context);
  const update = useLogoFlow((s) => s.updateContext);
  const [open, setOpen] = useState(false);
  const raw = context[row.field];
  const ids = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const labels = ids.map((id) => row.vocab.find((m) => m.id === id)?.label ?? id);
  const source = context.sources[row.field];

  // Read live: two quick taps must both land.
  const pick = (id: string) => {
    const live = useLogoFlow.getState().context;
    const sources = { ...live.sources, [row.field]: 'you' as const };
    if (!row.multi) {
      update({ [row.field]: id, sources });
      setOpen(false);
      return;
    }
    const cur = live.personality;
    const next = cur.includes(id) ? cur.filter((p) => p !== id) : cur.length < MAX_PERSONALITY ? [...cur, id] : cur;
    update({ personality: next, sources });
  };

  return (
    <li className={`lf-answer${open ? ' is-open' : ''}`}>
      <div className="lf-answer-head">
        <span className="lf-answer-label">{row.label}</span>
        <span className="lf-answer-value">
          {labels.length ? labels.join(' · ') : <span className="lf-answer-empty">We’ll decide</span>}
          {source && labels.length > 0 && <span className="lf-answer-source">{SOURCE_LABEL[source]}</span>}
        </span>
        <DsButton tone="tertiary" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? 'Done' : labels.length ? 'Change' : 'Choose'}
        </DsButton>
      </div>
      {open && (
        <div className="lf-chips" role="group" aria-label={row.label}>
          {row.vocab.map((m) => {
            const active = ids.includes(m.id);
            return (
              <DsChip
                key={m.id}
                active={active}
                aria-pressed={active}
                disabled={row.multi && !active && ids.length >= MAX_PERSONALITY}
                onClick={() => pick(m.id)}
              >
                {m.label}
              </DsChip>
            );
          })}
        </div>
      )}
    </li>
  );
}

export function ContextStep() {
  const context = useLogoFlow((s) => s.context);
  const reading = useLogoFlow((s) => s.reading);
  const note = useLogoFlow((s) => s.intakeNote);
  const intakeRead = useLogoFlow((s) => s.intakeRead);
  const update = useLogoFlow((s) => s.updateContext);
  const [moreOpen, setMoreOpen] = useState(context.loveHues.length + context.avoidHues.length > 0);
  const read = () => void readIntake();
  const stale = context.about.trim() !== intakeRead.trim() && context.about.trim().length > 0;

  const toggleHue = (list: 'loveHues' | 'avoidHues', hue: HueFamily) => {
    const live = useLogoFlow.getState().context;
    const other = list === 'loveHues' ? 'avoidHues' : 'loveHues';
    const has = live[list].includes(hue);
    update({
      [list]: has ? live[list].filter((h) => h !== hue) : [...live[list], hue],
      [other]: live[other].filter((h) => h !== hue),
    } as Partial<typeof live>);
  };

  return (
    <div className="lf-stack lf-medium">
      <section className="lf-intake">
        <DsTextArea
          aria-label="About your brand"
          rows={5}
          placeholder={`Paste a brief, drop your website, or just describe ${context.name || 'your brand'} in a sentence.`}
          value={context.about}
          onChange={(e) => update({ about: e.target.value })}
          onPaste={() => setTimeout(read, 0)}
          onBlur={read}
        />
        <div className="lf-intake-foot">
          <span>Anything works — or leave it empty and we’ll go from your logo.</span>
          <div className="lf-intake-actions">
            {stale && !reading && (
              <DsButton tone="secondary" size="sm" onClick={read}>
                Read it
              </DsButton>
            )}
            <AiPromptMenu prompt={() => buildBriefPrompt(context.name)} label="No brief? Get one from AI" />
          </div>
        </div>
      </section>

      <section className="lf-understood" aria-live="polite" aria-busy={reading}>
        <header>
          <h2>{reading ? 'Reading…' : 'What we understood'}</h2>
          {reading && <LoadingPill label="Reading" />}
        </header>
        {note && <p className="lf-understood-note">{note}</p>}
        {context.oneLiner && <p className="lf-understood-line">“{context.oneLiner}”</p>}
        <ul className="lf-answers">
          {ROWS.map((row) => (
            <AnswerRow key={row.field} row={row} />
          ))}
        </ul>
      </section>

      <div className="lf-more">
        <DsButton tone="tertiary" size="sm" onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen}>
          {moreOpen ? 'Hide colour preferences' : 'Any colours you love or want to avoid? (optional)'}
        </DsButton>
        {moreOpen && (
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
        )}
      </div>
    </div>
  );
}
