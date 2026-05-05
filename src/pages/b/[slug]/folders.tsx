// Phase B port — Folders / DAM mounted at /b/:slug/folders (Studio).
//
// Reuses DamPage (Assets + Designs tabs) wrapped in WorkspaceShell.
// Legacy /a/:slug/folders untouched.
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import DamPage from '@/features/dam/DamPage';

export default function StudioFoldersPage() {
  return (
    <WorkspaceShell>
      <DamPage />
    </WorkspaceShell>
  );
}
