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
import { CORE_PLACEHOLDERS, startedState, type OnboardingBranch } from '@/shared/onboarding/onboardingState';

export interface CreateOnboardingBrandInput {
  name: string;
  branch?: OnboardingBranch;
  /** Only supplied when the user actually typed one. */
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
    onboarding: startedState(input.branch ?? 'existing', placeholders),
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
