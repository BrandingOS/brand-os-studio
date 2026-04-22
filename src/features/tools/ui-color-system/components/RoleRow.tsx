/**
 * RoleRow — one labeled scale (11 swatches) for a role.
 *
 * The label+seed column is sticky on wide screens. Below ~lg the row
 * reflows so every swatch still hits a ~36px tap target.
 */
import { ChevronRight, Lock, X, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SHADE_STOPS, type ColorScale, type RoleKey } from '@/lib/color-engine';
import { ShadeSwatch } from './ShadeSwatch';

export interface RoleRowProps {
  role: RoleKey;
  label: string;
  scale: ColorScale;
  onSeedChange: (hex: string) => void;
  onShadeEdit: (stop: (typeof SHADE_STOPS)[number]) => void;
  onShadeLockToggle: (stop: (typeof SHADE_STOPS)[number]) => void;
  onRemove?: () => void;
  onRegenerate?: () => void;
  accentStop?: (typeof SHADE_STOPS)[number];
  isLocked?: boolean;
}

export function RoleRow({
  role,
  label,
  scale,
  onSeedChange,
  onShadeEdit,
  onShadeLockToggle,
  onRemove,
  onRegenerate,
  accentStop = 500,
  isLocked = false,
}: RoleRowProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-3 transition',
        'lg:flex-row lg:items-stretch lg:gap-3',
        isLocked && 'opacity-60',
      )}
    >
      <div className="flex w-full shrink-0 items-center justify-between gap-2 lg:w-44 lg:flex-col lg:items-stretch lg:justify-start">
        <div className="flex items-center gap-2">
          <div
            className="h-6 w-6 shrink-0 rounded-md border"
            style={{ background: scale.shades[accentStop].hex }}
            aria-hidden
          />
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {role}
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 lg:mt-2">
          <Input
            type="text"
            spellCheck={false}
            autoComplete="off"
            value={scale.inputHex}
            onChange={(e) => onSeedChange(e.target.value)}
            className="h-8 flex-1 font-mono text-xs uppercase"
            aria-label={`${label} seed hex`}
          />
          {onRegenerate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRegenerate}
              aria-label={`Regenerate ${label}`}
              className="h-8 w-8"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              aria-label={`Remove ${label}`}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11 lg:flex-1">
        {SHADE_STOPS.map((stop) => (
          <ShadeSwatch
            key={stop}
            stop={stop}
            value={scale.shades[stop]}
            accented={stop === accentStop}
            onOpen={() => onShadeEdit(stop)}
            onToggleLock={() => onShadeLockToggle(stop)}
          />
        ))}
      </div>

      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/40 backdrop-blur-[1px]">
          <div className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium shadow-sm">
            <Lock className="h-3 w-3" />
            Pro — unlock secondary scales
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      )}
    </div>
  );
}
