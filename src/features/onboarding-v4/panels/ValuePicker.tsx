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
import { VOCABULARIES, type VocabularyName } from '@/features/onboarding/vocabulary/vocabularies';

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
    };

export interface ValuePickerProps {
  target: PickerTarget | null;
  theme: string;
  onClose(): void;
  onSave(next: unknown): void;
}

export function ValuePicker({ target, theme, onClose, onSave }: ValuePickerProps) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!target) return;
    setChosen(target.vocab ? [...(target.selected ?? [])] : []);
    setText(target.text ?? '');
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  if (!target || typeof document === 'undefined') return null;

  const isChips = Boolean(target.vocab);
  const members = target.vocab ? VOCABULARIES[target.vocab] : [];
  const single = 'single' in target ? target.single : false;

  const toggle = (id: string) => {
    setChosen((prev) => {
      if (single) return prev.includes(id) ? [] : [id];
      return prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
    });
  };

  const save = () => {
    if (!isChips) {
      onSave(text.trim());
      return;
    }
    // Business fields and single-value Core paths hold one id, not a list.
    if (target.kind === 'business' || single) onSave(chosen[0] ?? '');
    else onSave(chosen);
  };

  return createPortal(
    <div data-workspace data-theme={theme} className="about-modal-portal">
      <div className="value-picker-scrim" role="presentation" onClick={onClose} />
      <div className="value-picker" role="dialog" aria-modal="true" aria-label={`Change ${target.label}`}>
        <header className="value-picker-head">
          <h4>{target.label}</h4>
          <button type="button" className="value-picker-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="value-picker-body">
          {isChips ? (
            <>
              <p className="value-picker-hint">
                {single ? 'Pick one.' : 'Pick as many as fit.'}
              </p>
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
              </div>
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
