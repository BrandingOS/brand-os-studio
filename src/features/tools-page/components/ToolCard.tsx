import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ExternalLinkIcon } from './icons';

type Size = 'compact' | 'regular' | 'feature';

export type ToolCardProps = {
  /** Destination. Relative paths are treated as internal (React Router). */
  to: string;
  /** Open in a new tab. Renders an `<a>` with `target="_blank"` + external chevron. */
  external?: boolean;
  /** Icon component on the left. Inherits `currentColor`. */
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  /** Short blurb under the title. One line preferred, truncated on small widths. */
  description: string;
  /** Optional right-aligned badge ("3 pending", "Live", etc.). */
  badge?: ReactNode;
  /** 'feature' → full-bleed hero card. 'regular' → standard grid cell.
   *  'compact' → shorter card for Utilities row. Defaults to 'regular'. */
  size?: Size;
};

/**
 * ToolCard — the single primitive used across every section of the Tools
 * hub. Styling follows the cosmos workspace surface + shadow tokens so it
 * inherits light/dark theme automatically from the `[data-workspace]` scope.
 *
 * Clickable-surface pattern: the whole card is a link. The outer element
 * is an <a> for external and a <Link> for internal routes.
 */
export function ToolCard({
  to,
  external,
  icon: Icon,
  title,
  description,
  badge,
  size = 'regular',
}: ToolCardProps) {
  const inner = (
    <>
      <span className="tools-card-icon" aria-hidden="true">
        <Icon size={size === 'feature' ? 26 : 22} />
      </span>
      <span className="tools-card-body">
        <span className="tools-card-head">
          <span className="tools-card-title">{title}</span>
          {badge ? <span className="tools-card-badge">{badge}</span> : null}
        </span>
        <span className="tools-card-desc">{description}</span>
      </span>
      <span className="tools-card-arrow" aria-hidden="true">
        {external ? <ExternalLinkIcon size={14} /> : <ChevronRight size={16} />}
      </span>
    </>
  );

  const className = `tools-card tools-card--${size}`;

  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link to={to} className={className}>
      {inner}
    </Link>
  );
}

export default ToolCard;
