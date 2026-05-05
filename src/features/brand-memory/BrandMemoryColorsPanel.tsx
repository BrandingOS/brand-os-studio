// Phase 6.4 — Surfaces the brand-memory color snapshot as a row of
// swatches. Reads via useBrandMemory; renders nothing when the brand
// has no analyzable designs yet (avoids a noisy zero-state).
import { useBrandMemory } from './useBrandMemory';

interface BrandMemoryColorsPanelProps {
  brandId: string | null | undefined;
  /** Max swatches to show. Defaults to 8 — fits one row on a 5xl page. */
  limit?: number;
  className?: string;
}

export function BrandMemoryColorsPanel({
  brandId,
  limit = 8,
  className,
}: BrandMemoryColorsPanelProps) {
  const { snapshot, loading, error } = useBrandMemory(brandId, { limit });

  if (error || loading) return null;
  if (!snapshot || snapshot.colors.length === 0) return null;

  return (
    <section
      data-brand-memory-colors
      className={
        'rounded-lg border border-border/40 bg-muted/20 px-4 py-3 ' +
        (className ?? '')
      }
      aria-label="Colors used in your designs"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium tracking-tight">
            Colors used in your designs
          </h2>
          <p className="text-xs text-muted-foreground">
            Top hues across your saved canvases — reach for these to stay on-brand.
          </p>
        </div>
        <ul className="flex items-center gap-1.5" role="list">
          {snapshot.colors.map((c) => (
            <li key={c.hex} title={`${c.hex} · ${c.count} use${c.count === 1 ? '' : 's'}`}>
              <span
                aria-label={`${c.hex} used ${c.count} times`}
                className="block h-6 w-6 rounded-full border border-border/60 shadow-sm"
                style={{ backgroundColor: c.hex }}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
