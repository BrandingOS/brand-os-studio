/**
 * DashboardLayout — workspace-scope shell (v3).
 *
 * The workspace mounts only the AppRail. The Brand Context Rail is reserved
 * for the brand scope so that the workspace stays light and overview-oriented
 * — a control center, not a deep editor.
 *
 * Pages MUST NOT redeclare horizontal/vertical padding — that's owned here.
 * See docs/ux-redesign/ARCHITECTURE.md §5 for the page-template system.
 */
import { ReactNode } from 'react';
import { AppRail } from '@/shared/layouts/AppRail';
import { DashboardNavbar } from './DashboardNavbar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      <AppRail />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardNavbar />

        <main className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="mx-auto w-full max-w-6xl">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
