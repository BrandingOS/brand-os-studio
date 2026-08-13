import OnboardingFlow from '@/features/onboarding/OnboardingFlow';

/**
 * `/onboard-brand` — the one entry point for creating a brand (spec 002).
 *
 * Also serves `/onboard-brand/:slug`, where the slug identifies a brand that is
 * mid-onboarding. The flow reads its step off that brand, which is what makes
 * resume work from a bookmark or another device.
 */
export default function OnboardBrandPage() {
  return <OnboardingFlow />;
}
