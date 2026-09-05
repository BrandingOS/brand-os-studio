/**
 * Creating the brand at the naming step.
 *
 * The rule this file exists to hold: **nothing about the brand is fabricated.**
 * A user who has typed only a name gets a brand whose Core is genuinely
 * undecided — no invented colour, no invented typeface, no invented tone or
 * audience.
 *
 * Two of those cannot be persisted as absent:
 *
 *   - `brands.primary_color` is `text not null`.
 *   - The canonical schema requires `colors.primary.hex` to match a hex pattern
 *     and `typography.primary.family` to be non-empty, so an empty string makes
 *     `assertCanonicalBrand` reject the whole brand — which would break every
 *     later Core write, including writing a mission.
 *
 * So those two get a documented NEUTRAL placeholder, and the path is recorded
 * in the onboarding marker. That record sits below the canonical projection: it
 * is not Core, carries no authority, and no Core metadata is written for it, so
 * the value is never claimed as truth and is never proposed. It is dropped the
 * moment a real value is written.
 *
 * `tone` and `audience` are plain nullable text and simply stay empty — those
 * need no placeholder at all.
 */
import type { Brand, CreateBrandInput } from '@/shared/types/brand';
import { CORE_PLACEHOLDERS, startedState } from '@/shared/onboarding/onboardingState';
import { isUpgradeable, parseDenial, reasonMessage } from '@/shared/access';

export interface CreateOnboardingBrandInput {
  name: string;
  /** Only supplied when the user actually typed one, on the profile screen. */
  website?: string;
}

/**
 * Builds the create payload.
 *
 * Pure, so the "nothing is fabricated" claim is testable without a store.
 */
export function buildCreateInput(input: CreateOnboardingBrandInput): CreateBrandInput & {
  onboarding: ReturnType<typeof startedState>;
  publicUrl?: string;
} {
  const placeholders = ['colors.primary', 'typography.primary'];

  return {
    name: input.name,
    // Neutral stand-ins for the two fields persistence will not let us omit.
    primaryColor: CORE_PLACEHOLDERS['colors.primary'],
    fonts: { primary: CORE_PLACEHOLDERS['typography.primary'] },
    // Nullable text — no placeholder needed, so none is invented.
    tone: '',
    audience: '',
    ...(input.website ? { publicUrl: normalizeUrl(input.website) } : {}),
    onboarding: startedState(placeholders),
  };
}

/** Accepts what people actually type: "meridian.co", not "https://meridian.co". */
export function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/**
 * True when this brand still holds only placeholders — nothing about its look
 * has been decided. Used to keep the arrival screen honest (a name-only brand
 * shows its name, not three empty tiles).
 */
export function isUndecided(brand: Pick<Brand, 'onboarding'>): boolean {
  const raw = (brand.onboarding as { placeholders?: unknown } | undefined)?.placeholders;
  return Array.isArray(raw) && raw.length > 0;
}

/* ─── What to tell the user when creating a brand fails ─────────────────── */

const GENERIC_FAILURE = "Couldn't save that just now. Your details are still here — try again.";
const DUPLICATE_NAME =
  'You already have a brand with that name. Try another, or add a word to tell them apart.';

/** `RAISE EXCEPTION … USING DETAIL = '42 of 2 used on the free plan'` (migration 043). */
const LIMIT_DETAIL = /(\d+) of (\d+) used on the (\S+) plan/;

/**
 * The sentence for a failed brand creation.
 *
 * The database is precise about WHY it refused — `brands_limit_reached`, with
 * the numbers in DETAIL — and until 2026-09-05 both onboarding surfaces threw
 * that away for "Couldn't save that just now", so a plan limit read as an
 * outage. A reason the access layer knows is rendered with its own words; a
 * duplicate name keeps its sentence; anything else stays generic and carries
 * the raw message as the detail, so the cause is never lost twice.
 */
export function createFailureMessage(err: unknown): { title: string; description?: string } {
  const raw = err instanceof Error ? err.message : (err as { message?: unknown } | null)?.message;
  const message = typeof raw === 'string' ? raw : '';
  if (/duplicate|unique/i.test(message)) return { title: DUPLICATE_NAME };

  const denial = parseDenial(err);
  if (denial) {
    const details = (err as { details?: unknown } | null)?.details;
    const m = typeof details === 'string' ? details.match(LIMIT_DETAIL) : null;
    const title = m
      ? reasonMessage(denial.reason, { used: Number(m[1]), limit: Number(m[2]), plan: m[3] })
      : `You've reached the ${denial.reason.replace(/_limit_reached$/, '').replace(/_/g, ' ')} limit of your plan.`;
    return {
      title,
      description: isUpgradeable(denial.reason)
        ? 'Upgrade your plan to add another, or remove one you no longer need.'
        : undefined,
    };
  }

  return { title: GENERIC_FAILURE, description: message || undefined };
}
