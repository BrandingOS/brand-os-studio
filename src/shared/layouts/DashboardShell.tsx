/**
 * DashboardShell — workspace-scope shell (v3).
 *
 * Wraps content with the AppRail + topbar + padded content area. Used by all
 * non-brand-scoped pages (workspace home, brands list, templates, settings,
 * etc). The brand scope uses BrandLayout, which mounts a second contextual
 * rail in addition to AppRail.
 */
import { ReactNode } from 'react';
import { DashboardNavbar } from '@/features/dashboard/components/DashboardNavbar';
import { AppRail } from './AppRail';
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

export function DashboardShell({
  children,
  maxWidth = 'xl',
  noPadding = false,
  className,
}: DashboardShellProps) {
  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      <AppRail />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardNavbar />

        <main className="flex-1 overflow-auto">
          <div className={cn(!noPadding && 'px-4 sm:px-6 lg:px-8 py-6', className)}>
            <div className={cn('mx-auto w-full', maxWidthMap[maxWidth])}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
