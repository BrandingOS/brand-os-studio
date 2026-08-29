// A `⋯` button that opens the DS menu.
//
// `DsMenu` is a presentational container (a `div[role=menu]`), not a trigger — the DS
// deliberately renders overlays IN PLACE so `--ds-*` tokens resolve in the local theme
// scope, which means each caller owns the open/close state. This is that, once, for the
// members surface: click-outside, Escape, and focus returned to the trigger.
import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { DsMenu, DsMenuItem } from '@/shared/ds';

export type RowMenuItem = { label: string; onSelect: () => void; danger?: boolean };

export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="mem-rowmenu" ref={wrap}>
      <button
        ref={trigger}
        type="button"
        className="mem-row-menu"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={16} strokeWidth={1.8} aria-hidden />
      </button>
      {open && (
        <div className="mem-rowmenu-pop">
          <DsMenu>
            {items.map((it) => (
              <DsMenuItem
                key={it.label}
                danger={it.danger}
                onClick={() => { setOpen(false); it.onSelect(); }}
              >
                {it.label}
              </DsMenuItem>
            ))}
          </DsMenu>
        </div>
      )}
    </div>
  );
}
