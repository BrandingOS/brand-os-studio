/**
 * The finish contract.
 *
 * Almost nothing happens here, and that is the point. Material went to the
 * Library as it arrived and Core values were written as they were understood,
 * so finishing is not a commit pass — it marks the brand done and hands off.
 *
 * A failure here therefore costs the marker, not the work.
 */
import type { Brand } from '@/shared/types/brand';
import type { IBrandContextService } from '@/core/services/IBrandContextService';
import { completedState, readOnboardingState } from '@/shared/onboarding/onboardingState';

export interface FinishInput {
  brand: Brand;
  updateBrand(id: string, patch: Partial<Brand>): Promise<void>;
  /** Optional — Context is additive and never blocks finishing. */
  context?: IBrandContextService;
  /** Paths the user rejected, remembered so later suggestions lean away. */
  rejectedPaths?: string[];
  /**
   * Reads the brand as it is RIGHT NOW.
   *
   * Supplied by callers that hold a render-time snapshot, which is all of them:
   * the marker is written by several steps and completing from a stale copy
   * resurrects state a previous write cleared.
   */
  live?(id: string): Brand | undefined;
}

export interface FinishReport {
  /** Slices that did not save, named for the user (FR-031). */
  notSaved: string[];
}

/**
 * Marks onboarding complete.
 *
 * Idempotent: calling twice is safe. `completedAt` is written once and the
 * second call reads the brand as already finished and does nothing.
 */
export async function finishOnboarding(input: FinishInput): Promise<FinishReport> {
  const { brand, updateBrand, context, rejectedPaths = [], live } = input;
  const notSaved: string[] = [];

  /*
   * NOTHING about the brand's content is written here, and that is now a rule
   * rather than an observation.
   *
   * This used to take a `businessInfo` and patch it in — the website, in
   * practice. `businessInfo` is a single stored value, so a patch REPLACES it:
   * the last act of onboarding deleted the industry, the slogan, the products
   * and the audience summary that the understanding pass had already saved, and
   * the user opened a brand that had lost most of what they told it. The website
   * was never missing — `applyBusinessFacts` merges it in at the moment it is
   * supplied, which is where every other fact is written too.
   *
   * Finishing marks the brand done. If it needs to save a value, that value was
   * saved in the wrong place.
   */

  // Context is fire-and-forget by contract. A failure is swallowed: a dropped
  // signal is acceptable, a dialog about one is not.
  if (context && rejectedPaths.length) {
    for (const path of rejectedPaths) {
      try {
        await context.record({
          brandId: brand.id,
          kind: 'preference',
          targetKind: 'core_value',
          targetRef: path,
          value: { accepted: false },
          source: 'user-action',
        });
      } catch {
        /* silent by design */
      }
    }
  }

  // Read the marker LIVE rather than from the `brand` passed in.
  //
  // Marker writes are read-modify-write, and by the time finish runs the
  // understanding pass has already cleared the sentinels through a different
  // write. Completing from a caller's render-time snapshot wrote them straight
  // back, and the finished brand then claimed its real colour and typeface were
  // stand-ins — so Setup rendered them as undecided.
  const current = readOnboardingState(live?.(brand.id) ?? brand);
  // Already finished — nothing to do. This is what makes a double submit safe.
  if (current === null && brand.onboarding) return { notSaved };

  try {
    await updateBrand(brand.id, { onboarding: completedState(current) });
  } catch {
    // The brand and everything in it are already durable; only the marker
    // failed, so the user simply stays resumable.
    notSaved.push('your progress marker');
  }

  return { notSaved };
}

/**
 * Where to go when the flow ends.
 *
 * A supplied return destination wins — someone who arrived from a surface that
 * needed a brand goes back to it. An unusable one falls back to the brand
 * rather than failing.
 */
export function destinationAfterFinish(slug: string, then: string | null): string {
  if (then && then.startsWith('/') && !then.startsWith('//')) return then;
  return `/b/${slug}/setup`;
}
