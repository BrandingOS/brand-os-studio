/**
 * Which undo stack the user is actually in, and the one keyboard handler.
 *
 * Scopes register while mounted. The most recently registered live scope is
 * the active one — which matches how these surfaces nest in practice: opening
 * a deck editor over a workspace means ⌘Z should reach the deck, and closing
 * it should hand the keys back.
 *
 * Deliberately NOT persisted. History has already broken this app once:
 * `shared/editor/historyStore.ts` grew to 1.5 MB of a 5 MB localStorage
 * budget and brands silently stopped saving. Undo is a session concept here.
 */
import { create } from 'zustand';
import type { RegisteredScope, UndoScope } from './types';

interface HistoryRegistryState {
  scopes: RegisteredScope[];
  /** Bumped by `notify()` so React re-reads canUndo/canRedo, which are calls. */
  version: number;

  register: (scope: UndoScope) => () => void;
  /** Tell the registry a scope's can-undo/can-redo answers may have changed. */
  notify: () => void;

  active: () => RegisteredScope | undefined;
  undo: () => boolean;
  redo: () => boolean;
}

let seq = 0;

export const useHistoryRegistry = create<HistoryRegistryState>((set, get) => ({
  scopes: [],
  version: 0,

  register: (scope) => {
    seq += 1;
    const entry: RegisteredScope = { ...scope, seq };
    set((s) => ({ scopes: [...s.scopes, entry], version: s.version + 1 }));
    return () => {
      set((s) => ({
        scopes: s.scopes.filter((x) => x.seq !== entry.seq),
        version: s.version + 1,
      }));
    };
  },

  notify: () => set((s) => ({ version: s.version + 1 })),

  active: () => {
    const { scopes } = get();
    if (scopes.length === 0) return undefined;
    return scopes.reduce((a, b) => (b.seq > a.seq ? b : a));
  },

  undo: () => {
    const scope = get().active();
    if (!scope?.canUndo()) return false;
    scope.undo();
    get().notify();
    return true;
  },

  redo: () => {
    const scope = get().active();
    if (!scope?.canRedo()) return false;
    scope.redo();
    get().notify();
    return true;
  },
}));

/** Imperative entry points, for menu items and non-React callers. */
export const history = {
  undo: () => useHistoryRegistry.getState().undo(),
  redo: () => useHistoryRegistry.getState().redo(),
  canUndo: () => useHistoryRegistry.getState().active()?.canUndo() ?? false,
  canRedo: () => useHistoryRegistry.getState().active()?.canRedo() ?? false,
  activeLabel: () => useHistoryRegistry.getState().active()?.label,
};

/**
 * True when the event target is somewhere the browser's own undo belongs.
 *
 * Exported because the answer is subtle enough to be worth testing directly:
 * a `<select>` is not a text field, a `readOnly` input has no native undo to
 * protect, and `contentEditable` is inherited so `closest()` is the only
 * reliable check.
 */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  const field = el.closest('input, textarea, [contenteditable]');
  if (!field) return false;
  if (field instanceof HTMLInputElement) {
    if (field.readOnly || field.disabled) return false;
    // Checkboxes, radios, colours and ranges have no text to undo.
    return ['text', 'search', 'url', 'tel', 'email', 'password', 'number', ''].includes(field.type);
  }
  if (field instanceof HTMLTextAreaElement) return !field.readOnly && !field.disabled;
  return field.getAttribute('contenteditable') !== 'false';
}

/**
 * The single keyboard arbiter. Mounted once, at the app root.
 *
 * It is a no-op when no scope is registered, which is what makes it safe to
 * land beside the eight pre-existing ⌘Z listeners: surfaces that have not
 * adopted `UndoScope` keep behaving exactly as they do today.
 */
export function startHistoryKeyboard(target: Window = window): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;
    const key = event.key.toLowerCase();
    const isUndo = key === 'z' && !event.shiftKey;
    const isRedo = (key === 'z' && event.shiftKey) || (key === 'y' && !event.metaKey);
    if (!isUndo && !isRedo) return;

    const scope = useHistoryRegistry.getState().active();
    if (!scope) return;
    if (!scope.ownsTextInput && isTextEntryTarget(event.target)) return;

    const handled = isUndo
      ? useHistoryRegistry.getState().undo()
      : useHistoryRegistry.getState().redo();

    // Only swallow the event when something actually moved. At the end of the
    // stack the browser's native undo is better than nothing happening.
    if (handled) event.preventDefault();
  };

  target.addEventListener('keydown', onKeyDown);
  return () => target.removeEventListener('keydown', onKeyDown);
}
