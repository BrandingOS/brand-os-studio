/**
 * VariantTile — a single variant tile in the gallery.
 *
 * The outer element is a div (not a button) so we can nest the pin
 * control without producing invalid `<button>` inside `<button>` HTML.
 * The browser was treating the inner pin click as a click on the
 * outer button, then doing focus-scroll behaviour that made the page
 * jump on every interaction.
 */
import { useMemo } from 'react';
import { Pin, PinOff } from 'lucide-react';
import { renderSvg } from '../render/renderSvg';
import type { BrandSlogan, PaletteContext, SourceLogo, VariantSpec } from '../engine/types';
import { cn } from '@/lib/utils';

interface VariantTileProps {
  source: SourceLogo;
  spec: VariantSpec;
  palette: PaletteContext;
  slogan?: BrandSlogan;
  selected: boolean;
  pinned: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  /** Tile size. `'small'` is the legacy compact tile (rail-style),
   *  `'large'` is the gallery-page tile with a roomier preview. */
  size?: 'small' | 'large';
}

export function VariantTile({
  source,
  spec,
  palette,
  slogan,
  selected,
  pinned,
  onSelect,
  onTogglePin,
  size = 'small',
}: VariantTileProps) {
  const isLarge = size === 'large';
  const svg = useMemo(
    () =>
      renderSvg({
        source,
        spec,
        palette,
        slogan,
        width: isLarge ? 480 : 200,
        height: isLarge ? 320 : 130,
      }),
    [source, spec, palette, slogan, isLarge],
  );

  // Background swatch for the tile reflects the variant's spec bg.
  const tileBg =
    spec.background.kind === 'solid'
      ? spec.background.value
      : spec.background.kind === 'brand'
        ? palette.brandColors[0]?.hex
        : undefined;

  const tileBgStyle = tileBg
    ? { background: tileBg }
    : {
        backgroundImage:
          'linear-gradient(45deg, #f3f3f3 25%, transparent 25%), linear-gradient(-45deg, #f3f3f3 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f3f3f3 75%), linear-gradient(-45deg, transparent 75%, #f3f3f3 75%)',
        backgroundSize: isLarge ? '20px 20px' : '12px 12px',
        backgroundPosition: isLarge ? '0 0, 0 10px, 10px -10px, -10px 0' : '0 0, 0 6px, 6px -6px, -6px 0',
      };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'group relative w-full cursor-pointer rounded-xl border bg-card text-left transition-all',
        isLarge ? 'p-3' : 'p-2',
        selected
          ? 'border-primary shadow-md ring-2 ring-primary/20'
          : 'border-border hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm',
      )}
    >
      <div
        className="relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-lg"
        style={tileBgStyle}
      >
        {/* The rendered SVG is fluid (width/height = 100%) so we
            constrain it to a centered inner box and let it fill that.
            `[&>svg]` targets the injected SVG so it fills the wrapper. */}
        <div
          className={cn(
            'flex items-center justify-center [&>svg]:h-full [&>svg]:w-full',
            isLarge ? 'h-[78%] w-[78%]' : 'h-[80%] w-[80%]',
          )}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <div className={cn('mt-2 flex items-center justify-between gap-2', isLarge && 'mt-3')}>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'truncate font-medium text-foreground',
              isLarge ? 'text-sm' : 'text-[11px]',
            )}
          >
            {spec.label}
          </div>
          {isLarge && (
            <div className="truncate text-[10px] text-muted-foreground">
              {spec.composition} · {spec.colorMode}
            </div>
          )}
        </div>
      </div>
      <span
        role="button"
        tabIndex={-1}
        aria-label={pinned ? 'Unpin' : 'Pin to export kit'}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin();
        }}
        className={cn(
          'absolute flex cursor-pointer items-center justify-center rounded-md transition-opacity',
          isLarge ? 'right-2.5 top-2.5 p-1.5' : 'right-1.5 top-1.5 p-1',
          pinned
            ? 'bg-primary text-primary-foreground opacity-100'
            : 'bg-background/90 text-muted-foreground opacity-0 group-hover:opacity-100',
        )}
      >
        {pinned ? (
          <Pin className={cn(isLarge ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
        ) : (
          <PinOff className={cn(isLarge ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
        )}
      </span>
    </div>
  );
}
