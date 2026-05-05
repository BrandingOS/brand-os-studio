// Phase A — superseded /onboarding-v4. The canonical Cosmos onboarding
// is /onboard-brand (which uses the SAME features/onboarding-v4 screens
// internally — only the URL changes). Redirect old bookmarks.
import { Navigate } from 'react-router-dom';

export default function OnboardingV4Page() {
  return <Navigate to="/onboard-brand" replace />;
}
