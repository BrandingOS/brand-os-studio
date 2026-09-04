import { DsSelect } from '@/shared/ds';
import { SIZE_PRESETS } from '../sizes';
import type { SizePresetId } from '../types';

interface Props {
  value: SizePresetId;
  custom?: { width: number; height: number };
  onChange: (id: SizePresetId, custom?: { width: number; height: number }) => void;
}

// The dimensions ride in the label because a DsSelectOption's label is a
// string, and they are the half of the choice people actually scan.
const OPTIONS = SIZE_PRESETS.map((p) => ({
  value: p.id,
  label: `${p.name} · ${p.width}×${p.height}`,
}));

export function SizePicker({ value, onChange }: Props) {
  return (
    <DsSelect
      className="bento-select"
      options={OPTIONS}
      value={value}
      onChange={(v) => onChange(v as SizePresetId)}
    />
  );
}
