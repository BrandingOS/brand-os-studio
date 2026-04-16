import { useRef } from 'react';
import { Sun, Moon, Shuffle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrandBoardStore } from '../store/useBrandBoardStore';
import { generateNeutrals } from '../engine/shuffle';

/** Derive a simple color name from a hex value based on its hue. */
function colorName(hex: string): string {
  const sanitized = hex.replace('#', '');
  const r = parseInt(sanitized.substring(0, 2), 16) / 255;
  const g = parseInt(sanitized.substring(2, 4), 16) / 255;
  const b = parseInt(sanitized.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return l > 0.5 ? 'White' : 'Black';

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  if (s < 0.1) return l > 0.5 ? 'Light Gray' : 'Dark Gray';

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  const hue = h * 360;
  if (hue < 15) return 'Red';
  if (hue < 40) return 'Orange';
  if (hue < 65) return 'Yellow';
  if (hue < 150) return 'Green';
  if (hue < 195) return 'Teal';
  if (hue < 255) return 'Blue';
  if (hue < 285) return 'Purple';
  if (hue < 330) return 'Pink';
  return 'Red';
}

/** Parse hue from hex for neutral generation. */
function hueFromHex(hex: string): number {
  const sanitized = hex.replace('#', '');
  const r = parseInt(sanitized.substring(0, 2), 16) / 255;
  const g = parseInt(sanitized.substring(2, 4), 16) / 255;
  const b = parseInt(sanitized.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  let h = 0;
  const d = max - min;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return h * 360;
}

interface ColorCardProps {
  color: string;
  label: string;
  badge?: string;
  removable?: boolean;
  onChange: (hex: string) => void;
  onRemove?: () => void;
}

function ColorCard({ color, label, badge, removable, onChange, onRemove }: ColorCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <button
      type="button"
      className="group relative rounded-xl overflow-hidden border border-border/60 hover:ring-2 hover:ring-primary/30 transition-all text-left"
      onClick={() => inputRef.current?.click()}
    >
      <div
        className="aspect-[3/4] w-full min-h-[120px]"
        style={{ backgroundColor: color }}
      />
      <div className="absolute inset-0 flex flex-col justify-between p-2.5">
        <div className="flex items-start justify-between">
          <span className="text-[11px] font-medium text-white drop-shadow-sm">
            {label}
          </span>
          {badge && (
            <span className="text-[9px] font-semibold uppercase tracking-wider bg-white/25 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-end justify-between">
          <span className="text-[11px] font-mono text-white/80 drop-shadow-sm">
            {color.toUpperCase()}
          </span>
          {removable && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50"
            >
              <X className="h-3 w-3 text-white" />
            </span>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
    </button>
  );
}

function randomAccent(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 65%, 55%)`;
}

function hslStringToHex(hsl: string): string {
  // Parse hsl(h, s%, l%)
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return '#888888';
  const h = parseInt(match[1]);
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = (v: number) => {
    const hex = Math.round((v + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function ColorsPanel() {
  const draft = useBrandBoardStore((s) => s.draft);
  const setColor = useBrandBoardStore((s) => s.setColor);
  const setNeutrals = useBrandBoardStore((s) => s.setNeutrals);
  const addColor = useBrandBoardStore((s) => s.addColor);
  const shuffleColors = useBrandBoardStore((s) => s.shuffleColors);
  const toggleDarkMode = useBrandBoardStore((s) => s.toggleDarkMode);

  const { primary, secondary, accent } = draft.colors;

  // Auto-generate neutrals from primary hue
  const neutrals = draft.colors.neutrals.length > 0
    ? draft.colors.neutrals
    : generateNeutrals(hueFromHex(primary));

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Colors</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={toggleDarkMode}
            title="Toggle dark mode"
          >
            {draft.colors.background === '#ffffff' || draft.colors.background.toLowerCase() === '#fff' ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={shuffleColors}
            title="Shuffle colors"
          >
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Color cards grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <ColorCard
          color={primary}
          label={colorName(primary)}
          badge="Main"
          onChange={(hex) => {
            setColor('primary', hex);
            setNeutrals(generateNeutrals(hueFromHex(hex)));
          }}
        />
        <ColorCard
          color={secondary}
          label={colorName(secondary)}
          removable
          onChange={(hex) => setColor('secondary', hex)}
          onRemove={() => setColor('secondary', '#94a3b8')}
        />
        <ColorCard
          color={accent}
          label={colorName(accent)}
          removable
          onChange={(hex) => setColor('accent', hex)}
          onRemove={() => setColor('accent', '#f59e0b')}
        />
        {/* Add color button */}
        <button
          type="button"
          className="aspect-[3/4] min-h-[120px] rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          onClick={() => {
            const hex = hslStringToHex(randomAccent());
            addColor(hex);
          }}
        >
          <Plus className="h-5 w-5" />
          <span className="text-[11px] font-medium">Add Color</span>
        </button>
      </div>

      {/* Neutrals row */}
      <div>
        <span className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
          Neutrals
        </span>
        <div className="flex gap-1.5">
          {neutrals.slice(0, 6).map((n, i) => (
            <div
              key={i}
              className="flex-1 aspect-square rounded-lg border border-border/40"
              style={{ backgroundColor: n }}
              title={n.toUpperCase()}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
