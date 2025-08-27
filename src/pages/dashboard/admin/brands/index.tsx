import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminBrandsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Brands</h1>
          <p className="text-muted-foreground">
            Manage all user brands across the system.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Brands</CardTitle>
            <CardDescription>
              This page will show all brands in the system with admin controls.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}