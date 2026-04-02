import { ReactNode } from 'react';
import { CanvaSidebar } from './CanvaSidebar';
import { CanvaTopBar } from './CanvaTopBar';

interface AppShellCanvaLayoutProps {
  children: ReactNode;
  brandName?: string;
  brandSlug?: string;
}

export function AppShellCanvaLayout({ children, brandName, brandSlug }: AppShellCanvaLayoutProps) {
  return (
    <div className="min-h-screen chrome-bg">
      <div className="mx-auto max-w-[1440px] flex" style={{ padding: '56px 16px 0 16px' }}>
        <CanvaSidebar brandSlug={brandSlug} />
        
        <section className="flex-1 min-w-0 pl-4 md:pl-6">
          <CanvaTopBar brandName={brandName} brandSlug={brandSlug} />
          
          <main className="mt-3">
            {children}
          </main>
        </section>
      </div>
    </div>
  );
}
