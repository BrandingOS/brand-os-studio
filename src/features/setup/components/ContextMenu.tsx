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
  /** Submenu: clicking this item MORPHS the menu box into these items
   *  (with a Back row) instead of closing. `onSelect` is ignored. */
  children?: ContextMenuItem[];
  /**
   * A second action on the SAME row, icon-only, at its end — for a shortcut
   * that belongs to this item rather than beside it in the list. A row with one
   * stops being a single button (a button inside a button is not a button), so
   * it becomes two buttons sharing a hover.
   */
  action?: {
    /** Its accessible name; there is no visible label. */
    label: string;
    icon: React.ReactNode;
    onSelect: () => void;
    /** Leave the menu up, for an action worth pressing more than once. */
    keepOpen?: boolean;
  };
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
 * Items with `children` open a second page INSIDE the same box — the box
 * morphs (width/height animate) to the new content rather than opening a
 * separate flyout.
 *
 * Closes on: clicking outside, pressing Escape, right-clicking again
 * elsewhere, or scrolling. Opening a new menu while one is visible is
 * handled by the parent replacing the state — the effect cleanup here
 * keeps listeners in sync.
 */
export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  // null = root page; otherwise the submenu currently shown.
  const [subItems, setSubItems] = useState<ContextMenuItem[] | null>(null);
  // Rect captured just before a page swap — consumed by the morph effect.
  const morphFromRef = useRef<DOMRect | null>(null);
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

  useEffect(() => {
    setSubItems(null);
  }, [items]);

  const swapTo = (next: ContextMenuItem[] | null) => {
    morphFromRef.current = ref.current?.getBoundingClientRect() ?? null;
    setSubItems(next);
  };

  // FLIP morph: animate the box from its pre-swap size to the new
  // natural size while the incoming items fade/slide in via CSS.
  useLayoutEffect(() => {
    const from = morphFromRef.current;
    const el = ref.current;
    if (!from || !el) return;
    morphFromRef.current = null;
    const to = el.getBoundingClientRect();
    if (from.width === to.width && from.height === to.height) return;
    el.animate(
      [
        { width: `${from.width}px`, height: `${from.height}px` },
        { width: `${to.width}px`, height: `${to.height}px` },
      ],
      { duration: 240, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' },
    );
  }, [subItems]);

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
    if (nx !== pos.x || ny !== pos.y) setPos({ x: nx, y: ny });
    // Re-clamp when the page swaps too — the submenu can be taller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y, subItems]);

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

  const shown = subItems ?? items;

  return createPortal(
    <div
      ref={ref}
      className="ctx-menu"
      data-theme={theme}
      style={{ position: 'fixed', left: pos.x, top: pos.y }}
      role="menu"
    >
      <div className="ctx-menu-page" key={subItems ? 'sub' : 'root'}>
        {subItems && (
          <button
            type="button"
            role="menuitem"
            className="ctx-menu-item ctx-menu-back"
            onClick={() => swapTo(null)}
          >
            <span className="ctx-menu-icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
            </span>
            <span className="ctx-menu-label">Back</span>
          </button>
        )}
        {shown.map((it, i) => {
          const row = (
            <button
              type="button"
              role="menuitem"
              className={`ctx-menu-item${it.destructive ? ' is-destructive' : ''}${it.disabled ? ' is-disabled' : ''}`}
              disabled={it.disabled}
              onClick={() => {
                if (it.disabled) return;
                if (it.children && it.children.length > 0) {
                  swapTo(it.children);
                  return;
                }
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
              {it.children && it.children.length > 0 && (
                <span className="ctx-menu-chevron" aria-hidden>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </span>
              )}
            </button>
          );
          if (!it.action) return <div key={i} className="ctx-menu-row">{row}</div>;
          return (
            <div key={i} className="ctx-menu-row has-action">
              {row}
              <button
                type="button"
                role="menuitem"
                className="ctx-menu-action"
                aria-label={it.action.label}
                title={it.action.label}
                onClick={() => {
                  it.action!.onSelect();
                  if (!it.action!.keepOpen) onClose();
                }}
              >
                {it.action.icon}
              </button>
            </div>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}

export type ContextMenuState = {
  x: number;
  y: number;
  items: ContextMenuItem[];
};
