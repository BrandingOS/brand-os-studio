import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { WorkspaceErrorBoundary } from '@/shared/components/ErrorBoundary';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { WorkspaceHeader } from './WorkspaceHeader';

const WorkspaceLayout = () => {
  return (
    <WorkspaceErrorBoundary>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <WorkspaceSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <WorkspaceHeader />
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </WorkspaceErrorBoundary>
  );
};

export default WorkspaceLayout;