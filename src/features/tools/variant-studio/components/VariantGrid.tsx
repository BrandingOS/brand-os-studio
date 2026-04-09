/**
 * VariantGrid — left-pane gallery, grouped by category.
 *
 * Categories mirror the brand-aware grouping the existing
 * LogoFilesModule introduced (Brand, Mono, Inverse, Custom, Pinned)
 * but the source of truth here is the in-session variants array, not
 * the brand. Pinned has its own group at the top so the user can see
 * what's about to ship in the export kit.
 */
import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { PaletteContext, SourceLogo, VariantSpec } from '../engine/types';
import { VariantTile } from './VariantTile';

interface VariantGridProps {
  source: SourceLogo;
  palette: PaletteContext;
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
  items: VariantSpec[];
}

function groupVariants(variants: VariantSpec[], pinned: Set<string>): Group[] {
  const groups: Group[] = [
    { key: 'pinned', label: 'In export kit', items: [] },
    { key: 'brand', label: 'Brand', items: [] },
    { key: 'mono', label: 'Monochrome', items: [] },
    { key: 'inverse', label: 'Inverse', items: [] },
    { key: 'custom', label: 'Custom', items: [] },
  ];
  const byKey = Object.fromEntries(groups.map((g) => [g.key, g]));
  for (const v of variants) {
    if (pinned.has(v.id)) byKey.pinned.items.push(v);
    if (v.colorMode === 'brand') byKey.brand.items.push(v);
    else if (v.colorMode === 'mono-black' || v.colorMode === 'mono-white') byKey.mono.items.push(v);
    else if (v.colorMode === 'inverse') byKey.inverse.items.push(v);
    else byKey.custom.items.push(v);
  }
  return groups.filter((g) => g.items.length > 0);
}

export function VariantGrid({
  source,
  palette,
  variants,
  pinnedIds,
  selectedId,
  onSelect,
  onTogglePin,
  onAddBlank,
}: VariantGridProps) {
  const groups = useMemo(() => groupVariants(variants, pinnedIds), [variants, pinnedIds]);

  return (
    <div className="space-y-5 p-3">
      {groups.map((g) => (
        <section key={g.key}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {g.label}
            </h3>
            <span className="text-[10px] text-muted-foreground">{g.items.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {g.items.map((v) => (
              <VariantTile
                key={v.id + g.key}
                source={source}
                spec={v}
                palette={palette}
                selected={selectedId === v.id}
                pinned={pinnedIds.has(v.id)}
                onSelect={() => onSelect(v.id)}
                onTogglePin={() => onTogglePin(v.id)}
              />
            ))}
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={onAddBlank}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-4 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        New variant
      </button>
    </div>
  );
}
