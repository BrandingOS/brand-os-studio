import { ReactNode } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardNavbar } from './DashboardNavbar';
import { DashboardSidebar } from './DashboardSidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * DashboardLayout — workspace-scope shell.
 *
 * Provides the standard horizontal gutter + vertical rhythm. Pages decide their
 * own max-width by wrapping content in `max-w-5xl mx-auto`, `max-w-6xl mx-auto`,
 * etc. Pages MUST NOT redeclare horizontal/vertical padding — that's owned here.
 *
 * See docs/ux-redesign/ARCHITECTURE.md §5 for the page-template system.
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />

        <div className="flex-1 flex flex-col">
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
    </SidebarProvider>
  );
}