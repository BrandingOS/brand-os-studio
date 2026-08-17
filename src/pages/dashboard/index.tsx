import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { DashboardMain } from '@/features/dashboard/components/DashboardMain';

/** Auth is enforced by the <ProtectedRoute> wrapper in App.tsx — no second guard here. */
export default function DashboardRoute() {
  return (
    <DashboardLayout>
      <DashboardMain />
    </DashboardLayout>
  );
}
