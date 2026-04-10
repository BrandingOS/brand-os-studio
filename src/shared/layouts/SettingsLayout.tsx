import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { User, CreditCard, Building2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const SETTINGS_NAV = [
  { label: 'Account', href: '/settings/account', icon: User },
  { label: 'Workspace', href: '/settings/workspace', icon: Building2 },
  { label: 'Members', href: '/settings/members', icon: Users },
  { label: 'Plans & Billing', href: '/settings/plans', icon: CreditCard },
];

export function SettingsLayout() {
  const location = useLocation();

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="w-48 shrink-0 hidden md:block">
            <ul className="space-y-1">
              {SETTINGS_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Mobile nav */}
          <div className="md:hidden w-full mb-6">
            <div className="flex gap-1 overflow-x-auto pb-2">
              {SETTINGS_NAV.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
