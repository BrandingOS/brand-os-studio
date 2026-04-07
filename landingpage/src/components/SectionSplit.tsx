import type { ReactNode } from 'react';

interface SectionSplitProps {
  index: number;
  title: string;
  subtitle: string;
  children?: ReactNode;
}

/**
 * Two-column setup-step layout.
 *
 * Left: numbered tag, title, subtitle. Right: image / preview.
 * Alternates side via the `index` prop (even = image right, odd = image left).
 */
export default function SectionSplit({
  index,
  title,
  subtitle,
  children,
}: SectionSplitProps) {
  const reverse = index % 2 === 1;

  return (
    <div className="grid items-center gap-12 md:gap-20 md:grid-cols-2" data-animate>
      <div className={reverse ? 'md:order-2' : ''}>
        <span className="num-tag">{String(index + 1).padStart(2, '0')}</span>
        <h3 className="mt-6 font-display text-3xl md:text-4xl font-bold tracking-tight leading-[1.1]">
          {title}
        </h3>
        <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
          {subtitle}
        </p>
      </div>
      <div className={reverse ? 'md:order-1' : ''}>
        {children ?? (
          <div className="surface aspect-[4/3] grid place-items-center">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Visual preview
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
