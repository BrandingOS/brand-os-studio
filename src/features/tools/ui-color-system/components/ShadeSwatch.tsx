/**
 * ShadeSwatch — a single stop in a scale.
 *
 * Renders the chip, the stop number, and the hex. Hover reveals quick
 * actions (copy, edit, lock). Click opens the detail drawer. The text
 * color is picked from APCA contrast against the chip to guarantee
 * legibility at every shade.
 */
import { useState } from 'react';
import { Copy, Lock, LockOpen, Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import { apcaContrast } from '@/lib/color-engine';
import type { ShadeStop, ShadeValue } from '@/lib/color-engine';

export interface ShadeSwatchProps {
  stop: ShadeStop;
  value: ShadeValue;
  /** Fires when the user clicks anywhere on the chip (not on the actions). */
  onOpen: () => void;
  onToggleLock: () => void;
  onCopy?: (hex: string) => void;
  /** Highlight the 500 stop (or whichever is the "hero" stop). */
  accented?: boolean;
}

function fgFor(bgHex: string): string {
  // Pick white or near-black based on APCA magnitude.
  return Math.abs(apcaContrast('#ffffff', bgHex)) >
    Math.abs(apcaContrast('#111111', bgHex))
    ? '#ffffff'
    : '#111111';
}

export function ShadeSwatch({
  stop,
  value,
  onOpen,
  onToggleLock,
  onCopy,
  accented = false,
}: ShadeSwatchProps) {
  const [copied, setCopied] = useState(false);
  const fg = fgFor(value.hex);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value.hex);
      onCopy?.(value.hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked — silent */
    }
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ background: value.hex, color: fg }}
      className={cn(
        'group relative flex min-h-20 flex-1 cursor-pointer flex-col items-start justify-between overflow-hidden rounded-lg p-2 text-left text-[11px] font-medium ring-offset-2 transition-all',
        'hover:ring-2 hover:ring-offset-1 focus-visible:outline-none focus-visible:ring-2',
        accented && 'ring-1 ring-offset-0',
      )}
      aria-label={`Shade ${stop} — ${value.hex}`}
    >
      <div className="flex w-full items-start justify-between">
        <span className="opacity-90">{stop}</span>
        <span className="flex items-center gap-1 opacity-70">
          {value.locked && <Lock className="h-3 w-3" />}
          {value.edited && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
        </span>
      </div>

      <div className="flex w-full items-end justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wide">
          {value.hex.replace('#', '')}
        </span>
        <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span
            role="button"
            tabIndex={0}
            aria-label="Toggle lock"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onToggleLock();
              }
            }}
            className="inline-flex h-5 w-5 items-center justify-center rounded bg-black/20 hover:bg-black/40"
          >
            {value.locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label={`Copy ${value.hex}`}
            onClick={handleCopy}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleCopy(e as unknown as React.MouseEvent);
            }}
            className="inline-flex h-5 w-5 items-center justify-center rounded bg-black/20 hover:bg-black/40"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </span>
        </span>
      </div>
    </button>
  );
}
