import React, { useEffect, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon } from './icons';

/**
 * Closed trigger (14px radius field) + open listbox (12px radius, shadow-md,
 * 8px-radius options). Rendered in place — no portal — so `--ds-*` tokens
 * resolve in whichever theme scope the select sits in.
 */

export interface DsSelectOption {
  value: string;
  label: string;
}

export interface DsSelectProps {
  options: DsSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}

export function DsSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  className,
  'aria-label': ariaLabel,
}: DsSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={['ds-select', className ?? ''].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="ds-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ color: selected ? undefined : 'var(--ds-text-placeholder)' }}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDownIcon size={13} />
      </button>
      {open && (
        <div className="ds-select-list" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                type="button"
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className={['ds-select-option', isSelected ? 'ds-select-option--selected' : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
                {isSelected && <CheckIcon size={12} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
