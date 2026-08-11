import { useCallback, useRef, useState } from 'react';
import { type ThemeMode, type TokenDef, tokenScope } from './registry';

/**
 * Draft token overrides for the DS Controller.
 *
 * Drafts are experiments layered over the canonical tokens.css values —
 * they live in localStorage only and are applied as inline custom
 * properties on the controller's preview wrapper. Nothing here ever
 * touches the shipped stylesheet.
 */

export interface DraftState {
  light: Record<string, string>;
  dark: Record<string, string>;
  global: Record<string, string>;
}

export const DS_DRAFT_STORAGE_KEY = 'brandos:ds-controller:draft';
const STORAGE_VERSION = 1;
const UNDO_LIMIT = 100;

const emptyDraft = (): DraftState => ({ light: {}, dark: {}, global: {} });

export function loadDraft(storage: Pick<Storage, 'getItem'> = localStorage): DraftState {
  try {
    const raw = storage.getItem(DS_DRAFT_STORAGE_KEY);
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw);
    if (parsed?.v !== STORAGE_VERSION) return emptyDraft();
    return {
      light: parsed.light ?? {},
      dark: parsed.dark ?? {},
      global: parsed.global ?? {},
    };
  } catch {
    return emptyDraft();
  }
}

function persist(draft: DraftState, storage: Pick<Storage, 'setItem'> = localStorage) {
  try {
    storage.setItem(DS_DRAFT_STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, ...draft }));
  } catch {
    /* storage full/unavailable — drafts just stop persisting */
  }
}

export interface TokenDrafts {
  draft: DraftState;
  /** Draft value if overridden, else undefined. */
  getOverride: (def: TokenDef, mode: ThemeMode) => string | undefined;
  isOverridden: (def: TokenDef, mode: ThemeMode) => boolean;
  setToken: (def: TokenDef, mode: ThemeMode, value: string) => void;
  resetToken: (def: TokenDef, mode: ThemeMode) => void;
  /** Reset every override among `defs` (one undo step). */
  resetSection: (defs: TokenDef[], mode: ThemeMode) => void;
  resetAll: () => void;
  undo: () => void;
  canUndo: boolean;
  overrideCount: number;
  /** After a successful save+codegen: drop drafts AND history — the saved
   * values are the new canonical baseline, so "undo" back into stale drafts
   * would be a lie. */
  clearSaved: () => void;
}

export function useTokenDrafts(): TokenDrafts {
  const [draft, setDraft] = useState<DraftState>(loadDraft);
  // All mutation logic works off refs and does its side effects (history,
  // persistence) OUTSIDE setState updaters, so StrictMode double-invocation
  // can't double-push undo history.
  const draftRef = useRef(draft);
  const historyRef = useRef<DraftState[]>([]);
  const [historySize, setHistorySize] = useState(0);

  const apply = useCallback((next: DraftState) => {
    historyRef.current.push(draftRef.current);
    if (historyRef.current.length > UNDO_LIMIT) historyRef.current.shift();
    setHistorySize(historyRef.current.length);
    draftRef.current = next;
    setDraft(next);
    persist(next);
  }, []);

  const setToken = useCallback(
    (def: TokenDef, mode: ThemeMode, value: string) => {
      const prev = draftRef.current;
      const scope = tokenScope(def, mode);
      if (prev[scope][def.cssVar] === value) return;
      apply({ ...prev, [scope]: { ...prev[scope], [def.cssVar]: value } });
    },
    [apply],
  );

  const resetToken = useCallback(
    (def: TokenDef, mode: ThemeMode) => {
      const prev = draftRef.current;
      const scope = tokenScope(def, mode);
      if (!(def.cssVar in prev[scope])) return;
      const scopeNext = { ...prev[scope] };
      delete scopeNext[def.cssVar];
      apply({ ...prev, [scope]: scopeNext });
    },
    [apply],
  );

  const resetSection = useCallback(
    (defs: TokenDef[], mode: ThemeMode) => {
      const prev = draftRef.current;
      let changed = false;
      const next: DraftState = { light: { ...prev.light }, dark: { ...prev.dark }, global: { ...prev.global } };
      for (const def of defs) {
        const scope = tokenScope(def, mode);
        if (def.cssVar in next[scope]) {
          delete next[scope][def.cssVar];
          changed = true;
        }
      }
      if (changed) apply(next);
    },
    [apply],
  );

  const resetAll = useCallback(() => {
    const prev = draftRef.current;
    const count =
      Object.keys(prev.light).length + Object.keys(prev.dark).length + Object.keys(prev.global).length;
    if (count === 0) return;
    apply(emptyDraft());
  }, [apply]);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    setHistorySize(historyRef.current.length);
    if (prev) {
      draftRef.current = prev;
      setDraft(prev);
      persist(prev);
    }
  }, []);

  const clearSaved = useCallback(() => {
    const next = emptyDraft();
    historyRef.current = [];
    setHistorySize(0);
    draftRef.current = next;
    setDraft(next);
    persist(next);
  }, []);

  const getOverride = useCallback(
    (def: TokenDef, mode: ThemeMode) => draft[tokenScope(def, mode)][def.cssVar],
    [draft],
  );

  const isOverridden = useCallback(
    (def: TokenDef, mode: ThemeMode) => draft[tokenScope(def, mode)][def.cssVar] !== undefined,
    [draft],
  );

  const overrideCount =
    Object.keys(draft.light).length + Object.keys(draft.dark).length + Object.keys(draft.global).length;

  return {
    draft,
    getOverride,
    isOverridden,
    setToken,
    resetToken,
    resetSection,
    resetAll,
    undo,
    canUndo: historySize > 0,
    overrideCount,
    clearSaved,
  };
}

/**
 * Build a paste-ready CSS patch of the current draft, structured exactly
 * like tokens.css's value maps. This is the manual bridge until the
 * codegen "apply" pipeline exists.
 */
export function draftToCssPatch(draft: DraftState): string {
  const block = (selector: string, map: Record<string, string>) => {
    const entries = Object.entries(map);
    if (entries.length === 0) return '';
    return `${selector} {\n${entries.map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n`;
  };
  const light = { ...draft.global, ...draft.light };
  const parts = [
    '/* DS Controller draft — merge into src/shared/ds/tokens.css value maps',
    '   (light + global → :root and the [data-theme="light"] island;',
    "   dark → the `.dark, [data-theme='dark']` block), then mirror any",
    '   changed values in tokens.ts. */',
    '',
    block(':root', light),
    block(".dark, [data-theme='dark']", draft.dark),
  ].filter(Boolean);
  return parts.join('\n');
}
