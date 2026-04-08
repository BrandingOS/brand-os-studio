/**
 * Global ⌘K / Ctrl+K listener that opens the command palette.
 * Used by the <CommandPaletteProvider> mounted at the app root.
 */
import * as React from 'react';

export function useCommandPaletteHotkey(setOpen: (open: boolean | ((p: boolean) => boolean)) => void) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);
}
