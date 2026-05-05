// Phase B port — Share page mounted at /b/:slug/share (Studio).
//
// Reuses SharePage (Guidelines/Showcase/Exports tabs) wrapped in
// WorkspaceShell. Legacy /a/:slug/share untouched.
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import SharePage from '@/pages/dashboard/brand/[slug]/share';

export default function StudioSharePage() {
  return (
    <WorkspaceShell>
      <SharePage />
    </WorkspaceShell>
  );
}
