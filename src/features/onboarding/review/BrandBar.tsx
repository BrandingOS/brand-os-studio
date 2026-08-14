/**
 * "Name – slogan" above the review — the retired brand bar, kept.
 *
 * Plain left-aligned text with no card around it, deliberately: a box here
 * would make the brand's own name look like one more section to review, when
 * it is the heading everything else sits under.
 *
 * The slogan is edited in place, as it was. Industry and style ride alongside
 * as quiet chips — a summary of what the brand IS, echoing values that are
 * edited properly down in About. Editing them here too would give one value two
 * homes on one screen.
 */
import { useEffect, useRef, useState } from 'react';

export interface BrandBarProps {
  name: string;
  slogan: string;
  /** Vocabulary labels, already resolved. Empty renders nothing. */
  industry?: string;
  style?: string[];
  onSlogan(next: string): void;
}

export function BrandBar({ name, slogan, industry, style = [], onSlogan }: BrandBarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(slogan);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== slogan) onSlogan(draft.trim());
  };

  return (
    <div className="onb-bb">
      <span className="onb-bb-n">{name}</span>
      <span className="onb-bb-s" aria-hidden="true">–</span>

      {editing ? (
        <input
          ref={input}
          type="text"
          className="onb-bb-si"
          value={draft}
          maxLength={80}
          placeholder="your brand slogan"
          aria-label="Brand slogan"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          className={`onb-bb-sl${slogan ? '' : ' is-empty'}`}
          onClick={() => {
            setDraft(slogan);
            setEditing(true);
          }}
        >
          {slogan || 'your brand slogan'}
        </button>
      )}

      {(industry || style.length > 0) && (
        <span className="onb-bb-m">
          {industry && <span className="onb-chip is-picked">{industry}</span>}
          {style.length > 0 && <span className="onb-chip is-picked">{style.join(' · ')}</span>}
        </span>
      )}
    </div>
  );
}
