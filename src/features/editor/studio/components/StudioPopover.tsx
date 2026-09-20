// An anchored popover for editor chrome.
//
// The DS has no popover, and the frozen shadcn one portals to
// `document.body` — outside `[data-workspace]`, where `--ds-*` does not
// resolve. `DsMenu` is a surface with no anchoring at all.
//
// So: `position: fixed`, measured against the trigger, rendered INSIDE
// the studio root. Fixed positioning escapes the context bar's
// `overflow-x: auto` (which would otherwise clip it) while staying in
// the token scope, and the studio shell puts no `transform` on any
// ancestor, which is the one thing that would break fixed positioning.
//
// It flips up when there is no room below and slides in from the edge
// when there is no room to the right, because a popover that opens
// off-screen is a control the user cannot reach.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  anchor: HTMLElement | null;
  children: ReactNode;
  /** Popover width; used for edge-flipping before the content measures. */
  width?: number;
  align?: 'start' | 'end';
  label?: string;
}

const GAP = 6;
const MARGIN = 8;

export function StudioPopover({
  open,
  onClose,
  anchor,
  children,
  width = 248,
  align = 'start',
  label,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const a = anchor.getBoundingClientRect();
      const h = ref.current?.offsetHeight ?? 260;
      const below = a.bottom + GAP;
      const flip = below + h > window.innerHeight - MARGIN && a.top - GAP - h > MARGIN;
      let left = align === 'end' ? a.right - width : a.left;
      left = Math.max(MARGIN, Math.min(left, window.innerWidth - width - MARGIN));
      setPos({ left, top: flip ? a.top - GAP - h : below });
    };
    place();
    // Re-place on scroll/resize: the context bar scrolls horizontally,
    // so the trigger can move without anything re-rendering.
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchor, width, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchor?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Stop the editor's own Escape (deselect) from also firing.
      e.stopPropagation();
      onClose();
    };
    const id = setTimeout(() => {
      document.addEventListener('pointerdown', onDown, true);
      document.addEventListener('keydown', onKey, true);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose, anchor]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      data-studio-popover
      style={{
        position: 'fixed',
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        width,
        zIndex: 60,
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border)',
        borderRadius: 'var(--ds-radius-menu)',
        boxShadow: 'var(--ds-shadow-float)',
        padding: 10,
        // Invisible until placed, so it never flashes at the corner.
        visibility: pos ? 'visible' : 'hidden',
        maxHeight: `calc(100vh - ${MARGIN * 2}px)`,
        overflowY: 'auto',
      }}
      // Typing inside the popover must not reach the canvas hotkeys.
      onKeyDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

/** Wire a trigger element to a popover without repeating the ref dance. */
export function usePopoverAnchor() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  return {
    anchor,
    open,
    setOpen,
    triggerProps: {
      ref: setAnchor,
      onClick: () => setOpen((v) => !v),
    },
    close: () => setOpen(false),
  };
}
