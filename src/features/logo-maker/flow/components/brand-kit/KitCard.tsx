import { cn } from '@/lib/utils';

interface KitCardProps {
  title: string;
  meta?: string;
  className?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function KitCard({ title, meta, className, children, action }: KitCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 flex flex-col gap-3',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          {meta && <p className="text-[11px] text-muted-foreground mt-0.5">{meta}</p>}
        </div>
        {action}
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
