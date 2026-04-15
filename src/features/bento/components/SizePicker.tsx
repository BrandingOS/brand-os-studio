import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SIZE_PRESETS } from '../sizes';
import type { SizePresetId } from '../types';

interface Props {
  value: SizePresetId;
  custom?: { width: number; height: number };
  onChange: (id: SizePresetId, custom?: { width: number; height: number }) => void;
}

export function SizePicker({ value, onChange }: Props) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as SizePresetId)}
    >
      <SelectTrigger className="h-8 w-[180px] text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SIZE_PRESETS.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.width}×{p.height}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
