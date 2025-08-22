import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { DashboardMain } from '@/features/dashboard/components/DashboardMain';

export default function DashboardRoute() {
  return (
    <DashboardLayout>
      <DashboardMain />
    </DashboardLayout>
  );
}