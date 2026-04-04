import { DashboardShell } from '@/shared/layouts/DashboardShell';
import { LogoMaker } from '@/features/logo-maker';

export default function LogoMakerPage() {
  return (
    <DashboardShell maxWidth="full" noPadding>
      <LogoMaker />
    </DashboardShell>
  );
}
