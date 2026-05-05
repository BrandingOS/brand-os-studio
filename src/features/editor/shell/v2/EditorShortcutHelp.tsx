// Phase 11.3 — Keyboard shortcut help.
//
// Press `?` (anywhere outside an input) to open a dialog listing
// the editor's keyboard shortcuts. Self-contained: owns its own
// open state, sets up the global key listener, and renders a
// Radix Dialog with a single column of shortcut rows.

import { useEffect, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ShortcutRow {
  keys: string[];
  label: string;
}

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
const META = isMac ? '⌘' : 'Ctrl';

const SHORTCUTS: ShortcutRow[] = [
  { keys: [META, 'S'], label: 'Save now' },
  { keys: [META, 'Z'], label: 'Undo' },
  { keys: [META, '⇧', 'Z'], label: 'Redo' },
  { keys: [META, '+'], label: 'Zoom in' },
  { keys: [META, '−'], label: 'Zoom out' },
  { keys: [META, '0'], label: 'Fit canvas to view' },
  { keys: ['?'], label: 'Open this help' },
];

export function EditorShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when the user is typing — '?' is shift+/, also valid in inputs.
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if ((e.target as HTMLElement | null)?.isContentEditable) return;
      if (e.key === '?') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-editor-shortcut-help
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Press <Key>?</Key> any time to open this list.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-1.5 mt-2" role="list">
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-muted-foreground">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <Key key={i}>{k}</Key>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md border border-border bg-muted px-1.5 text-[11px] font-medium text-foreground">
      {children}
    </kbd>
  );
}
