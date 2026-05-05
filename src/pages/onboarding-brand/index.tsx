// Phase A — superseded /onboarding-brand (legacy v2 entry). The canonical
// onboarding lives at /onboard-brand (Cosmos). Redirect old bookmarks.
// `?then=...` is preserved so the post-onboarding redirect still works.
import { Navigate, useLocation } from 'react-router-dom';

export default function OnboardingBrandPage() {
  const { search } = useLocation();
  return <Navigate to={`/onboard-brand${search}`} replace />;
}
