/**
 * TintSwatches — color picker row for a tintable region.
 */

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { TintableRegion } from '../engine/types';

interface TintSwatchesProps {
  region: TintableRegion;
  value: string;
  onChange: (color: string) => void;
}

export function TintSwatches({ region, value, onChange }: TintSwatchesProps) {
  const swatches = region.swatches ?? [region.defaultColor];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground/80">
          {region.label}
        </label>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-5 w-8 cursor-pointer rounded border border-border/70 bg-transparent"
          aria-label={`${region.label} custom color`}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {swatches.map((c) => {
          const active = c.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              aria-label={c}
              className={cn(
                'relative h-7 w-7 rounded-md border transition-all',
                active
                  ? 'border-primary ring-2 ring-primary/40 scale-105'
                  : 'border-border/60 hover:scale-105',
              )}
              style={{ backgroundColor: c }}
            >
              {active && (
                <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white mix-blend-difference" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
