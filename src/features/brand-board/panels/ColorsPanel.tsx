/**
 * ColorsPanel — Relume-style color controls for Brand Board.
 *
 * Tall cards per color (name, hex, lightness slider), a dedicated
 * Neutrals card showing the shade strip, and an add (+) tile. Shuffle
 * keyboard hint rendered as a kbd badge.
 */
import { useMemo, useRef } from 'react';
import { Sun, Moon, Shuffle, Plus, X, Lock, LockOpen } from 'lucide-react';
import { useBrandBoardStore } from '../store/useBrandBoardStore';
import { generateNeutrals } from '../engine/shuffle';

// ---- color utilities -------------------------------------------------------

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const sanitized = hex.replace('#', '');
  const r = parseInt(sanitized.substring(0, 2), 16) / 255;
  const g = parseInt(sanitized.substring(2, 4), 16) / 255;
  const b = parseInt(sanitized.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (hue < 60) { r = c; g = x; }
  else if (hue < 120) { r = x; g = c; }
  else if (hue < 180) { g = c; b = x; }
  else if (hue < 240) { g = x; b = c; }
  else if (hue < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => {
    const val = Math.round((v + m) * 255).toString(16);
    return val.length === 1 ? '0' + val : val;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function readableOn(hex: string): '#ffffff' | '#0a0a0f' {
  const { l } = hexToHsl(hex);
  return l > 0.55 ? '#0a0a0f' : '#ffffff';
}

/** Pantone-ish color name lookup keyed on hue. */
function namedColor(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  if (s < 0.08) return l > 0.9 ? 'Snow' : l > 0.5 ? 'Ash' : l > 0.2 ? 'Slate' : 'Onyx';
  if (h < 10)  return l < 0.45 ? 'Crimson' : 'Roman';
  if (h < 25)  return 'Coral';
  if (h < 45)  return 'Apricot';
  if (h < 65)  return 'Citron';
  if (h < 100) return 'Lime';
  if (h < 150) return 'Salem';
  if (h < 190) return 'Teal';
  if (h < 225) return 'Azure';
  if (h < 255) return 'Royal Blue';
  if (h < 280) return 'Indigo';
  if (h < 310) return 'Violet';
  if (h < 340) return 'Magenta';
  return 'Rose';
}

// ---- sub-components --------------------------------------------------------

interface ColorCardProps {
  color: string;
  badge?: string;
  removable?: boolean;
  locked?: boolean;
  onToggleLock?: () => void;
  onChange: (hex: string) => void;
  onRemove?: () => void;
}

function ColorCard({ color, badge, removable, locked, onToggleLock, onChange, onRemove }: ColorCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fg = readableOn(color);
  const { h, s, l } = useMemo(() => hexToHsl(color), [color]);
  const name = useMemo(() => namedColor(color), [color]);

  const handleLightness = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value) / 100;
    onChange(hslToHex(h, s, next));
  };

  return (
    <div
      className="relative rounded-[20px] overflow-hidden group"
      style={{
        background: color,
        color: fg,
        aspectRatio: '3 / 5',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.10)',
      }}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        onClick={() => inputRef.current?.click()}
        aria-label={`Pick ${name}`}
      />
      <div className="relative p-3 flex flex-col h-full pointer-events-none">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[13px] font-semibold tracking-tight">{name}</span>
          <div className="flex items-center gap-1 pointer-events-auto">
            {badge && (
              <span
                className="text-[9px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.22)', color: fg }}
              >
                {badge}
              </span>
            )}
            {onToggleLock && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock();
                }}
                className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                  locked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{
                  background: locked ? fg : 'rgba(255,255,255,0.22)',
                  color: locked ? color : fg,
                }}
                aria-label={locked ? `Unlock ${name}` : `Lock ${name}`}
                title={locked ? 'Unlock — shuffle will change this color' : 'Lock — shuffle will keep this color'}
              >
                {locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>
        <div className="flex-1" />
        <div className="pointer-events-auto">
          <div className="text-[13px] font-mono font-semibold tracking-wide mb-2 uppercase">
            {color.replace('#', '')}
          </div>
          <input
            type="range"
            min={10}
            max={90}
            value={Math.round(l * 100)}
            onChange={handleLightness}
            className="w-full h-1 cursor-pointer accent-white"
            style={{ opacity: 0.85 }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex items-center justify-between mt-1">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1 w-1 rounded-full"
                  style={{ background: fg, opacity: 0.35 }}
                />
              ))}
            </div>
            {removable && onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="h-5 w-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.25)' }}
                aria-label="Remove color"
              >
                <X className="h-3 w-3" style={{ color: fg }} />
              </button>
            )}
          </div>
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
    </div>
  );
}

