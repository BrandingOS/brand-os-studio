import { useEffect, useMemo, useRef, useState } from 'react';
import { FLATICON_RR_NAMES } from '../data/flaticonNames';

/**
 * Searchable picker over the @flaticon/flaticon-uicons "Regular Rounded"
 * catalog (~3,500 icons). Surfaces a paged grid — full result lists
 * would render ~3.5k DOM nodes per filter change, so we cap at
 * RESULT_LIMIT and let the search box narrow further. Selecting an
 * icon calls `onPick` with its full class name (e.g. `fi-rr-camera`).
 *
 * Already-added names render with a check overlay and are non-pickable
 * — quick visual signal that the icon is already in the brand's set.
 */

const RESULT_LIMIT = 240;

export type IconPickerModalProps = {
  open: boolean;
  /** Class names already on the brand — rendered as "added". */
  selected: string[];
  onPick: (className: string) => void;
  onClose: () => void;
};

export function IconPickerModal({ open, selected, onPick, onClose }: IconPickerModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // Focus the search input on open and reset the filter so a re-open
  // starts clean. Kept in sync via the open dep so reopens after a
  // close re-focus and re-clear.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Escape closes — the picker is its own dialog, separate from the
  // drilldown so it owns its own dismiss.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FLATICON_RR_NAMES.slice(0, RESULT_LIMIT);
    return FLATICON_RR_NAMES.filter((name) =>
      // Match against the bare label (after fi-rr-) so users type "user"
      // not "fi-rr-user".
      name.slice('fi-rr-'.length).includes(q),
    ).slice(0, RESULT_LIMIT);
  }, [query]);

  if (!open) return null;

  return (
    <div className="bk-icon-picker-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bk-icon-picker" onClick={(e) => e.stopPropagation()}>
        <div className="bk-icon-picker-head">
          <h2 className="bk-icon-picker-title">Add icons</h2>
          <button
            type="button"
            className="bk-icon-picker-close"
            onClick={onClose}
            aria-label="Close icon picker"
            title="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="bk-icon-picker-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${FLATICON_RR_NAMES.length.toLocaleString()} icons…`}
            aria-label="Search icons"
          />
        </div>
        <div className="bk-icon-picker-grid" role="listbox" aria-label="Icon results">
          {results.length === 0 ? (
            <p className="bk-icon-picker-empty">No icons match "{query}".</p>
          ) : (
            results.map((name) => {
              const isAdded = selectedSet.has(name);
              const label = name.slice('fi-rr-'.length).replace(/-/g, ' ');
              return (
                <button
                  key={name}
                  type="button"
                  className={`bk-icon-picker-cell ${isAdded ? 'is-added' : ''}`}
                  onClick={() => {
                    if (!isAdded) onPick(name);
                  }}
                  disabled={isAdded}
                  title={isAdded ? `${label} (already added)` : label}
                  role="option"
                  aria-selected={isAdded}
                >
                  <i className={`fi ${name}`} aria-hidden />
                  <span className="bk-icon-picker-cell-label">{label}</span>
                  {isAdded && (
                    <span className="bk-icon-picker-cell-check" aria-hidden>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
        <div className="bk-icon-picker-foot">
          <span className="bk-icon-picker-count">
            {query
              ? `${results.length} match${results.length === 1 ? '' : 'es'}${results.length === RESULT_LIMIT ? '+' : ''}`
              : `Showing first ${RESULT_LIMIT.toLocaleString()} of ${FLATICON_RR_NAMES.length.toLocaleString()}`}
          </span>
        </div>
      </div>
    </div>
  );
}
