/**
 * SeedInputBar — the top control bar for the studio.
 *
 * Seed color field + randomize + mode + lock-stop selector + optional
 * image upload. Emits changes up; doesn't own state. Mobile: stacks
 * vertically. Desktop: single row with compact pills.
 */
import { useRef } from 'react';
import {
  Dice5,
  Palette,
  Image as ImageIcon,
  Pipette,
  Check,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { isValidHex, normalizeHex, SHADE_STOPS, type ShadeStop, type GenerationMode } from '@/lib/color-engine';

export interface SeedInputBarProps {
  seed: string;
  onSeedChange: (hex: string) => void;
  mode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;
  lockedShade: ShadeStop | null;
  onLockedShadeChange: (stop: ShadeStop | null) => void;
  onImageUpload?: (file: File) => void;
  onRandomize?: () => void;
}

const MODES: { value: GenerationMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'brand-safe', label: 'Brand-safe' },
  { value: 'high-contrast', label: 'High contrast' },
  { value: 'soft-ui', label: 'Soft UI' },
  { value: 'vibrant-saas', label: 'Vibrant SaaS' },
  { value: 'neutral-enterprise', label: 'Enterprise' },
  { value: 'dark-mode-optimized', label: 'Dark-first' },
];

export function SeedInputBar({
  seed,
  onSeedChange,
  mode,
  onModeChange,
  lockedShade,
  onLockedShadeChange,
  onImageUpload,
  onRandomize,
}: SeedInputBarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    if (isValidHex(raw)) onSeedChange(normalizeHex(raw));
  };

  const pickColor = async () => {
    // EyeDropper is experimental — only Chromium at time of writing.
    const w = window as unknown as {
      EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
    };
    if (!w.EyeDropper) return;
    try {
      const result = await new w.EyeDropper().open();
      commit(result.sRGBHex);
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur">
      <div className="relative flex items-center">
        <input
          type="color"
          value={seed}
          onChange={(e) => commit(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-md border bg-transparent p-0"
          aria-label="Seed color picker"
        />
      </div>

      <div className="relative flex min-w-[140px] items-center">
        <Input
          type="text"
          value={seed}
          spellCheck={false}
          autoComplete="off"
          className="h-10 pr-8 font-mono text-sm uppercase"
          onChange={(e) => {
            const v = e.target.value;
            if (v.startsWith('#') || v.length < 8) commit(v.startsWith('#') ? v : `#${v}`);
          }}
          aria-label="Seed hex"
        />
        <Check
          className={cn(
            'absolute right-2 h-4 w-4',
            isValidHex(seed) ? 'text-emerald-500' : 'text-muted-foreground opacity-50',
          )}
          aria-hidden
        />
      </div>

      {onRandomize && (
        <Button variant="outline" size="sm" onClick={onRandomize} className="gap-1.5">
          <Dice5 className="h-4 w-4" />
          Randomize
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={pickColor}
        className="gap-1.5"
        aria-label="Pick from screen"
      >
        <Pipette className="h-4 w-4" />
        Pick
      </Button>

      {onImageUpload && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="gap-1.5"
          >
            <ImageIcon className="h-4 w-4" />
            From image
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImageUpload(file);
            }}
          />
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Palette className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Mode</span>
        </div>
        <Select value={mode} onValueChange={(v) => onModeChange(v as GenerationMode)}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(lockedShade ?? 'none')}
          onValueChange={(v) => onLockedShadeChange(v === 'none' ? null : (Number(v) as ShadeStop))}
        >
          <SelectTrigger className="h-9 w-[120px]">
            <SelectValue placeholder="Lock to…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No lock</SelectItem>
            {SHADE_STOPS.map((stop) => (
              <SelectItem key={stop} value={String(stop)}>
                Seed = {stop}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