function NeutralsCard({
  neutrals,
  locked,
  onToggleLock,
}: {
  neutrals: string[];
  locked: boolean;
  onToggleLock: () => void;
}) {
  return (
    <div
      className="relative rounded-[20px] overflow-hidden bg-white group"
      style={{
        aspectRatio: '3 / 5',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.10)',
      }}
    >
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
        <span className="text-[13px] font-semibold tracking-tight text-foreground">
          Neutrals
        </span>
        <button
          type="button"
          onClick={onToggleLock}
          className={`h-6 w-6 rounded-full flex items-center justify-center transition-all bg-black/10 hover:bg-black/20 ${
            locked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-label={locked ? 'Unlock neutrals' : 'Lock neutrals'}
          title={locked ? 'Unlock — shuffle will regenerate neutrals' : 'Lock — shuffle will keep these neutrals'}
        >
          {locked ? <Lock className="h-3 w-3 text-foreground" /> : <LockOpen className="h-3 w-3 text-foreground" />}
        </button>
      </div>
      <div className="absolute inset-0 flex flex-col pt-10">
        {neutrals.slice(0, 6).map((n, i) => (
          <div key={i} className="flex-1" style={{ background: n }} />
        ))}
      </div>
    </div>
  );
}

function AddColorCard({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="rounded-[20px] bg-white/60 hover:bg-white flex items-center justify-center transition-all"
      style={{
        aspectRatio: '3 / 5',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
      }}
      aria-label="Add color"
    >
      <div className="h-9 w-9 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_-6px_rgba(0,0,0,0.08)] flex items-center justify-center">
        <Plus className="h-4 w-4 text-foreground/60" />
      </div>
    </button>
  );
}

function ShuffleButton({ onClick, hint }: { onClick: () => void; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-6px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_6px_16px_-6px_rgba(0,0,0,0.12)] transition-shadow"
    >
      <Shuffle className="h-3.5 w-3.5" />
      <span>Shuffle</span>
      <kbd className="ml-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-neutral-100 rounded text-muted-foreground">
        {hint}
      </kbd>
    </button>
  );
}

// ---- main ------------------------------------------------------------------

export function ColorsPanel() {
  const draft = useBrandBoardStore((s) => s.draft);
  const setColor = useBrandBoardStore((s) => s.setColor);
  const setNeutrals = useBrandBoardStore((s) => s.setNeutrals);
  const addColor = useBrandBoardStore((s) => s.addColor);
  const shuffleColors = useBrandBoardStore((s) => s.shuffleColors);
  const toggleDarkMode = useBrandBoardStore((s) => s.toggleDarkMode);

  const { primary, secondary, accent } = draft.colors;
  const { h: primaryHue } = hexToHsl(primary);
  const neutrals =
    draft.colors.neutrals.length > 0 ? draft.colors.neutrals : generateNeutrals(primaryHue);

  const lockedColors = useBrandBoardStore((s) => s.lockedColors);
  const toggleColorLock = useBrandBoardStore((s) => s.toggleColorLock);

  const isLight =
    draft.colors.background === '#ffffff' ||
    draft.colors.background.toLowerCase() === '#fff';

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[22px] font-semibold tracking-tight text-foreground">Colors</h3>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-white p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-6px_rgba(0,0,0,0.08)]">
            <button
              type="button"
              onClick={() => isLight || toggleDarkMode()}
              className={`px-2.5 py-1 rounded-full transition-colors ${isLight ? 'bg-neutral-900 text-white' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label="Light mode"
            >
              <Sun className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => !isLight || toggleDarkMode()}
              className={`px-2.5 py-1 rounded-full transition-colors ${!isLight ? 'bg-neutral-900 text-white' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label="Dark mode"
            >
              <Moon className="h-3.5 w-3.5" />
            </button>
          </div>
          <ShuffleButton onClick={shuffleColors} hint="C" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NeutralsCard
          neutrals={neutrals}
          locked={lockedColors.neutrals}
          onToggleLock={() => toggleColorLock('neutrals')}
        />
        <ColorCard
          color={primary}
          badge="Main"
          locked={lockedColors.primary}
          onToggleLock={() => toggleColorLock('primary')}
          onChange={(hex) => {
            setColor('primary', hex);
            if (!lockedColors.neutrals) setNeutrals(generateNeutrals(hexToHsl(hex).h));
          }}
        />
        <ColorCard
          color={secondary}
          removable
          locked={lockedColors.secondary}
          onToggleLock={() => toggleColorLock('secondary')}
          onChange={(hex) => setColor('secondary', hex)}
          onRemove={() => setColor('secondary', '#94a3b8')}
        />
        <ColorCard
          color={accent}
          removable
          locked={lockedColors.accent}
          onToggleLock={() => toggleColorLock('accent')}
          onChange={(hex) => setColor('accent', hex)}
          onRemove={() => setColor('accent', '#f59e0b')}
        />
        <AddColorCard
          onAdd={() => {
            const hue = Math.floor(Math.random() * 360);
            addColor(hslToHex(hue, 0.65, 0.55));
          }}
        />
      </div>
    </section>
  );
}
