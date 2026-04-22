/**
 * PaletteStrip — horizontal 11-swatch strip using the cosmos
 * design-system tokens so it matches the left panel exactly.
 */
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

import { apcaContrast, SHADE_STOPS, type ColorScale, type ShadeStop } from '@/lib/color-engine';

export interface PaletteStripProps {
  label: string;
  roleLabel?: string;
  scale: ColorScale;
  accentStop?: ShadeStop;
  onShadeClick: (stop: ShadeStop) => void;
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
}: PaletteStripProps) {
  return (
    <div className="color-strip">
      <div className="color-strip-head">
        <span className="color-strip-name">{label}</span>
        <span className="color-strip-tag">{roleLabel}</span>
      </div>
      <div className="color-strip-grid">
        {SHADE_STOPS.map((stop) => (
          <SwatchCell
            key={stop}
            stop={stop}
            hex={scale.shades[stop].hex}
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
  isAccent,
  onClick,
}: {
  stop: ShadeStop;
  hex: string;
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
      className="color-swatch"
      aria-label={`Stop ${stop} — ${hex}`}
    >
      <div className="flex items-center justify-between">
        <span className="color-swatch-stop">{stop}</span>
        {isAccent && <span className="color-swatch-dot" style={{ background: fg }} aria-hidden />}
      </div>
      <span className="color-swatch-hex">{hex.replace('#', '').toUpperCase()}</span>
      <span
        role="button"
        tabIndex={-1}
        onClick={doCopy}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && doCopy(e)}
        className="color-swatch-action"
        style={{ color: fg }}
        aria-label={`Copy ${hex}`}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </span>
    </button>
  );
}
