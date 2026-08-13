/**
 * Brand Context v1 — guest/dev implementation.
 *
 * Plain recorded signals. No embeddings, no retrieval, no scheduler — those are
 * explicit non-goals, not omissions.
 *
 * Two properties are load-bearing and shape this code:
 *
 *  1. **Capture is silent.** `record` never throws to its caller. A dropped
 *     signal is acceptable; an error toast because someone favourited an image
 *     is not.
 *  2. **It can never write Brand Core.** This module imports nothing from the
 *     brand repository or the application ops, and a dependency test enforces
 *     that.
 *
 * Storage: `brandos:brand-context:{brandId}`, capped as a ring buffer. The cap
 * is not a nicety — localStorage quota has already broken this product once
 * (font uploads), and context is the most disposable data in it.
 */
import type {
  ContextQuery,
  ContextSignal,
  ContextSummary,
  IBrandContextService,
  NewContextSignal,
} from '@/core/services/IBrandContextService';

const key = (brandId: string) => `brandos:brand-context:${brandId}`;
const PREFIX = 'brandos:brand-context:';

/** Newest N kept. Signals are aggregate evidence, so losing the tail is cheap. */
export const LOCAL_SIGNAL_CAP = 200;

export class LocalBrandContextService implements IBrandContextService {
  private read(brandId: string): ContextSignal[] {
    try {
      const raw = localStorage.getItem(key(brandId));
      return raw ? (JSON.parse(raw) as ContextSignal[]) : [];
    } catch {
      return [];
    }
  }

  private write(brandId: string, rows: ContextSignal[]): void {
    localStorage.setItem(key(brandId), JSON.stringify(rows));
  }

  async record(signal: NewContextSignal): Promise<void> {
    try {
      const rows = this.read(signal.brandId);
      rows.push({
        ...signal,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      });
      // Ring buffer: drop the oldest rather than growing without bound.
      this.write(signal.brandId, rows.slice(-LOCAL_SIGNAL_CAP));
    } catch {
      // Silent by contract. A failed signal must never surface to the user.
    }
  }

  async list(brandId: string, q: ContextQuery = {}): Promise<ContextSignal[]> {
    let rows = this.read(brandId);
    if (q.kind?.length) rows = rows.filter((r) => q.kind!.includes(r.kind));
    if (q.targetKind) rows = rows.filter((r) => r.targetKind === q.targetKind);
    // Newest-first, with INSERTION ORDER breaking ties. Two signals recorded in
    // the same millisecond are common (favourite then dislike on one item), and
    // without this the "latest opinion wins" rule in summarize() is undefined —
    // a stable sort would leave the older one looking newer.
    rows = rows
      .map((r, i) => ({ r, i }))
      .sort((a, b) => b.r.createdAt.localeCompare(a.r.createdAt) || b.i - a.i)
      .map((x) => x.r);
    return q.limit ? rows.slice(0, q.limit) : rows;
  }

  async remove(id: string): Promise<void> {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      const brandId = k.slice(PREFIX.length);
      const rows = this.read(brandId);
      const next = rows.filter((r) => r.id !== id);
      if (next.length !== rows.length) {
        this.write(brandId, next);
        return;
      }
    }
  }

  /** Computed per call — there is no stored summary and no scheduler. */
  async summarize(brandId: string): Promise<ContextSummary> {
    return summarizeSignals(await this.list(brandId));
  }
}

/**
 * Shared derivation so local and server agree on what a summary means.
 * Latest signal per target wins, so a dislike after a favourite is respected.
 */
export function summarizeSignals(signals: ContextSignal[]): ContextSummary {
  const latest = new Map<string, ContextSignal>();
  const preferences: Record<string, unknown> = {};

  // `list` returns newest-first; iterate oldest-first so later wins.
  for (const s of [...signals].reverse()) {
    if (s.kind === 'preference' && s.value) Object.assign(preferences, s.value);
    if (!s.targetRef) continue;
    if (s.kind === 'favorite' || s.kind === 'dislike' || s.kind === 'reference') {
      latest.set(`${s.kind === 'reference' ? 'ref' : 'opinion'}:${s.targetRef}`, s);
    }
  }

  const likedRefs: string[] = [];
  const dislikedRefs: string[] = [];
  const referenceIds: string[] = [];
  for (const s of latest.values()) {
    if (s.kind === 'favorite') likedRefs.push(s.targetRef!);
    else if (s.kind === 'dislike') dislikedRefs.push(s.targetRef!);
    else if (s.kind === 'reference') referenceIds.push(s.targetRef!);
  }

  return {
    referenceIds,
    likedRefs,
    dislikedRefs,
    preferences,
    signalCount: signals.length,
  };
}
