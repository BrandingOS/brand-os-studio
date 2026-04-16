import { Chip } from './shared/Chip';
import { INDUSTRIES } from '../constants';
import type { Industry } from '../state/types';

interface IndustryPickerProps {
  value: Industry | null;
  onChange: (next: Industry) => void;
}

export function IndustryPicker({ value, onChange }: IndustryPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Industry"
      className="flex flex-wrap gap-1.5"
    >
      {INDUSTRIES.map((ind) => {
        const selected = value === ind.value;
        return (
          <Chip
            key={ind.value}
            role="radio"
            aria-checked={selected}
            selected={selected}
            onClick={() => onChange(ind.value)}
          >
            {ind.label}
          </Chip>
        );
      })}
    </div>
  );
}
