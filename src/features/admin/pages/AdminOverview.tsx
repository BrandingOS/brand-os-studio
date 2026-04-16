import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adminService, type AdminStats, type AdminUser, type EarlyAccessEntry } from '../services/adminService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PLAN_PRICING } from '@/shared/utils/plan-gates';
import { platformRoleLabel, platformRoleBadgeVariant } from '@/shared/types/user';
import type { PlatformRole } from '@/shared/types/user';
import {
  Users, Palette, Building2, CreditCard, TrendingUp, Loader2,
  UserPlus, Clock, CheckCircle2, ArrowRight, Mail, DollarSign, BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminOverview() {
  const { isSuperAdmin, platformRole } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [recentEarlyAccess, setRecentEarlyAccess] = useState<EarlyAccessEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminService.getStats(),
      adminService.getUsers(),
      adminService.getEarlyAccess({ status: 'pending' }),
    ])
      .then(([s, u, ea]) => {
        setStats(s);
        setRecentUsers(u.slice(0, 8));
        setRecentEarlyAccess(ea.slice(0, 8));
      })
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

  const mrr =
    (stats.totalSubscriptions.pro * PLAN_PRICING.pro) +
    (stats.totalSubscriptions.agency * PLAN_PRICING.agency);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { label: 'Total Brands', value: stats.totalBrands, icon: Palette, color: 'text-purple-500' },
    { label: 'Workspaces', value: stats.totalWorkspaces, icon: Building2, color: 'text-green-500' },
    { label: 'New This Week', value: stats.recentSignups, icon: TrendingUp, color: 'text-orange-500' },
    { label: 'Early Access', value: stats.earlyAccess.total, icon: UserPlus, color: 'text-cyan-500' },
    { label: 'Pending Review', value: stats.earlyAccess.pending, icon: Clock, color: 'text-yellow-500' },
  ];

  const greeting = isSuperAdmin ? 'Welcome back, Super Admin' : 'Welcome back, Admin';

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{greeting}</h1>
        <p className="text-muted-foreground mt-1">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold mt-0.5">{card.value}</p>
              </div>
              <card.icon className={`h-6 w-6 ${card.color} opacity-80`} />
            </div>
          </Card>
        ))}
      </div>

      {/* MRR + Subscriptions + Quick Actions row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Card */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-green-500" /> Monthly Recurring Revenue
          </h2>
          <p className="text-4xl font-bold text-green-600">${mrr.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.totalSubscriptions.pro} Pro x ${PLAN_PRICING.pro} + {stats.totalSubscriptions.agency} Agency x ${PLAN_PRICING.agency}
          </p>
        </Card>

        {/* Subscription Breakdown */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-indigo-500" /> Subscription Breakdown
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats.totalSubscriptions.free}</p>
              <p className="text-xs text-muted-foreground">Free</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <p className="text-2xl font-bold text-blue-600">{stats.totalSubscriptions.pro}</p>
              <p className="text-xs text-muted-foreground">Pro</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
              <p className="text-2xl font-bold text-purple-600">{stats.totalSubscriptions.agency}</p>
              <p className="text-xs text-muted-foreground">Agency</p>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
              <Link to="/admin/early-access">
                <UserPlus className="h-4 w-4 text-cyan-500" />
                <div className="text-left">
                  <p className="text-sm font-medium">Early Access</p>
                  <p className="text-xs text-muted-foreground">{stats.earlyAccess.pending} pending</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
              <Link to="/admin/users">
                <Users className="h-4 w-4 text-blue-500" />
                <div className="text-left">
                  <p className="text-sm font-medium">Manage Users</p>
                  <p className="text-xs text-muted-foreground">{stats.totalUsers} users</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
              <Link to="/admin/brands">
                <Palette className="h-4 w-4 text-purple-500" />
                <div className="text-left">
                  <p className="text-sm font-medium">Manage Brands</p>
                  <p className="text-xs text-muted-foreground">{stats.totalBrands} brands</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
              <Link to="/admin/settings">
                <CreditCard className="h-4 w-4 text-green-500" />
                <div className="text-left">
                  <p className="text-sm font-medium">Settings</p>
                  <p className="text-xs text-muted-foreground">Platform config</p>
                </div>
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Users</h2>
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <Link to="/admin/users">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} className="h-8 w-8 rounded-full" alt="" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {(user.fullName || user.email)[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.fullName || user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant={platformRoleBadgeVariant((user.role || 'user') as PlatformRole) as any} className="text-xs">
                  {platformRoleLabel((user.role || 'user') as PlatformRole)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {recentUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>
            )}
          </div>
        </Card>

        {/* Pending Early Access */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Pending Early Access
              {stats.earlyAccess.pending > 0 && (
                <Badge variant="destructive" className="text-xs">{stats.earlyAccess.pending}</Badge>
              )}
            </h2>
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <Link to="/admin/early-access">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="space-y-3">
            {recentEarlyAccess.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-cyan-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.email}</p>
                  <p className="text-xs text-muted-foreground">{entry.role || 'No role'} · {entry.testerInterest === 'beta' ? 'Beta tester' : 'Notify'}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost" size="sm"
                    className="text-green-600 hover:text-green-700 h-7 w-7 p-0"
                    onClick={async () => {
                      await adminService.approveEarlyAccess(entry.id);
                      setRecentEarlyAccess((prev) => prev.filter((e) => e.id !== entry.id));
                      toast.success(`Approved ${entry.email}`);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {recentEarlyAccess.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No pending submissions</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
