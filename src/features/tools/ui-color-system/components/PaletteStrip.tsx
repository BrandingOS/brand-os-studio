/**
 * PaletteStrip — horizontal 11-swatch strip labeled by stop + hex.
 *
 * Visual reference: uicolors.app "Palette 1" row. Every swatch is a
 * square with the stop number at top-left and the hex (no `#`) at
 * bottom-left. The 500 stop — the identified role hex — gets a dot
 * marker. Click opens the ShadeDetailDrawer on the parent; locking and
 * copying are hover-revealed action chips.
 */
import { useState } from 'react';
import { Copy, Check, Lock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { apcaContrast, SHADE_STOPS, type ColorScale, type ShadeStop } from '@/lib/color-engine';

export interface PaletteStripProps {
  label: string;
  roleLabel?: string;
  scale: ColorScale;
  /** Stop considered the "hero" of this scale — gets a dot marker. */
  accentStop?: ShadeStop;
  onShadeClick: (stop: ShadeStop) => void;
  /** Inline action rendered on the far right of the label row. */
  rightSlot?: React.ReactNode;
}

function fgFor(bgHex: string): string {
  return Math.abs(apcaContrast('#ffffff', bgHex)) >
    Math.abs(apcaContrast('#111111', bgHex))
    ? '#ffffff'
    : '#111111';
}

export function PaletteStrip({
  label,
  roleLabel = 'Primary',
  scale,
  accentStop = 900,
  onShadeClick,
  rightSlot,
}: PaletteStripProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-medium text-foreground">{label}</span>
          <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
            {roleLabel}
          </span>
        </div>
        {rightSlot}
      </div>

      <div className="grid grid-cols-11 gap-1.5">
        {SHADE_STOPS.map((stop) => (
          <SwatchCell
            key={stop}
            stop={stop}
            hex={scale.shades[stop].hex}
            edited={scale.shades[stop].edited}
            locked={scale.shades[stop].locked}
            isAccent={stop === accentStop}
            onClick={() => onShadeClick(stop)}
          />
        ))}
      </div>
    </div>
  );
}

function SwatchCell({
  stop,
  hex,
  edited,
  locked,
  isAccent,
  onClick,
}: {
  stop: ShadeStop;
  hex: string;
  edited: boolean;
  locked: boolean;
  isAccent: boolean;
  onClick: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const fg = fgFor(hex);

  const doCopy = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* blocked */
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: hex, color: fg }}
      className={cn(
        'group relative flex aspect-square w-full flex-col justify-between overflow-hidden rounded-lg p-2 text-left text-[11px] font-medium transition',
        'hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
      )}
      aria-label={`Stop ${stop} — ${hex}`}
    >
      <div className="flex items-center justify-between">
        <span className="opacity-90">{stop}</span>
        {isAccent && (
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: fg }}
            aria-hidden
          />
        )}
      </div>
      <span className="font-mono text-[11px] uppercase tracking-tight">
        {hex.replace('#', '').toUpperCase()}
      </span>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-visible:pointer-events-auto group-focus-visible:opacity-100">
        {locked ? (
          <Lock className="h-3 w-3 opacity-90" aria-hidden />
        ) : (
          <span className="h-3 w-3" aria-hidden />
        )}
        {edited ? (
          <span className="h-1 w-1 rounded-full bg-current opacity-80" aria-hidden />
        ) : null}
        <span
          role="button"
          tabIndex={0}
          onClick={doCopy}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && doCopy(e)}
          className="inline-flex h-5 w-5 items-center justify-center rounded bg-black/25 hover:bg-black/40"
          aria-label={`Copy ${hex}`}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </span>
      </div>
    </button>
  );
}
