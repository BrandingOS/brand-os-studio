import { forwardRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ selected, disabled, className, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-pressed={!!selected}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          selected
            ? 'border-primary bg-primary/10 text-foreground'
            : 'border-border bg-background hover:border-muted-foreground/40 hover:bg-accent/40 text-muted-foreground hover:text-foreground',
          disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
          className,
        )}
        {...rest}
      >
        {selected && <Check className="w-3 h-3" />}
        {children}
      </button>
    );
  },
);
Chip.displayName = 'Chip';
