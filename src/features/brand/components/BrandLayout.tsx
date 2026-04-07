import { ReactNode } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { BrandNavbar } from './BrandNavbar';
import { BrandSidebar } from './BrandSidebar';

interface BrandLayoutProps {
  children: ReactNode;
  brandName?: string;
  /**
   * Override max-width of the centered content column. Defaults to `6xl`.
   * Brand pages SHOULD use this prop instead of redeclaring `max-w-* mx-auto`
   * inside their content. Horizontal/vertical padding is owned by the layout.
   */
  maxWidth?: '5xl' | '6xl' | '7xl' | 'full';
}

const maxWidthClass: Record<NonNullable<BrandLayoutProps['maxWidth']>, string> = {
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

/**
 * BrandLayout — brand-scope shell.
 *
 * Provides the standard horizontal gutter + vertical rhythm and centers content
 * in a max-width column. Pages MUST NOT redeclare horizontal/vertical padding —
 * that's owned here.
 *
 * See docs/ux-redesign/ARCHITECTURE.md §5 for the page-template system.
 */
export function BrandLayout({ children, brandName, maxWidth = '6xl' }: BrandLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <BrandSidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <BrandNavbar brandName={brandName} />

          <main className="flex-1 overflow-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              <div className={`mx-auto w-full ${maxWidthClass[maxWidth]}`}>
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}