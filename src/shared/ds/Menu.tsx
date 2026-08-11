import React from 'react';

/**
 * Dropdown menu surface: 12px radius, shadow-float, 8px-radius items.
 * Rendered in place (no portal) so tokens resolve in the local theme scope.
 * Danger items hover to the danger wash; destructive actions still confirm.
 */

export function DsMenu({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="menu" className={['ds-menu', className ?? ''].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

export interface DsMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  /** Keyboard hint rendered right-aligned in a kbd chip. */
  kbd?: string;
  danger?: boolean;
}

export function DsMenuItem({ icon, kbd, danger, children, className, ...rest }: DsMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={['ds-menu-item', danger ? 'ds-menu-item--danger' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon}
      {children}
      {kbd && <span className="ds-kbd ds-menu-item-kbd">{kbd}</span>}
    </button>
  );
}

export function DsMenuDivider() {
  return <div className="ds-menu-divider" role="separator" />;
}
