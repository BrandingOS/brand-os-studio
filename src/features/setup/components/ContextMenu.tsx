import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ContextMenuItem = {
  label: string;
  onSelect: () => void;
  /** Visual tone — destructive items render in the warn palette. */
  destructive?: boolean;
  /** Greyed out, non-clickable. Used to show the current state of a
   *  toggleable option (e.g. the role a color already occupies). */
  disabled?: boolean;
  /** Optional 14px icon shown before the label. */
  icon?: React.ReactNode;
};

type Props = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

/**
 * Floating right-click menu rendered into document.body via a portal so
 * it's not clipped by card overflow. Positioned at the cursor; after
 * mount we measure and nudge left/up if the natural position would push
 * past the viewport edge.
 *
 * Closes on: clicking outside, pressing Escape, right-clicking again
 * elsewhere, or scrolling. Opening a new menu while one is visible is
 * handled by the parent replacing the state — the effect cleanup here
 * keeps listeners in sync.
 */
export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  // Menu is portaled to document.body and therefore sits outside the
  // workspace token scope. Read the workspace's current data-theme when
  // we mount so the pill flips black/white with the app's theme toggle
  // instead of hardcoding one tone.
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useLayoutEffect(() => {
    const ws = document.querySelector('[data-workspace]');
    const dt = ws?.getAttribute('data-theme');
    setTheme(dt === 'dark' ? 'dark' : 'light');
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let nx = x;
    let ny = y;
    if (nx + rect.width + pad > window.innerWidth) {
      nx = Math.max(pad, window.innerWidth - rect.width - pad);
    }
    if (ny + rect.height + pad > window.innerHeight) {
      ny = Math.max(pad, window.innerHeight - rect.height - pad);
    }
    if (nx !== x || ny !== y) setPos({ x: nx, y: ny });
  }, [x, y]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onScroll = () => onClose();
    // Defer binding by a tick so the triggering contextmenu event doesn't
    // bubble up and close us immediately.
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', onDoc);
      document.addEventListener('contextmenu', onDoc);
      document.addEventListener('keydown', onKey);
      window.addEventListener('scroll', onScroll, true);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('contextmenu', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="ctx-menu"
      data-theme={theme}
      style={{ position: 'fixed', left: pos.x, top: pos.y }}
      role="menu"
    >
      {items.map((it, i) => (
        <button
          key={i}
          type="button"
          role="menuitem"
          className={`ctx-menu-item${it.destructive ? ' is-destructive' : ''}${it.disabled ? ' is-disabled' : ''}`}
          disabled={it.disabled}
          onClick={() => {
            if (it.disabled) return;
            it.onSelect();
            onClose();
          }}
        >
          {it.icon && (
            <span className="ctx-menu-icon" aria-hidden>
              {it.icon}
            </span>
          )}
          <span className="ctx-menu-label">{it.label}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}

export type ContextMenuState = {
  x: number;
  y: number;
  items: ContextMenuItem[];
};
