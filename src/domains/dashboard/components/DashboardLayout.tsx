import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container-tight">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-xl font-semibold">Brand OS Dashboard</h1>
            <div className="flex items-center gap-4">
              {/* Future: User menu, notifications, etc. */}
            </div>
          </div>
        </div>
      </header>
      <main className="container-tight py-8">
        {children}
      </main>
    </div>
  );
};