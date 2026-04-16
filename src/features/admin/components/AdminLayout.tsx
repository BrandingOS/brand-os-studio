import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserMenu } from '@/features/auth/components/UserMenu';
import {
  LayoutDashboard,
  Users,
  Palette,
  Building2,
  CreditCard,
  Activity,
  Shield,
  ArrowLeft,
  UserPlus,
  Settings,
  BarChart3,
  Megaphone,
  ToggleLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import type { PlatformRole } from '@/shared/types/user';
import { isPlatformRoleAtLeast, platformRoleLabel, platformRoleBadgeVariant } from '@/shared/types/user';

interface NavItem {
  to: string;
  icon: any;
  label: string;
  end?: boolean;
  minRole: PlatformRole;
  separator?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true, minRole: 'moderator' },
  { to: '/admin/early-access', icon: UserPlus, label: 'Early Access', minRole: 'moderator' },
  { to: '/admin/users', icon: Users, label: 'Users', minRole: 'moderator' },
  { to: '/admin/brands', icon: Palette, label: 'Brands', minRole: 'moderator' },
  { to: '/admin/workspaces', icon: Building2, label: 'Workspaces', minRole: 'moderator' },
  { to: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions', minRole: 'admin' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports', minRole: 'admin' },
  { to: '/admin/announcements', icon: Megaphone, label: 'Announcements', minRole: 'admin' },
  { to: '/admin/activity', icon: Activity, label: 'Activity', minRole: 'moderator' },
  { to: '/admin/feature-flags', icon: ToggleLeft, label: 'Feature Flags', minRole: 'super_admin', separator: true },
  { to: '/admin/settings', icon: Settings, label: 'Settings', minRole: 'super_admin' },
];

export function AdminLayout() {
  const { isModerator, isAuthenticated, isLoading, platformRole, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isModerator)) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, isAuthenticated, isModerator, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isModerator) return null;

  const visibleItems = NAV_ITEMS.filter(item =>
    isPlatformRoleAtLeast(platformRole, item.minRole)
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-muted/30 flex flex-col">
        {/* Logo & Role */}
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 text-white">
              <Shield className="h-4 w-4" />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold">BrandOS</span>
                <Badge variant={platformRoleBadgeVariant(platformRole) as any} className="text-[10px] px-1.5 py-0">
                  {platformRoleLabel(platformRole)}
                </Badge>
              </div>
              {user?.email && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                  {user.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item, i) => (
            <div key={item.to}>
              {item.separator && (
                <div className="my-3 border-t border-border" />
              )}
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-border space-y-2">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </NavLink>
          <div className="px-3 py-1">
            <UserMenu />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
