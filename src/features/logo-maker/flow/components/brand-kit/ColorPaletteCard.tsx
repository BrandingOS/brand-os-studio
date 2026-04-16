import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { KitCard } from './KitCard';
import type { PaletteSuggestion } from '../../utils/brand-context';

interface ColorPaletteCardProps {
  palette: PaletteSuggestion;
}

export function ColorPaletteCard({ palette }: ColorPaletteCardProps) {
  const swatches = [
    { label: 'Primary', hex: palette.primary },
    { label: 'Secondary', hex: palette.secondary },
    ...palette.accents.map((hex, i) => ({ label: `Accent ${i + 1}`, hex })),
  ];

  return (
    <KitCard title="Color palette" meta="HEX · RGB · HSL">
      <div className="space-y-3">
        <div className="flex gap-1.5">
          {swatches.map((s) => (
            <Swatch key={s.hex + s.label} hex={s.hex} label={s.label} />
          ))}
        </div>
        <div className="flex gap-1 pt-2 border-t border-border">
          {Object.entries(palette.neutrals).map(([k, hex]) => (
            <div
              key={k}
              className="flex-1 h-6 rounded-sm border border-border/60"
              style={{ backgroundColor: hex }}
              title={`${k}: ${hex}`}
            />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">Neutrals: darkest → lightest</p>
      </div>
    </KitCard>
  );
}

function Swatch({ hex, label }: { hex: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="group flex-1 relative rounded-md overflow-hidden aspect-square focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ backgroundColor: hex }}
      title={`Copy ${hex}`}
    >
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <div
          className={cn(
            'opacity-0 group-hover:opacity-100 transition-opacity',
            copied && 'opacity-100',
          )}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
        </div>
      </div>
      <div className="absolute bottom-1 left-1 right-1 text-center">
        <p className="text-[9px] font-mono bg-background/80 backdrop-blur rounded px-1 truncate">
          {hex}
        </p>
      </div>
    </button>
  );
}
