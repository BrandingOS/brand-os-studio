import { SetUpScreen } from '@/features/onboarding-v4/screens/SetUpScreen';

/**
 * /onboard-brand — the entry point of the new onboarding flow.
 *
 * Mirrors `new-version/brandos/index.html`: single-column, "Set up your
 * Brand" upload path. Users can swap to the 2-step "Create from scratch"
 * path via the `.flow-switch` link (which routes to /onboard-brand/create).
 *
 * The screen implementation lives in `@/features/onboarding-v4` — it was
 * already a faithful port of the Cosmos design system. Exposing it at
 * `/onboard-brand` is the canonical entry going forward; the legacy
 * `/onboarding-v4` route keeps working for anyone deep-linking to it.
 */
export default function OnboardBrandPage() {
  return <SetUpScreen />;
}
