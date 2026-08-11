import React from 'react';
import { ArrowRightIcon } from './icons';

/**
 * Three tiers, one solid pill per view. Grey is never an enabled state —
 * disabled is the primary at 40% opacity. Danger solid is the only
 * non-charcoal filled button, reserved for irreversible deletes.
 */

export interface DsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'md' | 'sm';
  /** Forward actions carry a trailing arrow. */
  arrow?: boolean;
}

export const DsButton = React.forwardRef<HTMLButtonElement, DsButtonProps>(
  function DsButton({ tone = 'primary', size = 'md', arrow = false, className, children, ...rest }, ref) {
    const classes = [
      'ds-btn',
      `ds-btn--${tone}`,
      size === 'sm' ? 'ds-btn--sm' : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <button ref={ref} type="button" className={classes} {...rest}>
        {children}
        {arrow && <ArrowRightIcon size={size === 'sm' ? 12 : 14} />}
      </button>
    );
  },
);
