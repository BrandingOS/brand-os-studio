import { useBrandStore } from '@/shared/store/brandStore';

interface Props { brandId: string; }

/**
 * BrandSyncBar — compact "Synced to <brand>" chip above the board.
 * Styled with cosmos tokens so it matches the rest of the workspace.
 */
export function BrandSyncBar({ brandId }: Props) {
  const brand = useBrandStore(s => s.list.find(b => b.id === brandId));
  if (!brand) return null;
  const when = brand.typescale?.updatedAt;
  return (
    <div className="ts-sync-bar">
      <span>
        Synced to <strong>{brand.name}</strong>
      </span>
      <span className="ts-sync-bar-meta">
        {when ? `Saved ${new Date(when).toLocaleTimeString()}` : 'Not saved yet'}
      </span>
    </div>
  );
}
