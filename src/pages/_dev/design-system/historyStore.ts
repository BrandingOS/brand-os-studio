/**
 * Automatic apply history — the Controller's safety net.
 *
 * Every successful Apply pushes a snapshot of the COMPLETE token state as
 * it was BEFORE the change, plus a concise diff of what changed. Lives in
 * localStorage (developer-local; doesn't pollute Git with experiments)
 * and is bounded to the latest MAX_ENTRIES applies.
 *
 * Reverting is not destructive history editing: the revert flow snapshots
 * the current state first (as its own history entry), then restores the
 * selected snapshot through the SAME /__ds-tokens/apply pipeline.
 */

export interface TokenStateSnapshot {
  light: Record<string, string>;
  dark: Record<string, string>;
  global: Record<string, string>;
}

export interface HistoryChange {
  cssVar: string;
  label: string;
  scope: 'light' | 'dark' | 'global';
  from: string;
  to: string;
}

export interface HistoryEntry {
  id: string;
  ts: number;
  /** What kind of apply produced this entry. */
  kind: 'apply' | 'revert' | 'restore-version';
  /** Complete token state BEFORE this apply. */
  before: TokenStateSnapshot;
  changes: HistoryChange[];
}

const KEY = 'brandos:ds-controller:history';
const VERSION = 1;
const MAX_ENTRIES = 40;

export function loadHistory(storage: Pick<Storage, 'getItem'> = localStorage): HistoryEntry[] {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed?.v !== VERSION || !Array.isArray(parsed.entries)) return [];
    return parsed.entries;
  } catch {
    return [];
  }
}

export function pushHistory(
  entry: Omit<HistoryEntry, 'id'>,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): HistoryEntry[] {
  const entries = loadHistory(storage);
  const withId: HistoryEntry = { ...entry, id: `h-${entry.ts}-${entries.length}` };
  const next = [withId, ...entries].slice(0, MAX_ENTRIES);
  try {
    storage.setItem(KEY, JSON.stringify({ v: VERSION, entries: next }));
  } catch {
    /* storage full — history just stops growing */
  }
  return next;
}

export function clearHistory(storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(KEY, JSON.stringify({ v: VERSION, entries: [] }));
  } catch {
    /* ignore */
  }
}

/** Scopes touched by an entry, for the "Light / Dark / Global" chips. */
export function entryScopes(entry: HistoryEntry): Array<'light' | 'dark' | 'global'> {
  const set = new Set(entry.changes.map((c) => c.scope));
  return (['light', 'dark', 'global'] as const).filter((s) => set.has(s));
}

/** Diff two full snapshots into HistoryChange rows (label filled by caller). */
export function diffSnapshots(
  from: TokenStateSnapshot,
  to: TokenStateSnapshot,
  labelOf: (cssVar: string) => string,
): HistoryChange[] {
  const out: HistoryChange[] = [];
  for (const scope of ['light', 'dark', 'global'] as const) {
    const keys = new Set([...Object.keys(from[scope] ?? {}), ...Object.keys(to[scope] ?? {})]);
    for (const k of keys) {
      const a = from[scope]?.[k] ?? '';
      const b = to[scope]?.[k] ?? '';
      if (a.trim() !== b.trim()) out.push({ cssVar: k, label: labelOf(k), scope, from: a, to: b });
    }
  }
  return out;
}
