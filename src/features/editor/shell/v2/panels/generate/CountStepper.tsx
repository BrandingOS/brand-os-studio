// CountStepper — how many images this generation makes.
//
// Was a 1·2·3·4 segmented row. Four permanently-lit numbers read as four
// choices of equal weight in a toolbar where every other control is a single
// value, and the row cost as much width as the model picker beside it. A
// stepper says the same thing in a third of the space and scales if the cap
// ever moves.

import { Minus, Plus } from 'lucide-react';

export function CountStepper({
  value, onChange, disabled, min = 1, max = 4,
}: {
  value: number;
  /** Given an updater, so two fast clicks are two steps rather than one. */
  onChange: (n: number | ((cur: number) => number)) => void;
  disabled?: boolean; min?: number; max?: number;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const step = (delta: number) => { if (!disabled) onChange((cur) => clamp(cur + delta)); };

  return (
    <div
      data-generate-count
      data-generate-count-value={value}
      className="inline-flex h-8 items-center gap-0.5 rounded-lg border px-0.5"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      title={`Images per generation (max ${max})`}
    >
      <Step
        label="One fewer image"
        onClick={() => step(-1)}
        disabled={disabled || value <= min}
        data-generate-count-dec
      >
        <Minus className="h-3 w-3" aria-hidden />
      </Step>
      <output
        aria-label={`${value} image${value > 1 ? 's' : ''}`}
        className="min-w-[26px] text-center text-[11.5px] font-medium tabular-nums"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </output>
      <Step
        label="One more image"
        onClick={() => step(1)}
        disabled={disabled || value >= max}
        data-generate-count-inc
      >
        <Plus className="h-3 w-3" aria-hidden />
      </Step>
    </div>
  );
}

function Step({ children, label, onClick, disabled, ...rest }: {
  children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean;
  [k: `data-${string}`]: unknown;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-30"
      style={{ color: 'var(--text-secondary)' }}
      {...rest}
    >
      {children}
    </button>
  );
}
