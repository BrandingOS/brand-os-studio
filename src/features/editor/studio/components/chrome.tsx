// Editor chrome primitives.
//
// Three controls the DS does not have and a design editor cannot do
// without: a 30px icon button, a numeric field you can type into or
// step, and a colour swatch. They live here rather than in
// `src/shared/ds` deliberately — the decision ladder says build local
// and promote on evidence, and "a dense 30px editor control" is a
// feature-specific shape today. If a second surface wants them, that is
// the moment to promote them, not now.
//
// Everything below reads --ds-* tokens through studio.css.

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

// ─── Icon button ───────────────────────────────────────────────────────

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  label: string;
  /** Show the label beside the icon rather than only to assistive tech. */
  showLabel?: boolean;
  active?: boolean;
  /** Appended to the tooltip, e.g. "⌘Z". */
  shortcut?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { icon, label, showLabel, active, shortcut, className = '', ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        // `title` is the house tooltip in dense chrome (DsTooltip has no
        // anchoring of its own and there is no popover primitive).
        title={shortcut ? `${label} · ${shortcut}` : label}
        aria-label={label}
        aria-pressed={active === undefined ? undefined : active}
        className={`st-icon-btn ${showLabel ? 'st-icon-btn--label' : ''} ${
          active ? 'is-active' : ''
        } ${className}`}
        {...rest}
      >
        {icon}
        {showLabel ? <span>{label}</span> : null}
      </button>
    );
  },
);

// ─── Numeric field ─────────────────────────────────────────────────────

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  width?: number;
}

/**
 * A number you can type into.
 *
 * Two rules, both of which are what makes a numeric control in an editor
 * feel right rather than fight you:
 *
 *   • While focused the field holds YOUR text, not the model's. Echoing
 *     the committed value back on every keystroke makes "12" impossible
 *     to type when the value is clamped to a minimum of 20 — the field
 *     rewrites the "1" before you reach the "2".
 *   • Arrow keys step, Shift steps by ten, Enter commits, Escape
 *     abandons. Keyboard editing of a value is the difference between
 *     nudging a design and fighting a form.
 */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  disabled,
  width,
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clamp = (n: number) => {
    let out = n;
    if (min !== undefined) out = Math.max(min, out);
    if (max !== undefined) out = Math.min(max, out);
    return out;
  };

  const commit = (raw: string) => {
    const parsed = Number.parseFloat(raw);
    setDraft(null);
    if (!Number.isFinite(parsed)) return;
    const next = clamp(parsed);
    if (next !== value) onChange(next);
  };

  const shown = draft ?? String(round(value));

  return (
    <label className="st-field" style={width ? { width } : undefined}>
      <span className="st-field-label">{label}</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={shown}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit((e.target as HTMLInputElement).value);
            inputRef.current?.blur();
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(null);
            inputRef.current?.blur();
            return;
          }
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            // Stop the canvas nudging the selection at the same time.
            e.stopPropagation();
            const delta = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? step * 10 : step);
            const base = Number.parseFloat(shown);
            const next = clamp((Number.isFinite(base) ? base : value) + delta);
            setDraft(null);
            onChange(next);
          }
        }}
      />
      {suffix ? <span className="st-field-label">{suffix}</span> : null}
    </label>
  );
}

function round(n: number): number {
  return Math.abs(n % 1) < 0.005 ? Math.round(n) : Math.round(n * 100) / 100;
}

// ─── Colour swatch ─────────────────────────────────────────────────────

interface SwatchProps {
  color: string | null;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * A colour control that shows the colour.
 *
 * `null` means "no fill" and gets the transparency chequer the CSS
 * paints underneath, so an unfilled shape is legible as unfilled rather
 * than as white.
 */
export function Swatch({ color, label, onClick, disabled }: SwatchProps) {
  return (
    <button
      type="button"
      className="st-swatch"
      title={color ? `${label} · ${color}` : `${label} · none`}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <span
        className="st-swatch-fill"
        style={{ background: color ?? 'transparent' }}
      />
    </button>
  );
}

// ─── Editable text ─────────────────────────────────────────────────────

interface EditableTitleProps {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * The document's name, edited in place.
 *
 * Escape must mark itself cancelled before blurring: the blur it causes
 * would otherwise run the commit path it was meant to abandon. Same
 * shape as `ProjectName` on the dashboard, and the same bug avoided.
 */
export function EditableTitle({
  value,
  onCommit,
  placeholder = 'Untitled design',
  disabled,
}: EditableTitleProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    if (draft === null) return;
    // Keep the draft when the document updates underneath us.
  }, [value, draft]);

  const finish = () => {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(null);
      return;
    }
    const next = (draft ?? value).trim();
    setDraft(null);
    if (next && next !== value) onCommit(next);
  };

  return (
    <input
      ref={ref}
      className="st-docname"
      disabled={disabled}
      value={draft ?? value}
      placeholder={placeholder}
      aria-label="Design name"
      size={Math.max(8, Math.min(34, (draft ?? value).length + 1))}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={finish}
      onKeyDown={(e) => {
        // The editor's hotkeys listen on window; a name containing "d"
        // must not duplicate the selection.
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          ref.current?.blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelled.current = true;
          ref.current?.blur();
        }
      }}
    />
  );
}
