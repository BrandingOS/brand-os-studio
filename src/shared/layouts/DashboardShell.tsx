/**
 * DashboardShell — Layout for all dashboard pages.
 *
 * Wraps content with the standard sidebar + topbar + padded content area.
 * Used by: /dashboard, /dashboard/brands, /dashboard/brand/:slug/*, /dashboard/templates, etc.
 */
import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardNavbar } from '@/features/dashboard/components/DashboardNavbar';
import { DashboardSidebar } from '@/features/dashboard/components/DashboardSidebar';
import { AppShell } from './AppShell';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  children: ReactNode;
  /** Override max-width of content area */
  maxWidth?: 'lg' | 'xl' | '2xl' | 'full';
  /** Remove default padding for custom layouts */
  noPadding?: boolean;
  className?: string;
}

const maxWidthMap = {
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  full: 'max-w-full',
};

export function DashboardShell({ children, maxWidth = 'xl', noPadding = false, className }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <AppShell
        mode="sidebar"
        sidebar={<DashboardSidebar />}
        topbar={<DashboardNavbar />}
      >
        <div className={cn(
          !noPadding && 'px-4 sm:px-6 lg:px-8 py-6',
          className,
        )}>
          <div className={cn('mx-auto w-full', maxWidthMap[maxWidth])}>
            {children}
          </div>
        </div>
      </AppShell>
    </SidebarProvider>
  );
}
