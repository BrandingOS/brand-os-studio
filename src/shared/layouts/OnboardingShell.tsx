/**
 * OnboardingShell — Clean, focused layout for onboarding flows.
 *
 * Minimal chrome: logo, progress, centered content, fixed footer.
 * Used by: /onboarding
 */
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { ProgressBar } from '@/shared/design-system/Feedback';

interface OnboardingShellProps {
  /** Current step (1-based) */
  currentStep: number;
  totalSteps: number;
  /** Title shown in header */
  title?: string;
  subtitle?: string;
  /** Fixed footer content (prev/next buttons) */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function OnboardingShell({
  currentStep,
  totalSteps,
  title = 'Brand Identity Brief',
  subtitle,
  footer,
  children,
  className,
}: OnboardingShellProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Compact Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur shrink-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm hidden sm:inline">BrandOS</span>
            </Link>

            {/* Center title */}
            <div className="text-center">
              <p className="text-sm font-semibold">{title}</p>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>

            {/* Step counter */}
            <div className="text-xs text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <ProgressBar value={percentage} />
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className={cn('flex-1 overflow-y-auto', className)}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28">
          {children}
        </div>
      </main>

      {/* Fixed Footer */}
      {footer && (
        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
            {footer}
          </div>
        </footer>
      )}
    </div>
  );
}
