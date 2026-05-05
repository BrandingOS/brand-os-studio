// Phase A — superseded onboarding entry. The canonical onboarding flow
// lives at /onboard-brand (Cosmos). Old bookmarks redirect there.
import { Navigate } from 'react-router-dom';

export default function OnboardingPage() {
  return <Navigate to="/onboard-brand" replace />;
}
