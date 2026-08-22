// Which brands have been told "not now".
//
// Per brand ID rather than one global flag: dismissing the nudge on a brand
// you are not filling in says nothing about the next brand you create.
// Reads are synchronous because the component decides whether to render at
// all on its first paint, and a nudge that appears and then vanishes is
// worse than one that never appeared.

const KEY = 'brandos:setup-nudge-dismissed';

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    // Private mode, a quota error, or something else's value under our key.
    // A nudge is not worth a crash.
    return [];
  }
}

export function isNudgeDismissed(brandId: string): boolean {
  return read().includes(brandId);
}

export function dismissNudge(brandId: string): void {
  if (isNudgeDismissed(brandId)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...read(), brandId]));
  } catch {
    /* Dismissal degrades to this session only. */
  }
}

/** Test seam, and the honest way back for a brand that was dismissed. */
export function undismissNudge(brandId: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(read().filter((id) => id !== brandId)));
  } catch {
    /* no-op */
  }
}
