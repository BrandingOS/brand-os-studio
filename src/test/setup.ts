import '@testing-library/jest-dom';
import { afterEach } from 'vitest';

/**
 * Nothing a test scheduled may outlive it.
 *
 * The failure this prevents: sonner keeps a `setTimeout` per visible toast, and
 * its removal timer calls `setState` on a React tree ~200ms later. A toast
 * raised near the end of a test outlives the test file — the timer fires after
 * the jsdom environment is gone, React reaches for `window`, and it surfaces as
 *
 *   ReferenceError: window is not defined
 *     at getCurrentEventPriority (react-dom)
 *     at removeToast (sonner)
 *     at Timeout._onTimeout (sonner)
 *
 * Vitest reports that as an unhandled error attributed to whichever file
 * happened to be running, so it fails the run intermittently, from an unrelated
 * place. `toast.dismiss()` does not help — dismissing is what SCHEDULES the
 * removal timer.
 *
 * So the rule is enforced generically rather than per-library: remember every
 * timer a test schedules, and clear whatever is still pending when it ends.
 * This is cleanup, not suppression — it runs after the test body and its
 * assertions have already completed, and a test that needs a timer to fire
 * still awaits it itself.
 */
const realSetTimeout = globalThis.setTimeout;
const realSetInterval = globalThis.setInterval;
// Node and DOM disagree on the handle type (`Timeout` vs `number`), and this
// file is compiled against both. The handle is only ever passed straight back
// to clear*, so it is opaque here.
type TimerHandle = unknown;
const pending = new Set<TimerHandle>();

globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
  const id = realSetTimeout(
    ((...a: unknown[]) => {
      pending.delete(id);
      return (handler as (...p: unknown[]) => void)(...a);
    }) as TimerHandler,
    timeout,
    ...args,
  );
  pending.add(id);
  return id;
}) as typeof globalThis.setTimeout;

globalThis.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
  const id = realSetInterval(handler, timeout, ...args);
  pending.add(id);
  return id;
}) as typeof globalThis.setInterval;

afterEach(() => {
  for (const id of pending) {
    clearTimeout(id as Parameters<typeof clearTimeout>[0]);
    clearInterval(id as Parameters<typeof clearInterval>[0]);
  }
  pending.clear();
});

/**
 * Web Storage for the test environment.
 *
 * Node 26 defines its own `globalThis.localStorage`, undefined unless the
 * process was started with `--localstorage-file`, and it is installed
 * BEFORE jsdom — so the global one wins and jsdom's never appears on the
 * window either. Every `localStorage.…` in a jsdom test then throws
 * "Cannot read properties of undefined".
 *
 * The window's storage is used when there is one; otherwise this is a
 * faithful in-memory Storage, which is what these tests have always been
 * asserting against anyway.
 */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  key(index: number) {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
  [name: string]: unknown;
}

for (const key of ['localStorage', 'sessionStorage'] as const) {
  const win = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;
  const existing = win?.[key] as Storage | undefined;
  const storage = existing ?? new MemoryStorage();
  for (const target of [globalThis, win].filter(Boolean) as object[]) {
    if ((target as Record<string, unknown>)[key] === storage) continue;
    Object.defineProperty(target, key, { configurable: true, get: () => storage });
  }
}
