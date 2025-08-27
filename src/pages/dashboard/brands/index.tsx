import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BrandsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Brands</h1>
          <p className="text-muted-foreground">
            Manage and organize all your brands in one place.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Brands</CardTitle>
            <CardDescription>
              This page will show all your brands with filtering and search capabilities.
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