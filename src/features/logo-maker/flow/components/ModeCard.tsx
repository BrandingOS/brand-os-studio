import { forwardRef } from 'react';
import { Sparkles, Grid3x3, PenTool, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModeSpec } from '../constants';

const ICONS = {
  sparkles: Sparkles,
  grid: Grid3x3,
  'pen-tool': PenTool,
  upload: Upload,
} as const;

interface ModeCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  mode: ModeSpec;
}

export const ModeCard = forwardRef<HTMLButtonElement, ModeCardProps>(
  ({ mode, className, ...rest }, ref) => {
    const Icon = ICONS[mode.iconName];
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'group relative flex flex-col gap-3 rounded-lg border border-border bg-card p-6 text-left',
          'transition-all duration-150',
          'hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className,
        )}
        aria-label={`${mode.label} — ${mode.description}`}
        {...rest}
      >
        {mode.badge && (
          <span className="absolute top-4 right-4 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">
            {mode.badge}
          </span>
        )}

        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <kbd className="hidden sm:inline-flex items-center justify-center w-6 h-6 text-[11px] font-mono text-muted-foreground border border-border rounded">
            {mode.shortcut}
          </kbd>
        </div>

        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground mb-1.5">
            {mode.label}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {mode.description}
          </p>
        </div>

        <p className="text-xs text-muted-foreground/70 pt-2 border-t border-border/50">
          {mode.meta}
        </p>
      </button>
    );
  },
);
ModeCard.displayName = 'ModeCard';
