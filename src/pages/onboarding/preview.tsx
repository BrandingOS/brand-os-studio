// Phase A — superseded onboarding preview. Redirects to the canonical
// /onboard-brand entry; the preview page is no longer separate.
import { Navigate } from 'react-router-dom';

export default function BrandPreviewPage() {
  return <Navigate to="/onboard-brand" replace />;
}
