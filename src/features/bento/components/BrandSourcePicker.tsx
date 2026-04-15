import { useEffect } from 'react';
import { useBrandStore } from '@/shared/store/brandStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles } from 'lucide-react';

interface Props {
  brandId: string | null;
  onChange: (brandId: string | null) => void;
}

export function BrandSourcePicker({ brandId, onChange }: Props) {
  const list = useBrandStore((s) => s.list);
  const loadAll = useBrandStore((s) => s.loadAll);

  useEffect(() => {
    if (list.length === 0) {
      loadAll().catch((err) => console.error('BrandSourcePicker loadAll failed:', err));
    }
  }, [list.length, loadAll]);

  return (
    <div className="flex items-center gap-1.5">
      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
      <Select value={brandId ?? 'blank'} onValueChange={(v) => onChange(v === 'blank' ? null : v)}>
        <SelectTrigger className="h-8 w-[180px] text-sm">
          <SelectValue placeholder="Start blank" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="blank">Start blank</SelectItem>
          {list.map((b) => (
            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
