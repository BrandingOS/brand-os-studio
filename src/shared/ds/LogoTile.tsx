import React from 'react';
import { PlusIcon } from './icons';

/**
 * Brand-content container: a logo variant on the checkerboard transparency
 * stage with a variant chip. The empty slot is the dashed add tile.
 */

export interface DsLogoTileProps {
  /** The rendered logo (an <img>, inline SVG, or wordmark text). */
  children?: React.ReactNode;
  /** Variant chip, e.g. "PRIMARY", "MONO". */
  variant?: string;
  /** Plain background behind the logo instead of the checkerboard. */
  background?: string;
  onClick?: () => void;
  className?: string;
}

export function DsLogoTile({ children, variant, background, onClick, className }: DsLogoTileProps) {
  return (
    <div
      className={['ds-logo-tile', className ?? ''].filter(Boolean).join(' ')}
      style={background ? { background } : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
      {variant && <span className="ds-logo-tile-badge">{variant}</span>}
    </div>
  );
}

export function DsLogoTileEmpty({ onClick, label = 'Add logo' }: { onClick?: () => void; label?: string }) {
  return (
    <button
      type="button"
      className="ds-logo-tile ds-logo-tile--empty"
      onClick={onClick}
      aria-label={label}
    >
      <PlusIcon size={18} />
    </button>
  );
}
