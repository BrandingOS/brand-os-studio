// Phase A — superseded /onboarding-v3/create. Canonical creation flow
// lives at /onboard-brand/create.
import { Navigate, useLocation } from 'react-router-dom';

export default function OnboardingV3CreatePage() {
  const { search } = useLocation();
  return <Navigate to={`/onboard-brand/create${search}`} replace />;
}
