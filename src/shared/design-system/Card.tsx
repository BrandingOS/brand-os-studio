import * as React from 'react';
import { cn } from '@/lib/utils';

// ─── Card Variants ───────────────────────────────────────────────────
type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive' | 'feature' | 'glass';

const cardVariants: Record<CardVariant, string> = {
  default: 'bg-card border border-border rounded-xl',
  elevated: 'bg-card border border-border rounded-xl shadow-md',
  outlined: 'bg-transparent border border-border rounded-xl',
  interactive: 'bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer',
  feature: 'bg-card border border-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300',
  glass: 'glass-surface rounded-xl',
};

interface DSCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

export function DSCard({ variant = 'default', padding = 'md', className, children, ...props }: DSCardProps) {
  return (
    <div className={cn(cardVariants[variant], paddingMap[padding], className)} {...props}>
      {children}
    </div>
  );
}

// ─── CardHeader ──────────────────────────────────────────────────────
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function CardHeader({ title, description, action, icon, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)} {...props}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate">{title}</h3>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────
interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

export function StatCard({ label, value, change, changeType = 'neutral', icon, className, ...props }: StatCardProps) {
  return (
    <DSCard variant="default" padding="md" className={className} {...props}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {change && (
            <p className={cn(
              'text-xs mt-1',
              changeType === 'positive' && 'text-emerald-600',
              changeType === 'negative' && 'text-destructive',
              changeType === 'neutral' && 'text-muted-foreground',
            )}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </DSCard>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────
interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)} {...props}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── FeatureCard (for module/feature grids) ──────────────────────────
interface FeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  gradient?: string;
}

export function FeatureCard({ title, description, icon, badge, gradient, className, ...props }: FeatureCardProps) {
  return (
    <DSCard variant="interactive" padding="lg" className={cn('group relative overflow-hidden', className)} {...props}>
      {gradient && (
        <div
          className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300"
          style={{ background: gradient }}
        />
      )}
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          {icon && (
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-foreground group-hover:scale-110 transition-transform duration-300">
              {icon}
            </div>
          )}
          {badge}
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
    </DSCard>
  );
}
