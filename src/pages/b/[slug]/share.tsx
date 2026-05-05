// Phase B port — Share page mounted at /b/:slug/share (Studio).
//
// Reuses SharePage (Guidelines/Showcase/Exports tabs) wrapped in
// WorkspaceShell. Legacy /a/:slug/share untouched.
import { StudioBrandShell } from './_studioBrandShell';
import SharePage from '@/pages/dashboard/brand/[slug]/share';

export default function StudioSharePage() {
  return (
    <StudioBrandShell>
      <SharePage />
    </StudioBrandShell>
  );
}
