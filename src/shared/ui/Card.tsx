import { Card as ShadcnCard } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <ShadcnCard className={cn('card-soft', className)}>
      {children}
    </ShadcnCard>
  );
}