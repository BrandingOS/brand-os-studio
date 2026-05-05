// Phase A — superseded /onboarding-v4/create. Redirects to /onboard-brand/create.
import { Navigate, useLocation } from 'react-router-dom';

export default function OnboardingV4CreatePage() {
  const { search } = useLocation();
  return <Navigate to={`/onboard-brand/create${search}`} replace />;
}
