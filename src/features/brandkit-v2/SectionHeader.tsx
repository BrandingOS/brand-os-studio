/**
 * SectionHeader — shared header for every Brand Kit v2 section.
 *
 * Layout: small eyebrow + large title + count pill on the left;
 * action slot on the right (typically an Edit button).
 */
import * as React from 'react';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  count?: number;
  action?: React.ReactNode;
}

export function SectionHeader({ eyebrow, title, subtitle, count, action }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <div className="mt-1 flex items-center gap-3">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
          {typeof count === 'number' && (
            <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
