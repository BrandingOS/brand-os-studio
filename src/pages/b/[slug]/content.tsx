// Phase B port — Content hub mounted at /b/:slug/content (Studio).
//
// Reuses ContentHubPage (Calendar/Posts/Drafts tabs) wrapped in
// WorkspaceShell. Legacy /a/:slug/content untouched.
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import ContentHubPage from '@/pages/dashboard/brand/[slug]/content';

export default function StudioContentPage() {
  return (
    <WorkspaceShell>
      <ContentHubPage />
    </WorkspaceShell>
  );
}
