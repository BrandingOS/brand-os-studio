/**
 * Build the brand strategy with the user's own AI.
 *
 * The same handoff onboarding uses — get the prompt, paste the reply — pointed
 * at the eleven strategy answers and nothing else. The product authors the
 * prompt and parses the reply; it never calls an AI itself, so this costs
 * nothing, needs no key, and works with whichever tool the user already pays
 * for.
 *
 * Two rules the arrangement exists to keep:
 *
 *  - **Nothing is written until the user says so.** The paste is parsed live
 *    and shown as a list of answers they can untick. A paste that silently
 *    rewrote seven fields would be indistinguishable from data loss.
 *  - **An answer the brand already holds is called out before it is replaced.**
 *    Filling a blank and overwriting a decision are different acts.
 *
 * Manual entry is untouched and sits beside this: the section's + button still
 * opens the by-hand flow, and every card stays individually editable.
 */
import { useEffect, useMemo, useState } from 'react';
import { DsButton, DsModal, DsTextArea } from '@/shared/ds';
import { AiPromptMenu } from '@/shared/ai-handoff/AiPromptMenu';
import type { BrandStrategyFields } from '../data/mockBrand';
import { STRATEGY_CARDS, contentOf } from '../data/strategyCards';
import { buildStrategyPrompt } from '../strategy/strategyPrompt';
import {
  parseStrategyBrief,
  labelOf,
  type ParsedStrategyField,
} from '../strategy/parseStrategyBrief';
import './strategyImport.css';

type Props = {
  open: boolean;
  brandName: string;
  strategy: BrandStrategyFields;
  /** The business description, when Setup has one — context for the prompt. */
  description?: string;
  onClose(): void;
  /** The answers the user kept. Applied by the caller, as one edit. */
  onApply(fields: ParsedStrategyField[]): void;
};

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export function StrategyImportModal({
  open,
  brandName,
  strategy,
  description,
  onClose,
  onApply,
}: Props) {
  const [text, setText] = useState('');
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setText('');
    setSkipped(new Set());
  }, [open]);

  const parsed = useMemo(() => parseStrategyBrief(text), [text]);

  // What each answer would replace. Empty means it fills a blank.
  const held = useMemo(() => {
    const map = new Map<string, string>();
    for (const card of STRATEGY_CARDS) {
      const value = contentOf(card, strategy).trim();
      if (value) map.set(card.key, value);
    }
    return map;
  }, [strategy]);

  const kept = parsed.fields.filter((f) => !skipped.has(f.key));

  const toggle = (key: string) =>
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const allOff = parsed.fields.length > 0 && kept.length === 0;

  return (
    <DsModal
      open={open}
      onClose={onClose}
      title="Build your brand strategy"
      actions={
        <>
          <DsButton tone="secondary" onClick={onClose}>
            Cancel
          </DsButton>
          <DsButton
            tone="primary"
            disabled={kept.length === 0}
            onClick={() => onApply(kept)}
          >
            {kept.length === 0
              ? 'Add answers'
              : `Add ${kept.length} answer${kept.length === 1 ? '' : 's'}`}
          </DsButton>
        </>
      }
    >
      <p className="sti-hint">
        Get the prompt, run it in your own AI tool, then paste the reply here.
        Nothing is saved until you choose what to keep.
      </p>

      <div className="sti-row">
        <span className="sti-row-label">Paste the reply</span>
        <AiPromptMenu
          label="Get the prompt"
          prompt={() => buildStrategyPrompt(brandName, { strategy, description })}
        />
      </div>

      <DsTextArea
        placeholder={'Brand summary: …\nIndustry: …\nAudience: …'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        spellCheck={false}
        data-strategy-paste
      />

      {text.trim().length > 0 && (
        <div className="sti-found" data-strategy-found={parsed.fields.length}>
          {parsed.fields.length === 0 ? (
            <p className="sti-hint" style={{ margin: 0 }}>
              Nothing recognised yet. The reply should use labelled lines —
              <em> Brand summary: …</em> — which is what the prompt asks for.
            </p>
          ) : (
            <>
              <div className="sti-found-head">
                <span className="sti-found-title">
                  Found {parsed.fields.length} answer
                  {parsed.fields.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  className="sti-all"
                  onClick={() =>
                    setSkipped(
                      allOff ? new Set() : new Set(parsed.fields.map((f) => f.key)),
                    )
                  }
                >
                  {allOff ? 'Select all' : 'Clear all'}
                </button>
              </div>
              <ul className="sti-list">
                {parsed.fields.map((f) => {
                  const on = !skipped.has(f.key);
                  const replacing = held.get(f.key);
                  return (
                    <li key={f.key}>
                      <button
                        type="button"
                        className="sti-item"
                        aria-pressed={on}
                        data-field={f.key}
                        onClick={() => toggle(f.key)}
                      >
                        <span className="sti-tick" aria-hidden>
                          <CheckIcon />
                        </span>
                        <span className="sti-text">
                          <span className="sti-label">
                            {labelOf(f.key)}
                            {f.isOther && <span className="sti-own">own word</span>}
                          </span>
                          <span className="sti-value">{f.display}</span>
                          {replacing && (
                            <span className="sti-label sti-replacing">
                              replaces “{replacing}”
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </DsModal>
  );
}
