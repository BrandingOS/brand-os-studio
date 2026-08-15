/**
 * Changing one brand value.
 *
 * Opened from an About card, so the section stays a scannable list of what the
 * brand IS and the alternatives live one click in. Laying every option out on
 * the section itself is what made it unreadable: five vocabularies at once is
 * roughly seventy chips before a single sentence of the brand appears.
 *
 * Two shapes, chosen by the concept rather than by convenience — chips where a
 * closed vocabulary exists, a text box where the meaning is in the wording.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CARDINALITY, VOCABULARIES, type VocabularyName } from '@/features/onboarding/vocabulary/vocabularies';

export type PickerTarget =
  | {
      kind: 'core';
      path: string;
      label: string;
      vocab: VocabularyName;
      selected: string[];
      /** Tone takes one — a brand with two tones has none. */
      single?: boolean;
      text?: undefined;
    }
  | { kind: 'core'; path: string; label: string; text: string; vocab?: undefined; selected?: undefined }
  | {
      kind: 'business';
      field: string;
      label: string;
      vocab: VocabularyName;
      selected: string[];
      single?: boolean;
      text?: undefined;
    }
  | { kind: 'business'; field: string; label: string; text: string; vocab?: undefined; selected?: undefined };

export interface ValuePickerProps {
  target: PickerTarget | null;
  theme: string;
  /** Where this was opened FROM, when that is somewhere to return to. */
  onBack?(): void;
  onClose(): void;
  onSave(next: unknown): void;
}

export function ValuePicker({ target, theme, onBack, onClose, onSave }: ValuePickerProps) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (!target) return;
    setChosen(target.vocab ? [...(target.selected ?? [])] : []);
    setText(target.text ?? '');
    setQuery('');
    setCustom('');
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      // Escape steps back where there is a step to take, and closes otherwise —
      // the same key meaning "undo the last move" either way.
      if (e.key === 'Escape') (onBack ?? onClose)();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [target, onBack, onClose]);

  if (!target || typeof document === 'undefined') return null;

  const isChips = Boolean(target.vocab);
  const all = target.vocab ? VOCABULARIES[target.vocab] : [];
  const single = 'single' in target ? target.single : false;
  const max = target.vocab ? CARDINALITY[target.vocab].max : Infinity;
  /**
   * Whether a word of the user's own can be stored here.
   *
   * Everywhere except visual style, which is a CLOSED union in the schema —
   * writing "swiss-adjacent" into it would fail validation and cost the whole
   * save. The vocabularies that back the rest are plain strings, so an answer
   * nobody anticipated is kept verbatim.
   */
  const allowsOther = Boolean(target.vocab) && target.vocab !== 'style';
  const chosenOther = chosen.filter((c) => !all.some((m) => m.id === c));
  // Long vocabularies are unusable as a wall of chips — 25 industries is a
  // search problem, not a browsing one.
  const searchable = all.length > 12;
  const needle = query.trim().toLowerCase();
  const members = needle ? all.filter((m) => m.label.toLowerCase().includes(needle)) : all;

  const toggle = (id: string) => {
    setChosen((prev) => {
      if (single || max === 1) return prev.includes(id) ? [] : [id];
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      // At the cap, the newest choice replaces the oldest rather than being
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
    if (!isChips) {
      onSave(text.trim());
      return;
    }
    // Business fields and single-value Core paths hold one id, not a list.
    if (target.kind === 'business' || single || max === 1) onSave(chosen[0] ?? '');
    else onSave(chosen.slice(0, max));
  };

  return createPortal(
    <div data-workspace data-theme={theme} className="about-modal-portal">
      <div className="value-picker-scrim" role="presentation" onClick={onClose} />
      <div className="value-picker" role="dialog" aria-modal="true" aria-label={`Change ${target.label}`}>
        <header className="value-picker-head">
          {/* Only when there IS somewhere to go back to. Arriving here from the
              New-section chips is a step forward, and a step forward with no
              way back means closing the whole thing and starting again. */}
          {onBack && (
            <button type="button" className="value-picker-back" onClick={onBack} aria-label="Back">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <h4>{target.label}</h4>
          <button type="button" className="value-picker-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="value-picker-body">
          {isChips ? (
            <>
              {searchable && (
                <input
                  type="search"
                  className="value-picker-search"
                  value={query}
                  autoFocus
                  placeholder={`Search ${target.label.toLowerCase()}…`}
                  aria-label={`Search ${target.label}`}
                  onChange={(e) => setQuery(e.target.value)}
                />
              )}
              <p className="value-picker-hint">
                {single || max === 1
                  ? 'Pick one.'
                  : `Pick up to ${max}.${chosen.length >= max ? ' The next one replaces the oldest.' : ''}`}
              </p>
              {members.length === 0 && (
                <p className="value-picker-hint">Nothing matches “{query}”.</p>
              )}
              <div className="value-picker-chips">
                {members.map((m) => {
                  const on = chosen.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`about-chip${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggle(m.id)}
                    >
                      {m.label}
                    </button>
                  );
                })}
                {/* Words the user already wrote that this list never had. */}
                {chosenOther.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="about-chip is-on"
                    aria-pressed
                    onClick={() => toggle(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/*
                No list covers every brand. A word of the user's own is kept
                exactly as they wrote it and ranks the same as any other choice
                — it is their answer either way.
              */}
              {allowsOther && (
                <div className="value-picker-other">
                  <input
                    type="text"
                    className="value-picker-other-input"
                    value={custom}
                    placeholder="Something else — write your own"
                    aria-label={`Add your own ${target.label.toLowerCase()}`}
                    onChange={(e) => setCustom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      addCustom();
                    }}
                  />
                  <button
                    type="button"
                    className="value-picker-other-add"
                    disabled={!custom.trim()}
                    onClick={addCustom}
                  >
                    Add
                  </button>
                </div>
              )}
            </>
          ) : (
            <textarea
              className="value-picker-text"
              rows={4}
              autoFocus
              value={text}
              placeholder="A sentence is plenty"
              aria-label={target.label}
              onChange={(e) => setText(e.target.value)}
            />
          )}
        </div>

        <footer className="value-picker-foot">
          <button type="button" className="value-picker-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="value-picker-save" onClick={save}>
            Save
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
