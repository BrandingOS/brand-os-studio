import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// ─── Spinner ─────────────────────────────────────────────────────────
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const spinnerSizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return <Loader2 className={cn('animate-spin text-muted-foreground', spinnerSizes[size], className)} />;
}

// ─── PageLoader ──────────────────────────────────────────────────────
export function PageLoader({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Spinner size="lg" />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
}

export function Skeleton({ variant = 'text', width, height, className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted',
        variant === 'text' && 'h-4 rounded',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-lg',
        className,
      )}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}

// ─── Card Skeleton ───────────────────────────────────────────────────
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('border border-border rounded-xl p-5 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="w-10 h-10" />
        <div className="space-y-2 flex-1">
          <Skeleton width="60%" />
          <Skeleton width="40%" />
        </div>
      </div>
      <Skeleton variant="rectangular" className="w-full h-24" />
    </div>
  );
}

// ─── Grid Skeleton ───────────────────────────────────────────────────
export function GridSkeleton({ count = 6, cols = 3 }: { count?: number; cols?: 2 | 3 | 4 }) {
  const colsClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };
  return (
    <div className={cn('grid gap-4', colsClass[cols])}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── StepIndicator ───────────────────────────────────────────────────
interface Step {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'upcoming' | 'skipped';
}

interface StepIndicatorProps {
  steps: Step[];
  onStepClick?: (index: number) => void;
  className?: string;
}

export function StepIndicator({ steps, onStepClick, className }: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <button
            type="button"
            onClick={() => onStepClick?.(index)}
            disabled={!onStepClick}
            className={cn(
              'flex items-center gap-2 text-sm transition-colors',
              step.status === 'completed' && 'text-primary',
              step.status === 'current' && 'text-foreground font-medium',
              step.status === 'upcoming' && 'text-muted-foreground',
              step.status === 'skipped' && 'text-muted-foreground/50',
              onStepClick && 'cursor-pointer hover:text-foreground',
            )}
          >
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all',
                step.status === 'completed' && 'bg-primary border-primary text-primary-foreground',
                step.status === 'current' && 'border-primary text-primary bg-primary/10',
                step.status === 'upcoming' && 'border-border text-muted-foreground',
                step.status === 'skipped' && 'border-border/50 text-muted-foreground/50',
              )}
            >
              {step.status === 'completed' ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 mx-2',
                step.status === 'completed' ? 'bg-primary' : 'bg-border',
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({ value, max = 100, label, showValue, size = 'sm', className }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('space-y-1', className)}>
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-muted-foreground">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={cn('w-full rounded-full bg-muted overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline';

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-muted text-muted-foreground',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  outline: 'border border-border text-foreground',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function DSBadge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        badgeVariants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// ─── Alert ───────────────────────────────────────────────────────────
type AlertType = 'info' | 'success' | 'warning' | 'error';

const alertStyles: Record<AlertType, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: AlertType;
  icon?: React.ReactNode;
  title?: string;
}

export function Alert({ type = 'info', icon, title, className, children, ...props }: AlertProps) {
  return (
    <div className={cn('flex gap-3 rounded-lg border p-4', alertStyles[type], className)} {...props}>
      {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
      <div>
        {title && <p className="font-medium mb-0.5">{title}</p>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
  );
}
