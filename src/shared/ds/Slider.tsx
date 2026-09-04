import React from 'react';

/**
 * A value on a range.
 *
 * ── Why this is in the Design System ──────────────────────────────────────
 *
 * It is the one selection control the spec's set was missing, and it is not
 * missing for want of demand: `components/ui/slider` has ten importers
 * (mockup-studio, guidelines, logo-maker, logo-to-svg, bento) and another ten
 * surfaces hand-roll a bare `input[type=range]` with `accent-primary` —
 * brand-board, typescale, the presentation customiser, the editor's floating
 * toolbar. Twenty consumers wanting the same thing for the same reason is
 * evidence of a shared primitive rather than of a coincidence, and a slider is
 * exactly what the DS is for: generic, product-agnostic, visually stable, no
 * product concept in it.
 *
 * Adding it here rather than locally to one feature is the D rung of the reuse
 * ladder, taken deliberately. The existing call sites are NOT migrated by this
 * change — they move when their own surface is touched.
 *
 * ── Why a native input rather than a drawn track ─────────────────────────
 *
 * Keyboard, touch, pointer capture, RTL and every assistive technology already
 * work on `input[type=range]`, and a div-and-drag reimplementation gets each of
 * those wrong in turn. The styling reaches the parts through the vendor
 * pseudo-elements, which cannot be combined into one selector list: a browser
 * drops the WHOLE rule when it meets a pseudo-element it does not know, so
 * `::-webkit-slider-thumb` and `::-moz-range-thumb` must be written as separate
 * blocks. That is why components.css repeats itself here and must keep doing so.
 */
export interface DsSliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Shown above the track, with the value right-aligned opposite it. */
  label?: string;
  /**
   * The value as the user should read it — "12px", "1.4×", "60%".
   * Rendered only alongside a label; a bare track states its own value badly.
   */
  format?: (value: number) => string;
}

export function DsSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  format,
  className,
  disabled,
  ...rest
}: DsSliderProps) {
  const track = (
    <input
      type="range"
      className={['ds-slider', className ?? ''].filter(Boolean).join(' ')}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
      {...rest}
    />
  );

  if (!label) return track;

  return (
    <div className="ds-slider-field" data-disabled={disabled ? '' : undefined}>
      <div className="ds-slider-head">
        <span className="ds-slider-label">{label}</span>
        <span className="ds-slider-value">{format ? format(value) : value}</span>
      </div>
      {track}
    </div>
  );
}
