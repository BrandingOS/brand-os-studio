import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CanvasCardProps {
  children: ReactNode;
  className?: string;
}

export function CanvasCard({ children, className }: CanvasCardProps) {
  return (
    <div className={cn('canvas-card', className)}>
      {children}
    </div>
  );
}
