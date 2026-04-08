/**
 * PageHeader — the canonical page-level header.
 *
 * Every `AppPage` template page in BrandOS uses this header. Don't roll your own
 * `<div className="mb-8 flex items-center gap-4"><h1>...</h1></div>`. Use this.
 *
 * See docs/ux-redesign/ARCHITECTURE.md §5.5 for the spec.
 */
import { Fragment, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface PageHeaderBreadcrumbItem {
  label: string;
  /** If provided, the crumb is rendered as a link. */
  to?: string;
}

interface PageHeaderProps {
  /** Breadcrumb path leading to this page. The current page should NOT be included. */
  breadcrumb?: PageHeaderBreadcrumbItem[];
  /** Page title. Required. */
  title: ReactNode;
  /** Optional one-line subtitle / description. */
  subtitle?: ReactNode;
  /** Optional eyebrow above the title (e.g. a brand mark or section icon). */
  eyebrow?: ReactNode;
  /** Right-aligned action slot (buttons, dropdowns, etc.). */
  actions?: ReactNode;
  /** Bottom slot for tabs / filter pills under the header. */
  belowSlot?: ReactNode;
  className?: string;
}

export function PageHeader({
  breadcrumb,
  title,
  subtitle,
  eyebrow,
  actions,
  belowSlot,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-6', className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground"
        >
          {breadcrumb.map((crumb, i) => (
            <Fragment key={`${crumb.label}-${i}`}>
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />}
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && <div className="mb-1.5 flex items-center gap-2">{eyebrow}</div>}
          <h1 className="text-lg font-bold leading-tight tracking-tight sm:text-xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>

      {belowSlot && <div className="mt-3">{belowSlot}</div>}
    </header>
  );
}
