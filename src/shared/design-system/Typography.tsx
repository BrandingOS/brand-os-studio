import * as React from 'react';
import { cn } from '@/lib/utils';

// ─── Heading ─────────────────────────────────────────────────────────
type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const headingStyles: Record<HeadingLevel, string> = {
  h1: 'text-3xl sm:text-4xl font-bold tracking-tight font-display',
  h2: 'text-2xl sm:text-3xl font-semibold tracking-tight font-display',
  h3: 'text-xl sm:text-2xl font-semibold font-display',
  h4: 'text-lg font-semibold font-display',
  h5: 'text-base font-semibold',
  h6: 'text-sm font-semibold',
};

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  as?: HeadingLevel;
}

export function Heading({ level = 'h2', as, className, children, ...props }: HeadingProps) {
  const Tag = as || level;
  return (
    <Tag className={cn(headingStyles[level], 'text-foreground', className)} {...props}>
      {children}
    </Tag>
  );
}

// ─── Text ────────────────────────────────────────────────────────────
type TextSize = 'xs' | 'sm' | 'base' | 'lg';
type TextVariant = 'default' | 'muted' | 'accent' | 'danger';

const textSizes: Record<TextSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
};

const textVariants: Record<TextVariant, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  accent: 'text-primary',
  danger: 'text-destructive',
};

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: TextSize;
  variant?: TextVariant;
  as?: 'p' | 'span' | 'div';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  leading?: 'tight' | 'snug' | 'normal' | 'relaxed';
}

export function Text({
  size = 'base',
  variant = 'default',
  as: Tag = 'p',
  weight = 'normal',
  leading = 'normal',
  className,
  children,
  ...props
}: TextProps) {
  return (
    <Tag
      className={cn(
        textSizes[size],
        textVariants[variant],
        weight !== 'normal' && `font-${weight}`,
        leading !== 'normal' && `leading-${leading}`,
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

// ─── Label ───────────────────────────────────────────────────────────
interface LabelProps extends React.HTMLAttributes<HTMLLabelElement> {
  htmlFor?: string;
  required?: boolean;
}

export function Label({ className, children, required, ...props }: LabelProps) {
  return (
    <label
      className={cn('text-sm font-medium text-foreground', className)}
      {...props}
    >
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

// ─── Caption ─────────────────────────────────────────────────────────
interface CaptionProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'muted' | 'danger';
}

export function Caption({ variant = 'muted', className, children, ...props }: CaptionProps) {
  return (
    <span
      className={cn(
        'text-xs',
        variant === 'default' && 'text-foreground',
        variant === 'muted' && 'text-muted-foreground',
        variant === 'danger' && 'text-destructive',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// ─── SectionTitle (for page section headers) ─────────────────────────
interface SectionTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionTitle({ title, description, action, className, ...props }: SectionTitleProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)} {...props}>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold font-display text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── PageHeader ──────────────────────────────────────────────────────
interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions, badge, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn('space-y-1', className)} {...props}>
      {breadcrumbs && <div className="mb-2">{breadcrumbs}</div>}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display text-foreground truncate">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
