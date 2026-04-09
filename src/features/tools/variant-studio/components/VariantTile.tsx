/**
 * VariantTile — a single variant in the left-pane gallery.
 *
 * Renders a small SVG preview of the variant. Click selects, double-click
 * focuses the spec panel, the pin toggles inclusion in the export kit.
 */
import { useMemo } from 'react';
import { Pin, PinOff } from 'lucide-react';
import { renderSvg } from '../render/renderSvg';
import type { PaletteContext, SourceLogo, VariantSpec } from '../engine/types';
import { cn } from '@/lib/utils';

interface VariantTileProps {
  source: SourceLogo;
  spec: VariantSpec;
  palette: PaletteContext;
  selected: boolean;
  pinned: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
}

export function VariantTile({
  source,
  spec,
  palette,
  selected,
  pinned,
  onSelect,
  onTogglePin,
}: VariantTileProps) {
  const svg = useMemo(
    () => renderSvg({ source, spec, palette, width: 200, height: 130 }),
    [source, spec, palette],
  );

  // Background swatch for the tile reflects the variant's spec bg.
  const tileBg =
    spec.background.kind === 'solid'
      ? spec.background.value
      : spec.background.kind === 'brand'
        ? palette.brandColors[0]?.hex
        : undefined;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative w-full rounded-lg border bg-card p-2 text-left transition-all',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-foreground/30',
      )}
    >
      <div
        className="flex aspect-[3/2] items-center justify-center overflow-hidden rounded-md"
        style={
          tileBg
            ? { background: tileBg }
            : {
                backgroundImage:
                  'linear-gradient(45deg, #f3f3f3 25%, transparent 25%), linear-gradient(-45deg, #f3f3f3 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f3f3f3 75%), linear-gradient(-45deg, transparent 75%, #f3f3f3 75%)',
                backgroundSize: '12px 12px',
                backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
              }
        }
      >
        <div className="max-h-[80%] max-w-[80%]" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <div className="mt-1.5 truncate text-[11px] font-medium text-foreground/80">{spec.label}</div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin();
        }}
        className={cn(
          'absolute right-1.5 top-1.5 rounded-md p-1 transition-opacity',
          pinned ? 'bg-primary text-primary-foreground opacity-100' : 'bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100',
        )}
        aria-label={pinned ? 'Unpin' : 'Pin to export kit'}
      >
        {pinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
      </button>
    </button>
  );
}
