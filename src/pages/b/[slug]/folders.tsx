// Phase B port — Folders / DAM mounted at /b/:slug/folders (Studio).
//
// Reuses DamPage (Assets + Designs tabs) wrapped in WorkspaceShell.
// Legacy /a/:slug/folders untouched.
import { StudioBrandShell } from './_studioBrandShell';
import DamPage from '@/features/dam/DamPage';

export default function StudioFoldersPage() {
  return (
    <StudioBrandShell>
      <DamPage />
    </StudioBrandShell>
  );
}
