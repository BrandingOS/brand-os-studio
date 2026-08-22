/**
 * Keeping the page alive while an export runs.
 *
 * A kit export is a long sequence of synchronous-ish units — rasterize a
 * template, decode a font, zip a folder. Run back to back they hold the
 * main thread for seconds and the tab stops responding to clicks, hover
 * and scroll; the user reads that as a freeze, not as work.
 *
 * The fix is not a worker. html2canvas needs the DOM, so the expensive
 * half cannot move off the main thread at all. What it needs is a yield
 * between units so the browser can paint and handle input, which is what
 * this module is.
 */

/** Abort support that works whether or not the caller passed a signal. */
export class ExportCancelled extends Error {
  constructor() {
    super('Export cancelled');
    this.name = 'ExportCancelled';
  }
}

export function isCancelled(err: unknown): boolean {
  return err instanceof ExportCancelled || (err as { name?: string })?.name === 'ExportCancelled';
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ExportCancelled();
}

/**
 * Hand the main thread back for one turn.
 *
 * `scheduler.yield()` is the real answer where it exists (Chrome 129+):
 * it resumes at the FRONT of the task queue, so yielding stays cheap
 * however busy the page is. Everywhere else, one animation frame plus a
 * macrotask gives the browser a paint and an input-handling turn — the
 * two things a frozen tab is missing.
 */
export async function yieldToBrowser(signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (typeof scheduler?.yield === 'function') {
    try {
      await scheduler.yield();
      throwIfAborted(signal);
      return;
    } catch (err) {
      if (isCancelled(err)) throw err;
      // Fall through — an engine that advertises the API but rejects.
    }
  }
  await new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });
  throwIfAborted(signal);
}
