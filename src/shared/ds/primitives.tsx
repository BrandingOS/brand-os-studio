import React from 'react';

/** Small text + chrome primitives shared across the system. */

/** The only uppercase in the product — 11px/600, 0.14em tracking. */
export function DsEyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="ds-eyebrow" style={style}>
      {children}
    </div>
  );
}

/** Keyboard hint chip: mono 11px in a 6px-radius outline. */
export function DsKbd({ children }: { children: React.ReactNode }) {
  return <span className="ds-kbd">{children}</span>;
}

export interface DsChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  /** Quiet dashed add-pill ("+ Add color"). */
  dashed?: boolean;
}

/** Filter chip — active fills charcoal; dashed marks the quiet add action. */
export function DsChip({ active, dashed, className, children, ...rest }: DsChipProps) {
  return (
    <button
      type="button"
      className={[
        'ds-chip',
        active ? 'ds-chip--active' : '',
        dashed ? 'ds-chip--dashed' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Charcoal tooltip: 12px, 8px radius, no arrow. Static presentation piece —
 * pair with a hover/focus wrapper at the call site. */
export function DsTooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="ds-tooltip" role="tooltip">
      {children}
    </span>
  );
}

export interface DsEmptyStateProps {
  children: React.ReactNode;
  /** Actions under the message (chips or tertiary buttons). */
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Dashed empty container — a section with nothing yet. */
export function DsEmptyState({ children, actions, style }: DsEmptyStateProps) {
  return (
    <div className="ds-empty" style={style}>
      <span>{children}</span>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}
