/**
 * Brand assets — the catch-all, and a real destination.
 *
 * Everything that has a home is already in one; what lands here is the rest,
 * including anything we could not interpret. That is deliberate and it is the
 * point: discarding a file because we could not classify it is the worst thing
 * this screen could do, so "unplaced" is a shelf rather than a bin.
 */
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { ReviewCard } from './ReviewCard';

export interface AssetsSectionProps {
  items: OnboardingAsset[];
  onRename(id: string, next: string): void;
  onRemove(id: string): void;
}

export function AssetsSection({ items, onRename, onRemove }: AssetsSectionProps) {
  return (
    <ReviewCard
      title="Brand assets"
      meta={items.length ? `${items.length} ${items.length === 1 ? 'asset' : 'assets'}` : undefined}
      empty="Nothing here yet — anything we can't place elsewhere lands in your brand assets."
    >
      {items.length > 0 && (
        <div className="onb-files">
          {items.map((a) => (
            <div className="onb-file" key={a.id}>
              <span className="onb-file-ico" aria-hidden="true">
                {a.previewUrl ? (
                  <img src={a.previewUrl} alt="" />
                ) : (
                  (a.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? a.kind).slice(0, 4).toUpperCase()
                )}
              </span>
              <span className="onb-file-n">
                <button
                  type="button"
                  className="onb-file-rename"
                  onClick={() => {
                    const next = window.prompt('Name', a.name);
                    if (next && next.trim() && next.trim() !== a.name) onRename(a.id, next.trim());
                  }}
                >
                  {a.name}
                </button>
                <small>Saved to your library</small>
              </span>
              <button type="button" className="onb-file-x" onClick={() => onRemove(a.id)}>
                <span className="sr-only">Remove {a.name}</span>
                <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </ReviewCard>
  );
}
