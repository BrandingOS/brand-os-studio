import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { adminService, type AdminStats } from '../services/adminService';
import { Users, Palette, Building2, CreditCard, TrendingUp, Loader2 } from 'lucide-react';

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { label: 'Total Brands', value: stats.totalBrands, icon: Palette, color: 'text-purple-500' },
    { label: 'Workspaces', value: stats.totalWorkspaces, icon: Building2, color: 'text-green-500' },
    { label: 'New This Week', value: stats.recentSignups, icon: TrendingUp, color: 'text-orange-500' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
              </div>
              <card.icon className={`h-8 w-8 ${card.color} opacity-80`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Subscription breakdown */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5" />
          Subscription Breakdown
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(stats.totalSubscriptions).map(([plan, count]) => (
            <div key={plan} className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm text-muted-foreground capitalize">{plan}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
