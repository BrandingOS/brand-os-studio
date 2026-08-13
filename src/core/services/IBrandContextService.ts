/**
 * Brand Context v1 — what the system has quietly learned about a brand.
 *
 * Deliberately small: plain recorded signals (favourites, dislikes, references,
 * approvals, repeated usage) that inform suggestions and AI creation. There is
 * no embedding model, no semantic retrieval, no cross-brand learning, and no
 * scheduled recomputation — those are explicit non-goals, not omissions.
 *
 * Three properties are load-bearing:
 *
 *  1. **Silent.** Capture never interrupts. `record()` is fire-and-forget and
 *     never surfaces an error to the user; a dropped signal is acceptable, a
 *     dialog is not.
 *
 *  2. **Never authoritative.** Context can never modify Brand Core content or
 *     status. This module has NO import path to the brand repository or the
 *     application-layer write ops, and a test enforces that.
 *
 *  3. **Inspectable and correctable.** A user can see what the brand has learned
 *     (`list`) and remove any of it (`remove`).
 *
 * See specs/001-brand-system-foundation/contracts/services.md §4.
 */

export type ContextSignalKind =
  | 'favorite'
  | 'dislike'
  | 'reference'
  | 'approval'
  | 'preference'
  | 'usage';

export type ContextTargetKind = 'library_item' | 'core_value' | 'design';

export type ContextSource = 'user-action' | 'derived';

export interface ContextSignal {
  id: string;
  brandId: string;
  kind: ContextSignalKind;
  targetKind?: ContextTargetKind;
  targetRef?: string;
  /** Small payload only (e.g. `{ hex: '#123456' }`). Never a document. */
  value?: Record<string, unknown>;
  source: ContextSource;
  /** ISO timestamp. */
  createdAt: string;
}

export type NewContextSignal = Omit<ContextSignal, 'id' | 'createdAt'>;

export interface ContextQuery {
  kind?: ContextSignalKind[];
  targetKind?: ContextTargetKind;
  limit?: number;
}

/** Computed per call — there is no stored summary and no scheduler. */
export interface ContextSummary {
  /** Library item ids flagged `use_as_reference`. */
  referenceIds: string[];
  likedRefs: string[];
  dislikedRefs: string[];
  preferences: Record<string, unknown>;
  signalCount: number;
}

export interface IBrandContextService {
  /** Silent and non-blocking: implementations swallow and log failures. */
  record(signal: NewContextSignal): Promise<void>;
  list(brandId: string, q?: ContextQuery): Promise<ContextSignal[]>;
  remove(id: string): Promise<void>;
  summarize(brandId: string): Promise<ContextSummary>;
}
