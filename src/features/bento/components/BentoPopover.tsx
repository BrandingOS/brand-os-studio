import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * A panel anchored to a control.
 *
 * ── Why this is feature-local and not a DS primitive ─────────────────────
 *
 * The DS has no popover, and this is the only surface in the migration that
 * needs one — a single call site is the F rung of the reuse ladder, not the D
 * rung. If a second surface wants the same thing it gets promoted then, with
 * two real consumers to design the API against.
 *
 * ── Why not Radix ────────────────────────────────────────────────────────
 *
 * `components/ui/popover` is the frozen shadcn layer, closed to new Studio
 * work, and its content renders through a Portal under `document.body` — where
 * a scoped `[data-workspace]` rule never reaches and, worse, where a `--ds-*`
 * custom property resolving to nothing silently drops the declaration. Anchor
 * positioning is the only thing Radix would be buying here, and one absolutely
 * positioned box under a relatively positioned trigger buys it for free while
 * keeping the panel inside the local theme scope.
 *
 * What it does keep from Radix, because these are the parts people notice when
 * they are missing: Escape closes and returns focus to the trigger, a pointer
 * press outside closes, and the trigger states `aria-expanded`/`aria-controls`.
 */
export function BentoPopover({
  label,
  icon,
  children,
  align = 'end',
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      // Closing with the keyboard must not drop focus to the body, or the
      // next Tab restarts at the top of the document.
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="bento-pop" ref={wrap}>
      <button
        ref={trigger}
        type="button"
        className="bento-toolbtn"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {icon}
        {label}
      </button>
      {open && (
        <div className="bento-pop-panel" id={id} data-align={align}>
          {children}
        </div>
      )}
    </div>
  );
}
