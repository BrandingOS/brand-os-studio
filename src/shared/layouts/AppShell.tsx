/**
 * AppShell — The root layout wrapper for BrandingOS.
 *
 * Every page type composes from this shell. It provides:
 * - Consistent viewport management (overflow, height)
 * - Optional sidebar + topbar scaffolding
 * - Three layout modes: sidebar, full, canvas
 */
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ShellMode = 'sidebar' | 'full' | 'canvas';

interface AppShellProps {
  mode?: ShellMode;
  sidebar?: ReactNode;
  topbar?: ReactNode;
  bottombar?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function AppShell({
  mode = 'sidebar',
  sidebar,
  topbar,
  bottombar,
  className,
  children,
}: AppShellProps) {
  if (mode === 'canvas') {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        {topbar}
        <div className="flex-1 flex overflow-hidden">
          {sidebar}
          <main className={cn('flex-1 overflow-hidden', className)}>
            {children}
          </main>
        </div>
        {bottombar}
      </div>
    );
  }

  if (mode === 'full') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {topbar}
        <main className={cn('flex-1', className)}>
          {children}
        </main>
        {bottombar}
      </div>
    );
  }

  // Default: sidebar mode
  return (
    <div className="min-h-screen flex w-full bg-background">
      {sidebar}
      <div className="flex-1 flex flex-col min-w-0">
        {topbar}
        <main className={cn('flex-1 overflow-auto', className)}>
          {children}
        </main>
        {bottombar}
      </div>
    </div>
  );
}
