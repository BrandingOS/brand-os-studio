/**
 * useHotkeys — tiny keyboard shortcut registry for the tool.
 *
 * We deliberately avoid a heavy dependency here. The shortcuts are
 * single-letter, plain-keystroke bindings that fire when no text input
 * is focused.
 */
import { useEffect } from 'react';

export type HotkeyMap = Record<string, (e: KeyboardEvent) => void>;

function isTypingIn(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return target.isContentEditable;
}

export function useHotkeys(map: HotkeyMap, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingIn(e.target)) return;
      const handler = map[e.key.toLowerCase()];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [map, enabled]);
}
