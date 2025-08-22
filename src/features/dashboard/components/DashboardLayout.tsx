import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardNavbar } from './DashboardNavbar';
import { DashboardSidebar } from './DashboardSidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardNavbar />
          
          <main className="flex-1 overflow-auto">
            <div className="container-tight py-6">
              <div className="flex items-center gap-2 mb-6">
                <SidebarTrigger className="md:hidden" />
              </div>
              
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}