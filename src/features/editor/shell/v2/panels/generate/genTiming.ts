// genTiming — how long a generation actually takes, learned from this browser.
//
// Vendors report no progress. Everything an image generator could show for
// "how much longer" is therefore either honest arithmetic or a lie, and a
// progress bar that crawls to 90% and waits is the lie. What we CAN do is
// remember how long this model took the last few times and say so.
//
// Rules that make the number honest:
//   • an estimate is offered only once there are real samples for that model
//     (and only for the same batch size, because four images is not one)
//   • the MEDIAN, not the mean — one 90-second outlier must not move it
//   • it counts DOWN and stops at zero rather than going negative; past the
//     estimate the UI drops back to "taking longer than usual"
//   • samples are per model, capped, and thrown away with the tab if storage
//     is unavailable — this is a convenience, never a correctness dependency

const KEY = 'brandos:ai-image:timing';
const MAX_SAMPLES = 8;

type Store = Record<string, number[]>;

function bucket(model: string, count: number): string {
  return `${model || 'auto'}::${Math.max(1, Math.min(4, count))}`;
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed as Store : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* private mode */ }
}

/** Record one completed run. Failures and cancellations are NOT samples. */
export function recordDuration(model: string, count: number, ms: number): void {
  if (!Number.isFinite(ms) || ms <= 0 || ms > 10 * 60_000) return;
  const store = read();
  const k = bucket(model, count);
  store[k] = [...(store[k] ?? []), Math.round(ms)].slice(-MAX_SAMPLES);
  write(store);
}

/** Median observed duration in ms, or null when we have never seen this run. */
export function estimateDuration(model: string, count: number): number | null {
  const samples = read()[bucket(model, count)];
  if (!samples?.length) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Test seam — the samples are a cache, so clearing them is always safe. */
export function clearTimings(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
