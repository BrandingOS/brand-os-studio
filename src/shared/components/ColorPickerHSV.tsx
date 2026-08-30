import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// The picker's cp-* styles live here (scoped under [data-workspace]). A
// shared component must carry its own styles — hosts like the dev lab
// never mount WorkspaceShell, which is where this sheet normally loads.
import '@/shared/styles/workspace.css';

/**
 * Inline HSV color picker — ported from new-version/brandos/brandOS
 * brand board.html. Drop it inside a `.cp-expand` container that's
 * conditionally marked `.is-open` to animate in/out.
 *
 * The picker operates on HSV internally and emits hex via `onChange`
 * (live, for preview) and `onCommit` (final, on "Update" click).
 *
 * Promoted from features/setup to the shared product layer (2026-08-22):
 * Setup, onboarding review, the guideline Brand panel, the color-system
 * tool and the editor's floating toolbar all pick colors through it —
 * same semantics everywhere. Its styles are the `cp-*` rules in
 * shared/styles/workspace.css, scoped under `[data-workspace]`; a host
 * mounted outside the workspace (a body portal) must set that attribute
 * on its own container.
 */

type RGB = [number, number, number];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case rf:
        h = ((gf - bf) / d) % 6;
        break;
      case gf:
        h = (bf - rf) / d + 2;
        break;
      default:
        h = (rf - gf) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, v };
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = v - c;
  return rgbToHex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
}

type PaletteOption = { key: string; label: string };

type Props = {
  hex: string;
  onChange?: (hex: string) => void;
  onCommit: (hex: string) => void;
  onCancel: () => void;
  /** Render a more compact surface (shorter SV canvas) — used for the
   *  "add a new color" flow so the picker doesn't dominate the page. */
  compact?: boolean;
  /** When set, shows a pill-group between the hex input and the action
   *  buttons so the user can pick which palette the new color lands in. */
  paletteOptions?: PaletteOption[];
  selectedPalette?: string;
  onSelectPalette?: (key: string) => void;
  /** Override the commit button label — "Update" for edit, "Add" for create. */
  commitLabel?: string;
  /** Focus + select the hex input on mount — the "add a color" flow wants
   *  the user typing/pasting a code immediately. */
  autoFocusHex?: boolean;
};

