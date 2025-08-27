import { ReactNode } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { BrandNavbar } from './BrandNavbar';
import { BrandSidebar } from './BrandSidebar';

interface BrandLayoutProps {
  children: ReactNode;
  brandName?: string;
}

export function BrandLayout({ children, brandName }: BrandLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <BrandSidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <BrandNavbar brandName={brandName} />
          
          <main className="flex-1 overflow-auto">
            <div className="container-tight py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}