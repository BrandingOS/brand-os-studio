/**
 * SettingsShell — Layout for settings/management pages.
 *
 * Left sidebar nav + content area, within the dashboard shell.
 * Used by: /settings/account, /settings/plans, /settings/team
 */
import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { DashboardShell } from './DashboardShell';
import { User, CreditCard, Users, Link as LinkIcon, Bell, Shield } from 'lucide-react';

const settingsNav = [
  { label: 'Account', href: '/settings/account', icon: User },
  { label: 'Plans & Billing', href: '/settings/plans', icon: CreditCard },
  { label: 'Team', href: '/settings/team', icon: Users },
  { label: 'Integrations', href: '/settings/integrations', icon: LinkIcon },
  { label: 'Notifications', href: '/settings/notifications', icon: Bell },
  { label: 'Security', href: '/settings/security', icon: Shield },
];

interface SettingsShellProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsShell({ title, description, children }: SettingsShellProps) {
  const location = useLocation();

  return (
    <DashboardShell maxWidth="2xl">
      <div className="flex gap-8">
        {/* Settings sidebar nav */}
        <aside className="hidden md:block w-52 shrink-0">
          <nav className="space-y-1 sticky top-20">
            {settingsNav.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Settings content */}
        <div className="flex-1 min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold font-display">{title}</h1>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          {children}
        </div>
      </div>
    </DashboardShell>
  );
}
