import { Badge as ShadcnBadge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.ComponentProps<typeof ShadcnBadge> {
  children: React.ReactNode;
}

export function Badge({ children, className, ...props }: BadgeProps) {
  return (
    <ShadcnBadge className={cn(className)} {...props}>
      {children}
    </ShadcnBadge>
  );
}