export function ColorPickerHSV({
  hex,
  onChange,
  onCommit,
  onCancel,
  compact = false,
  paletteOptions,
  selectedPalette,
  onSelectPalette,
  commitLabel = 'Update',
  autoFocusHex = false,
}: Props) {
  const initial = useMemo(() => {
    const rgb = hexToRgb(hex) || ([0, 0, 0] as RGB);
    return rgbToHsv(rgb[0], rgb[1], rgb[2]);
  }, [hex]);

  const [state, setState] = useState<{ h: number; s: number; v: number }>(initial);
  const [hexInput, setHexInput] = useState<string>(hex.toUpperCase());
  const [hexError, setHexError] = useState(false);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const hexInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocusHex) return;
    // Defer past the expand animation's first frame so focus isn't stolen.
    const t = window.setTimeout(() => {
      hexInputRef.current?.focus();
      hexInputRef.current?.select();
    }, 60);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentHex = useMemo(() => hsvToHex(state.h, state.s, state.v), [state]);

  useEffect(() => {
    setHexInput(currentHex.toUpperCase());
  }, [currentHex]);

  /**
   * The live preview fires when the COLOUR changes — never when the
   * callback's identity does.
   *
   * `onChange` used to be a dependency of this effect, and every host
   * passes it as an inline arrow. So the effect re-ran on every render of
   * the host; if that callback set any state (which is the whole point of
   * a live preview) the host re-rendered, minted a new arrow, and the
   * effect fired again — an unbounded loop that shows up as "Maximum
   * update depth exceeded" and takes the page down with it. It killed the
   * Brand Kit's Colours panel (`ColorsEditor`, whose `onChange` calls
   * `setRows` with a freshly mapped array, so React can never bail out).
   *
   * A ref keeps the newest callback reachable without subscribing to it —
   * the same shape `ColorsEditor` uses for its own live preview.
   */
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current?.(currentHex);
  }, [currentHex]);

  const drag = useCallback(
    (
      el: HTMLElement | null,
      onMove: (xr: number, yr: number, ev: MouseEvent | TouchEvent) => void,
    ) => {
      if (!el) return;
      const start = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        const move = (ev: MouseEvent | TouchEvent) => {
          const rect = el.getBoundingClientRect();
          const pt = 'touches' in ev ? ev.touches[0] : ev;
          const x = clamp(pt.clientX - rect.left, 0, rect.width);
          const y = clamp(pt.clientY - rect.top, 0, rect.height);
          onMove(x / rect.width, y / rect.height, ev);
        };
        const end = () => {
          window.removeEventListener('mousemove', move as EventListener);
          window.removeEventListener('mouseup', end);
          window.removeEventListener('touchmove', move as EventListener);
          window.removeEventListener('touchend', end);
        };
        move(e);
        window.addEventListener('mousemove', move as EventListener);
        window.addEventListener('mouseup', end);
        window.addEventListener('touchmove', move as EventListener, { passive: false });
        window.addEventListener('touchend', end);
      };
      el.addEventListener('mousedown', start as EventListener);
      el.addEventListener('touchstart', start as EventListener, { passive: false });
      return () => {
        el.removeEventListener('mousedown', start as EventListener);
        el.removeEventListener('touchstart', start as EventListener);
      };
    },
    [],
  );

  useEffect(() => {
    return drag(svRef.current, (xr, yr) => {
      setState((s) => ({ ...s, s: xr, v: 1 - yr }));
    });
  }, [drag]);

  useEffect(() => {
    return drag(hueRef.current, (xr) => {
      setState((s) => ({ ...s, h: xr * 360 }));
    });
  }, [drag]);

  const handleHexInput = (raw: string) => {
    setHexError(false);
    setHexInput(raw.toUpperCase());
    let v = raw.trim();
    if (!v.startsWith('#')) v = `#${v}`;
    const rgb = hexToRgb(v);
    if (!rgb) return;
    const hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    setState(hsv);
  };

  /** Commit ONLY when the typed code is a real color. The old behavior
   *  committed `currentHex` (the picker's internal color) even when the
   *  input held garbage — so a wrong code silently added a random color. */
  const tryCommit = () => {
    let v = hexInput.trim();
    if (!v.startsWith('#')) v = `#${v}`;
    if (/^#[0-9a-fA-F]{3}$/.test(v)) {
      v = `#${v.slice(1).split('').map((c) => c + c).join('')}`;
    }
    if (!hexToRgb(v)) {
      setHexError(true);
      hexInputRef.current?.focus();
      hexInputRef.current?.select();
      return;
    }
    onCommit(v.toUpperCase());
  };

  // Enter commits / Escape cancels from ANYWHERE while the picker is open —
  // not only when the hex input has focus (e.g. right after dragging the
  // hue/SV sliders). Fields keep their own Enter; the ref avoids re-binding
  // the document listener on every render.
  const keyActionsRef = useRef({ commit: tryCommit, cancel: onCancel });
  keyActionsRef.current = { commit: tryCommit, cancel: onCancel };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        keyActionsRef.current.commit();
      } else if (e.key === 'Escape') {
        keyActionsRef.current.cancel();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className={`cp-body${compact ? ' is-compact' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={svRef}
        className="cp-sv"
        style={{ background: `hsl(${state.h}, 100%, 50%)` }}
      >
        <div className="cp-sv-sat" />
        <div className="cp-sv-val" />
        <div
          className="cp-sv-cursor"
          style={{ left: `${state.s * 100}%`, top: `${(1 - state.v) * 100}%` }}
        />
      </div>
      <div ref={hueRef} className="cp-hue">
        <div className="cp-hue-cursor" style={{ left: `${(state.h / 360) * 100}%` }} />
      </div>
      <div className="cp-footer">
        <div className="cp-footer-top">
          <div className={`cp-hex-wrap${hexError ? ' is-invalid' : ''}`}>
            <span className="cp-swatch-preview" style={{ background: currentHex }} />
            <input
              ref={hexInputRef}
              type="text"
              className="cp-hex-input"
              value={hexInput}
              maxLength={7}
              spellCheck={false}
              onChange={(e) => handleHexInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  tryCommit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancel();
                }
              }}
              aria-label="Hex color"
              aria-invalid={hexError}
            />
          </div>
          {hexError && <span className="cp-hex-error">Invalid color code</span>}
          {paletteOptions && paletteOptions.length > 0 && (
            <div className="cp-palette-wrap">
              <select
                className="cp-palette-select"
                value={selectedPalette ?? ''}
                onChange={(e) => onSelectPalette?.(e.target.value)}
                aria-label="Target palette"
              >
                {paletteOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!compact && (
            <div className="cp-actions">
              <button type="button" className="cp-cancel-btn" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="cp-add-btn" onClick={tryCommit}>
                {commitLabel}
              </button>
            </div>
          )}
        </div>
        {compact && (
          <button
            type="button"
            className="cp-add-btn cp-add-btn--full"
            onClick={tryCommit}
          >
            {commitLabel}
          </button>
        )}
      </div>
    </div>
  );
}
