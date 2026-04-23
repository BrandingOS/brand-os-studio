import { useBrandStore } from '@/shared/store/brandStore';

interface Props { brandId: string; }

export function BrandSyncBar({ brandId }: Props) {
  const brand = useBrandStore(s => s.list.find(b => b.id === brandId));
  if (!brand) return null;
  const when = brand.typescale?.updatedAt;
  return (
    <div className="flex items-center justify-between rounded border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
      <span>Synced to <strong className="text-foreground">{brand.name}</strong></span>
      <span>{when ? `Saved ${new Date(when).toLocaleTimeString()}` : 'Not saved yet'}</span>
    </div>
  );
}
