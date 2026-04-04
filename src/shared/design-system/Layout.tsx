import * as React from 'react';
import { cn } from '@/lib/utils';

// ─── Stack (vertical flex) ───────────────────────────────────────────
interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  align?: 'start' | 'center' | 'end' | 'stretch';
}

const gapMap: Record<number, string> = {
  1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4',
  5: 'gap-5', 6: 'gap-6', 8: 'gap-8', 10: 'gap-10', 12: 'gap-12',
};

const alignMap = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

export function Stack({ gap = 4, align = 'stretch', className, children, ...props }: StackProps) {
  return (
    <div className={cn('flex flex-col', gapMap[gap], alignMap[align], className)} {...props}>
      {children}
    </div>
  );
}

// ─── Cluster (horizontal flex, wraps) ────────────────────────────────
interface ClusterProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8;
  align?: 'start' | 'center' | 'end' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
}

const justifyMap = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

export function Cluster({
  gap = 3,
  align = 'center',
  justify = 'start',
  wrap = true,
  className,
  children,
  ...props
}: ClusterProps) {
  return (
    <div
      className={cn(
        'flex',
        gapMap[gap],
        alignMap[align],
        justifyMap[justify],
        wrap && 'flex-wrap',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Grid ────────────────────────────────────────────────────────────
interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4;
  gap?: 3 | 4 | 6 | 8;
  responsive?: boolean;
}

const colsMap: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export function Grid({ cols = 3, gap = 4, className, children, ...props }: GridProps) {
  return (
    <div className={cn('grid', colsMap[cols], gapMap[gap], className)} {...props}>
      {children}
    </div>
  );
}

// ─── Container ───────────────────────────────────────────────────────
type ContainerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

const containerSizes: Record<ContainerSize, string> = {
  xs: 'max-w-md',
  sm: 'max-w-xl',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  full: 'max-w-full',
};

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
  padded?: boolean;
}

export function Container({ size = 'xl', padded = true, className, children, ...props }: ContainerProps) {
  return (
    <div
      className={cn('mx-auto w-full', containerSizes[size], padded && 'px-4 sm:px-6 lg:px-8', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────
interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  spacing?: 'sm' | 'md' | 'lg';
}

const dividerSpacing = {
  sm: 'my-3',
  md: 'my-6',
  lg: 'my-8',
};

export function Divider({ spacing = 'md', className, ...props }: DividerProps) {
  return <hr className={cn('border-border', dividerSpacing[spacing], className)} {...props} />;
}

// ─── Spacer ──────────────────────────────────────────────────────────
interface SpacerProps {
  size?: 2 | 4 | 6 | 8 | 10 | 12 | 16 | 20;
}

const spacerMap: Record<number, string> = {
  2: 'h-2', 4: 'h-4', 6: 'h-6', 8: 'h-8',
  10: 'h-10', 12: 'h-12', 16: 'h-16', 20: 'h-20',
};

export function Spacer({ size = 6 }: SpacerProps) {
  return <div className={spacerMap[size]} aria-hidden />;
}

// ─── Page ────────────────────────────────────────────────────────────
interface PageProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: ContainerSize;
}

export function Page({ maxWidth = 'xl', className, children, ...props }: PageProps) {
  return (
    <div className={cn('px-4 sm:px-6 lg:px-8 py-6 lg:py-8', className)} {...props}>
      <div className={cn('mx-auto w-full', containerSizes[maxWidth])}>
        {children}
      </div>
    </div>
  );
}

// ─── Center ──────────────────────────────────────────────────────────
interface CenterProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: ContainerSize;
}

export function Center({ maxWidth = 'sm', className, children, ...props }: CenterProps) {
  return (
    <div className={cn('flex items-center justify-center min-h-full', className)} {...props}>
      <div className={cn('w-full', containerSizes[maxWidth])}>
        {children}
      </div>
    </div>
  );
}
