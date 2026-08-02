/**
 * localStorage housekeeping.
 *
 * The local-first fallback keeps whole brands — logo data URLs included — in
 * localStorage, which tops out around 5 MB. A handful of brands with several
 * logo slots each is enough to fill it, and once full every subsequent write
 * fails: the user can't create a brand at all. These helpers let the app free
 * the disposable half of that space and explain what is holding the rest.
 */

/** Keys that only ever hold caches, drafts or UI state — safe to drop. */
const DISPOSABLE_EXACT = [
  'template-builder-draft',
  'cmdk:recent',
  'brandos:features-seen',
  'brandos-activity-log',
  'brandos-notifications',
  'brandos-saved-templates',
  // Undo/redo snapshots. Re-created on the next edit; in practice the single
  // biggest consumer (megabytes of raw HTML) and the reason saving a brand
  // could fail outright.
  'editor-history',
  // Orphaned draft blob from an earlier build — nothing reads or writes it
  // anymore, but it can still be sitting there holding megabytes.
  'brandos:draft',
];

const DISPOSABLE_PREFIX = [
  'editor-tutorial-',
  'logo-maker-flow-editor:',
];

function byteLength(value: string | null): number {
  return value ? value.length : 0;
}

export interface StorageUsage {
  totalKB: number;
  /** Biggest keys first — what to tell the user is filling their storage. */
  top: Array<{ key: string; kb: number }>;
}

export function measureLocalStorage(): StorageUsage {
  const entries: Array<{ key: string; kb: number }> = [];
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const size = byteLength(localStorage.getItem(key));
      total += size;
      entries.push({ key, kb: Math.round(size / 1024) });
    }
  } catch {
    /* storage unavailable — report nothing rather than crash */
  }
  entries.sort((a, b) => b.kb - a.kb);
  return { totalKB: Math.round(total / 1024), top: entries.slice(0, 5) };
}

/** Drop caches/drafts. Never touches brands, designs or user content. */
export function freeDisposableStorage(): number {
  let freed = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const disposable =
        DISPOSABLE_EXACT.includes(key) || DISPOSABLE_PREFIX.some((p) => key.startsWith(p));
      if (disposable) keys.push(key);
    }
    for (const key of keys) {
      freed += byteLength(localStorage.getItem(key));
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore — best effort */
  }
  return Math.round(freed / 1024);
}

/** True when an error came from a full localStorage. */
export function isStorageFullError(err: unknown): boolean {
  if (err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22)) {
    return true;
  }
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /storage full|quota/i.test(message);
}

function labelFor(key: string): string {
  if (key === 'brandos:brands') return 'saved brands';
  if (key.startsWith('design_')) return 'saved designs';
  if (key === 'brandos:seed-brand-overrides') return 'brand edits';
  if (key === 'editor-history') return 'editor undo history';
  if (key === 'brandos:draft') return 'an old editor draft';
  return key;
}

/** Human-readable "what's using your space", for the storage-full message. */
export function describeStorageUsage(): string {
  const { totalKB, top } = measureLocalStorage();
  const parts = top.filter((t) => t.kb > 50).map((t) => `${labelFor(t.key)} ${t.kb} KB`);
  return `${totalKB} KB used${parts.length ? ` — mostly ${parts.join(', ')}` : ''}`;
}

/** Advice that matches what is ACTUALLY filling storage, so we don't tell a
 *  user to delete brands when their brands are 77 KB of a 5 MB problem. */
export function storageAdvice(): { text: string; brandsAreTheProblem: boolean } {
  const { top } = measureLocalStorage();
  const biggest = top[0];
  if (!biggest) return { text: 'Try reloading the page.', brandsAreTheProblem: false };
  const isBrands = biggest.key === 'brandos:brands' || biggest.key.startsWith('design_');
  if (isBrands) {
    return {
      text: 'Delete a few brands you no longer need from Dashboard → Brands, then try again.',
      brandsAreTheProblem: true,
    };
  }
  return {
    text: `Most of it is ${labelFor(biggest.key)} (${biggest.kb} KB), which is safe to clear — press "Free up space".`,
    brandsAreTheProblem: false,
  };
}
