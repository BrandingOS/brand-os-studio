import { useEffect, useMemo } from 'react';
import { useBrandStore } from '@/shared/store/brandStore';
import { DsSelect } from '@/shared/ds';
import { Sparkles } from 'lucide-react';

interface Props {
  brandId: string | null;
  onChange: (brandId: string | null) => void;
}

const BLANK = 'blank';

export function BrandSourcePicker({ brandId, onChange }: Props) {
  const list = useBrandStore((s) => s.list);
  const loadAll = useBrandStore((s) => s.loadAll);

  useEffect(() => {
    if (list.length === 0) {
      loadAll().catch((err) => console.error('BrandSourcePicker loadAll failed:', err));
    }
  }, [list.length, loadAll]);

  const options = useMemo(
    () => [{ value: BLANK, label: 'Start blank' }, ...list.map((b) => ({ value: b.id, label: b.name }))],
    [list],
  );

  return (
    <div className="bento-source">
      <Sparkles className="bento-source-icon" aria-hidden />
      <DsSelect
        className="bento-select"
        options={options}
        value={brandId ?? BLANK}
        onChange={(v) => onChange(v === BLANK ? null : v)}
        placeholder="Start blank"
      />
    </div>
  );
}
