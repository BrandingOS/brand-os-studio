import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminAnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            System-wide analytics and usage statistics.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Analytics</CardTitle>
            <CardDescription>
              This page will show comprehensive analytics for administrators.
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