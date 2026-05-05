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
  if (!snapshot) return null;
  const hasColors = snapshot.colors.length > 0;
  const hasFonts = snapshot.fonts.length > 0;
  if (!hasColors && !hasFonts) return null;

  return (
    <section
      data-brand-memory-colors
      className={
        'rounded-lg border border-border/40 bg-muted/20 px-4 py-3 ' +
        (className ?? '')
      }
      aria-label="Patterns from your designs"
    >
      {hasColors ? (
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
      ) : null}

      {hasFonts ? (
        <div
          data-brand-memory-fonts
          className={
            'flex items-center justify-between gap-3 ' +
            (hasColors ? 'mt-3 pt-3 border-t border-border/30' : '')
          }
        >
          <div>
            <h2 className="text-sm font-medium tracking-tight">
              Fonts you reach for
            </h2>
            <p className="text-xs text-muted-foreground">
              Families seen across your saved designs.
            </p>
          </div>
          <ul className="flex items-center gap-1.5 flex-wrap justify-end" role="list">
            {snapshot.fonts.map((f) => (
              <li key={f.family} title={`${f.family} · ${f.count} use${f.count === 1 ? '' : 's'}`}>
                <span
                  aria-label={`${f.family} used ${f.count} times`}
                  className="inline-block rounded-md border border-border/60 bg-background px-2 py-1 text-xs"
                  style={{ fontFamily: `'${f.family}', system-ui` }}
                >
                  {f.family}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
