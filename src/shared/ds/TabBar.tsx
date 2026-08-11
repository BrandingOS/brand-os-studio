import React, { useLayoutEffect, useRef, useState } from 'react';

/**
 * Grouped tab bar: 10px-radius container, 4px padding, 2px gap, 1px border
 * on surface; 8px-radius tabs. The active fill is one indicator pill that
 * slides between tabs (220ms, system easing) rather than snapping.
 *
 * The indicator is measured with offsetLeft/offsetWidth — layout-based and
 * immune to ancestor transforms (getBoundingClientRect lies mid-animation;
 * see the CosmosWorkspaceShell.measurePill incident, CLAUDE.md).
 */

export interface DsTabBarProps {
  tabs: { value: string; label: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  'aria-label'?: string;
}

export function DsTabBar({ tabs, value, onChange, 'aria-label': ariaLabel }: DsTabBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const measure = () => {
      const active = bar.querySelector<HTMLElement>('[data-ds-tab-active="true"]');
      if (active) setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return; // jsdom
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [value, tabs.length]);

  return (
    <div ref={barRef} className="ds-tabbar" role="tablist" aria-label={ariaLabel}>
      {indicator && (
        <div
          className="ds-tabbar-indicator"
          style={{ width: indicator.width, transform: `translateX(${indicator.left - 4}px)`, left: 4 }}
        />
      )}
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            type="button"
            key={tab.value}
            role="tab"
            aria-selected={active}
            data-ds-tab-active={active}
            className={['ds-tab', active ? 'ds-tab--active' : ''].filter(Boolean).join(' ')}
            onClick={() => onChange(tab.value)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
