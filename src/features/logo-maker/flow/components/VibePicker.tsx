import { Chip } from './shared/Chip';
import { MAX_VIBES, VIBES } from '../constants';
import type { Vibe } from '../state/types';

interface VibePickerProps {
  value: Vibe[];
  onChange: (next: Vibe[]) => void;
}

export function VibePicker({ value, onChange }: VibePickerProps) {
  const toggle = (v: Vibe) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else if (value.length < MAX_VIBES) {
      onChange([...value, v]);
    }
  };

  return (
    <div>
      <div
        role="group"
        aria-label={`Vibes (select 1 to ${MAX_VIBES})`}
        className="flex flex-wrap gap-1.5"
      >
        {VIBES.map((vibe) => {
          const selected = value.includes(vibe.value);
          const atMax = value.length >= MAX_VIBES && !selected;
          return (
            <Chip
              key={vibe.value}
              selected={selected}
              disabled={atMax}
              aria-pressed={selected}
              onClick={() => toggle(vibe.value)}
            >
              {vibe.label}
            </Chip>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {value.length}/{MAX_VIBES} selected — pick 1 to 3.
      </p>
    </div>
  );
}
