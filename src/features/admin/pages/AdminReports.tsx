import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminService, type AdminUser } from '../services/adminService';
import type { PlatformMetrics, GrowthDataPoint } from '@/features/admin/types';
import { planLabel, planBadgeVariant } from '@/shared/utils/plan-gates';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  Palette,
  Briefcase,
  DollarSign,
  TrendingUp,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const CHART_COLORS = [
  'hsl(var(--primary))',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

const TOOLTIP_STYLE = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
};

export default function AdminReports() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [growth, setGrowth] = useState<GrowthDataPoint[]>([]);
  const [topUsers, setTopUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [m, g, t] = await Promise.all([
        adminService.getPlatformMetrics(),
        adminService.getGrowthData(30),
        adminService.getTopUsers(10),
      ]);
      setMetrics(m);
      setGrowth(g);
      setTopUsers(t);
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">Failed to load metrics.</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: metrics.totalUsers, icon: Users, color: 'text-primary' },
    { label: 'Total Brands', value: metrics.totalBrands, icon: Palette, color: 'text-cyan-500' },
    {
      label: 'Total Workspaces',
      value: metrics.totalWorkspaces,
      icon: Briefcase,
      color: 'text-emerald-500',
    },
    {
      label: 'MRR',
      value: `$${metrics.mrr.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-amber-500',
    },
    {
      label: 'Conversion Rate',
      value: `${metrics.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-red-500',
    },
    {
      label: 'Avg Brands/User',
      value: metrics.avgBrandsPerUser,
      icon: BarChart3,
      color: 'text-violet-500',
    },
  ];

  const pieData = metrics.planDistribution.filter((d) => d.count > 0);
  const PIE_COLORS: Record<string, string> = {
    free: '#94a3b8',
    pro: 'hsl(var(--primary))',
    agency: '#ef4444',
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Reports</h1>
        <p className="text-muted-foreground">Platform metrics and growth analytics</p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Growth (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth}>
                <defs>
                  <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradBrands" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradWorkspaces" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="hsl(var(--primary))"
                  fill="url(#gradUsers)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="brands"
                  stroke="#06b6d4"
                  fill="url(#gradBrands)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="workspaces"
                  stroke="#10b981"
                  fill="url(#gradWorkspaces)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))' }} />
              Users
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
              Brands
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Workspaces
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column: Pie + Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No subscription data</p>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="plan"
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.plan}
                          fill={PIE_COLORS[entry.plan] || CHART_COLORS[0]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              {pieData.map((d) => (
                <div key={d.plan} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[d.plan] || CHART_COLORS[0] }}
                  />
                  {planLabel(d.plan)} ({d.count})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Users by Brands</CardTitle>
          </CardHeader>
          <CardContent>
            {topUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No users yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Email</th>
                      <th className="text-right py-2 font-medium">Brands</th>
                      <th className="text-right py-2 font-medium">Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((user) => (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="py-2 truncate max-w-[200px]">{user.email}</td>
                        <td className="py-2 text-right font-medium">{user.brandCount || 0}</td>
                        <td className="py-2 text-right">
                          <Badge variant={planBadgeVariant(user.plan || 'free') as any}>
                            {planLabel(user.plan || 'free')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
