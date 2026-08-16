/**
 * Changing one strategy answer.
 *
 * Two shapes, chosen by the concept rather than by convenience — chips where a
 * closed vocabulary exists, a text box where the meaning is in the wording.
 * That is the same rule the onboarding review follows, so a field the user
 * answered with chips there is answered with chips here.
 *
 * Built on the Setup design system (`DsModal`, `DsTextArea`) and the About
 * editor's own chip styling, rather than importing the review's picker: that
 * one belongs to the frozen onboarding interface and carries its stylesheet
 * with it. Same behaviour, Setup's materials.
 */
import { useEffect, useMemo, useState } from 'react';
import { DsButton, DsInput, DsModal, DsTextArea } from '@/shared/ds';
import { VOCABULARIES } from '@/features/onboarding/vocabulary/vocabularies';
import type { StrategyCard } from '../data/strategyCards';

export type StrategyEditTarget = {
  card: StrategyCard;
  /** Ids for a vocabulary field; a single-element list for prose. */
  selected: string[];
  text: string;
};

type Props = {
  target: StrategyEditTarget | null;
  onClose(): void;
  onSave(next: { key: StrategyCard['key']; value: string | string[] }): void;
};

export function StrategyEditorModal({ target, onClose, onSave }: Props) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (!target) return;
    setChosen([...target.selected]);
    setText(target.text);
    setQuery('');
    setCustom('');
  }, [target]);

  const card = target?.card;
  const all = useMemo(() => (card?.vocab ? VOCABULARIES[card.vocab] : []), [card?.vocab]);
  // Long vocabularies are unusable as a wall of chips — 25 industries is a
  // search problem, not a browsing one.
  const searchable = all.length > 12;
  const needle = query.trim().toLowerCase();
  const members = needle ? all.filter((m) => m.label.toLowerCase().includes(needle)) : all;
  // Words the user already wrote that this list never had.
  const chosenOther = chosen.filter((c) => !all.some((m) => m.id === c));

  if (!card) return null;
  const max = card.max ?? Infinity;
  const single = max === 1;

  const toggle = (id: string) => {
    setChosen((prev) => {
      if (single) return prev.includes(id) ? [] : [id];
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      // At the cap the newest choice replaces the oldest rather than being
      // silently refused — a chip that does nothing when clicked reads as broken.
      return prev.length >= max ? [...prev.slice(1), id] : [...prev, id];
    });
  };

  const addCustom = () => {
    const word = custom.trim();
    if (!word) return;
    setCustom('');
    // Matching an existing member by name selects THAT rather than storing a
    // duplicate under different wording.
    const known = all.find((m) => m.label.toLowerCase() === word.toLowerCase());
    toggle(known ? known.id : word);
  };

  const save = () => {
    if (!card.vocab) {
      onSave({ key: card.key, value: text.trim() });
      return;
    }
    onSave({ key: card.key, value: single ? chosen[0] ?? '' : chosen.slice(0, max) });
  };

  return (
    <DsModal
      open={Boolean(target)}
      onClose={onClose}
      title={card.name}
      actions={
        <>
          <DsButton tone="secondary" onClick={onClose}>
            Cancel
          </DsButton>
          <DsButton tone="primary" onClick={save}>
            Save
          </DsButton>
        </>
      }
    >
      {card.vocab ? (
        <div>
          {searchable && (
            <DsInput
              type="search"
              value={query}
              autoFocus
              placeholder={`Search ${card.name.toLowerCase()}…`}
              aria-label={`Search ${card.name}`}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          <p style={{ margin: '12px 0 8px', fontSize: 13, color: 'var(--ds-text-muted)' }}>
            {single
              ? 'Pick one.'
              : `Pick up to ${max}.${chosen.length >= max ? ' The next one replaces the oldest.' : ''}`}
          </p>
          {members.length === 0 && (
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--ds-text-muted)' }}>
              Nothing matches “{query}”.
            </p>
          )}
          <div className="about-suggestions" aria-label={card.name}>
            {members.map((m) => {
              const on = chosen.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`about-suggestion-chip${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => toggle(m.id)}
                >
                  {m.label}
                </button>
              );
            })}
            {chosenOther.map((c) => (
              <button
                key={c}
                type="button"
                className="about-suggestion-chip is-on"
                aria-pressed
                onClick={() => toggle(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {/*
            No list covers every brand. A word of the user's own is kept exactly
            as they wrote it and ranks the same as any other choice — it is their
            answer either way. Visual style is the exception: a closed union in
            the schema, where a free word would fail validation on save.
          */}
          {card.allowsOther && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <DsInput
                  type="text"
                  value={custom}
                  placeholder="Something else — write your own"
                  aria-label={`Add your own ${card.name.toLowerCase()}`}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    addCustom();
                  }}
                />
              </div>
              <DsButton tone="secondary" disabled={!custom.trim()} onClick={addCustom}>
                Add
              </DsButton>
            </div>
          )}
        </div>
      ) : (
        <DsTextArea
          label={card.name}
          autoFocus
          rows={4}
          value={text}
          placeholder="A sentence is plenty"
          onChange={(e) => setText(e.target.value)}
        />
      )}
    </DsModal>
  );
}
