import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  step: number;
  total: number;
  className?: string;
}

export function ProgressIndicator({ step, total, className }: ProgressIndicatorProps) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="text-xs text-muted-foreground tabular-nums">
        Step {step} of {total} · {pct}%
      </span>
      <div className="flex-1 max-w-[200px] h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
