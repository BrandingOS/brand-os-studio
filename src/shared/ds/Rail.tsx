import React from 'react';

/**
 * Navigation rail: each item is its own 43 × 43 floating card (36 × 36 in
 * compact mode, labels move to tooltips), 4px apart. The active item wears
 * a charcoal border so it reads as connected to the panel it opened.
 * Rail items are individual cards; tab bars are one container — never mix
 * the two models.
 */

export interface DsRailItem {
  value: string;
  label: string;
  icon: React.ReactNode;
}

export interface DsRailProps {
  items: DsRailItem[];
  /** The active item, or null when no panel is open. */
  value: string | null;
  /** Clicking the active item again closes its panel (toggles to null). */
  onChange: (value: string | null) => void;
  compact?: boolean;
  'aria-label'?: string;
}

export function DsRail({ items, value, onChange, compact = false, 'aria-label': ariaLabel }: DsRailProps) {
  return (
    <nav
      className={['ds-rail', compact ? 'ds-rail--compact' : ''].filter(Boolean).join(' ')}
      aria-label={ariaLabel ?? 'Tools'}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            type="button"
            key={item.value}
            title={compact ? item.label : undefined}
            aria-label={item.label}
            aria-pressed={active}
            className={['ds-rail-item', active ? 'ds-rail-item--active' : ''].filter(Boolean).join(' ')}
            onClick={() => onChange(active ? null : item.value)}
          >
            {item.icon}
            <span className="ds-rail-item-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
