/**
 * Observability for the transitional canonical-write fallback.
 *
 * When `brandStore.update` routes Core fields to a canonical op and that op
 * throws, production falls back to the legacy service path so the user's edit
 * still lands. That is the right call for the user — losing an edit is worse
 * than a delayed convergence — but it is dangerous to leave SILENT: a brand
 * that always fails validation would keep writing through the legacy path
 * forever, and nobody would know the convergence had stalled.
 *
 * So every fallback is recorded here. Deliberately in-memory and dependency-
 * free: this is a signal, not a telemetry system, and building one would be
 * exactly the speculative infrastructure the plan rules out.
 *
 * REMOVAL CRITERION (unchanged): the fallback in `brandStore.update` — and this
 * module with it — is deleted once no brand fails canonical validation. This
 * recorder is how that criterion becomes checkable rather than assumed: when
 * real usage reports zero fallbacks, the legacy write path has no remaining
 * job.
 */

export interface CoreWriteFallbackEvent {
  brandId: string;
  /** The Core fields that had to fall back. */
  keys: string[];
  message: string;
  at: string;
}

const MAX_RETAINED = 25;

let count = 0;
const recent: CoreWriteFallbackEvent[] = [];

/**
 * Records that a canonical write fell back to the legacy path, and says so out
 * loud. `console.warn` rather than `error`: the user's save SUCCEEDED, so this
 * is not a failure to act on right now — it is a convergence signal.
 */
export function recordCoreWriteFallback(
  brandId: string,
  keys: readonly string[],
  error: unknown,
): void {
  const event: CoreWriteFallbackEvent = {
    brandId,
    keys: [...keys],
    message: error instanceof Error ? error.message : String(error),
    at: new Date().toISOString(),
  };

  count += 1;
  recent.push(event);
  if (recent.length > MAX_RETAINED) recent.shift();

  console.warn(
    `[brandStore] Canonical write fell back to the legacy path for brand ${brandId} ` +
      `(fields: ${event.keys.join(', ') || 'none'}). The edit was saved, but Brand Core ` +
      `did not converge. Reason: ${event.message}`,
    { fallbackCount: count },
  );
}

/**
 * Current fallback state. Zero occurrences across real usage is the evidence
 * that satisfies the removal criterion above.
 */
export function getCoreWriteFallbackReport(): {
  count: number;
  recent: CoreWriteFallbackEvent[];
} {
  return { count, recent: [...recent] };
}

/** Test/debug only — deliberately off any consumer's path. */
export function resetCoreWriteFallbackReport(): void {
  count = 0;
  recent.length = 0;
}
