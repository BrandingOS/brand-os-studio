/**
 * VariantGallery — the main page area, dominated by the user's logos.
 *
 * The gallery is the focus of the studio: large, generously-spaced
 * tiles, grouped by category. The currently-selected tile gets a
 * focused ring so the EditBar above always tells you what you're
 * editing. A "+ New variant" tile sits at the end of the grid.
 *
 * Each tile is a `VariantTile` rendered at gallery size. Pinning to
 * the export kit happens via the tile's pin button.
 */
import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { BrandSlogan, PaletteContext, SourceLogo, VariantSpec } from '../engine/types';
import { VariantTile } from './VariantTile';

interface VariantGalleryProps {
  /** All uploaded sources. Each variant carries a sourceId pointing
   *  to whichever one it was generated from. */
  sources: SourceLogo[];
  palette: PaletteContext;
  slogan?: BrandSlogan;
  variants: VariantSpec[];
  pinnedIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onTogglePin: (id: string) => void;
  onAddBlank: () => void;
}

interface Group {
  key: string;
  label: string;
  description: string;
  items: VariantSpec[];
}

function groupVariants(variants: VariantSpec[]): Group[] {
  const groups: Group[] = [
    {
      key: 'brand',
      label: 'Brand',
      description: 'Color logo on light surfaces',
      items: [],
    },
    {
      key: 'mono',
      label: 'Monochrome',
      description: 'Single-color reductions for print and high-contrast use',
      items: [],
    },
    {
      key: 'inverse',
      label: 'Inverse',
      description: 'For dark and brand-color backgrounds',
      items: [],
    },
    {
      key: 'custom',
      label: 'Custom',
      description: 'Hand-tuned variants',
      items: [],
    },
  ];
  const byKey = Object.fromEntries(groups.map((g) => [g.key, g]));
  for (const v of variants) {
    if (v.colorMode === 'brand') byKey.brand.items.push(v);
    else if (v.colorMode === 'mono-black' || v.colorMode === 'mono-white')
      byKey.mono.items.push(v);
    else if (v.colorMode === 'inverse') byKey.inverse.items.push(v);
    else byKey.custom.items.push(v);
  }
  return groups.filter((g) => g.items.length > 0);
}

export function VariantGallery({
  sources,
  palette,
  slogan,
  variants,
  pinnedIds,
  selectedId,
  onSelect,
  onTogglePin,
  onAddBlank,
}: VariantGalleryProps) {
  const groups = useMemo(() => groupVariants(variants), [variants]);
  // Build a quick lookup so each tile can find its source. Variants
  // with an unknown sourceId are dropped — usually because the user
  // removed the source after generating the variant, in which case
  // we can't render the tile any more.
  const sourceById = useMemo(
    () => new Map(sources.map((s) => [s.id, s])),
    [sources],
  );

  return (
    <div className="space-y-10">
      {/* Header strip — variant counts + add */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your variants</h2>
          <p className="text-xs text-muted-foreground">
            {variants.length} variants · {pinnedIds.size} pinned to export kit
          </p>
        </div>
        <button
          type="button"
          onClick={onAddBlank}
          className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          New variant
        </button>
      </div>

      {groups.map((g) => (
        <section key={g.key}>
          <header className="mb-3 flex items-baseline justify-between">
            <div>
              <h3 className="text-sm font-semibold">{g.label}</h3>
              <p className="text-[11px] text-muted-foreground">{g.description}</p>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              {g.items.length}
            </span>
          </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {g.items.map((v) => {
              const src = sourceById.get(v.sourceId);
              if (!src) return null;
              return (
                <VariantTile
                  key={v.id + g.key}
                  source={src}
                  spec={v}
                  palette={palette}
                  slogan={slogan}
                  selected={selectedId === v.id}
                  pinned={pinnedIds.has(v.id)}
                  onSelect={() => onSelect(v.id)}
                  onTogglePin={() => onTogglePin(v.id)}
                  size="large"
                />
              );
            })}
          </div>
        </section>
      ))}

      {variants.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center">
          <p className="text-sm text-muted-foreground">
            No variants yet. Generate one from the missing-variants list, or add a
            new one.
          </p>
          <button
            type="button"
            onClick={onAddBlank}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            New variant
          </button>
        </div>
      )}
    </div>
  );
}
