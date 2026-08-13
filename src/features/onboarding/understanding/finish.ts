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
import type { BusinessInfo } from '@/domain/brand/identity';

export interface FinishInput {
  brand: Brand;
  /** Business facts gathered during the flow, or nothing. */
  businessInfo?: BusinessInfo;
  updateBrand(id: string, patch: Partial<Brand>): Promise<void>;
  /** Optional — Context is additive and never blocks finishing. */
  context?: IBrandContextService;
  /** Paths the user rejected, remembered so later suggestions lean away. */
  rejectedPaths?: string[];
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
  const { brand, businessInfo, updateBrand, context, rejectedPaths = [] } = input;
  const notSaved: string[] = [];

  // Business facts first — if the marker write fails the user can resume and
  // try again, but a lost fact would need re-typing.
  if (businessInfo && Object.keys(businessInfo).length > 0) {
    try {
      await updateBrand(brand.id, { businessInfo });
    } catch {
      notSaved.push('your business details');
    }
  }

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

  const current = readOnboardingState(brand);
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
