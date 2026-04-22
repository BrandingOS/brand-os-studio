/**
 * HarmonyPanel — color-theory explorer.
 *
 * Each tab shows a harmony built off the primary seed, a brief
 * product-fit descriptor, and an Apply button that feeds the seeds into
 * the palette store (populating secondary/tertiary scales).
 *
 * "Apply" is gated behind Pro for multi-role harmonies; preview stays
 * free so users can understand what they'd get.
 */
import { useState } from 'react';
import { Sparkles, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ALL_HARMONIES,
  generateHarmony,
  type HarmonyName,
} from '@/lib/color-engine';

export interface HarmonyPanelProps {
  seedHex: string;
  onApply: (harmony: HarmonyName) => void;
  canApplyMulti: boolean;
}

const LABELS: Record<HarmonyName, string> = {
  monochromatic: 'Monochromatic',
  analogous: 'Analogous',
  complementary: 'Complementary',
  'split-complementary': 'Split-complementary',
  triadic: 'Triadic',
  tetradic: 'Tetradic',
};

export function HarmonyPanel({ seedHex, onApply, canApplyMulti }: HarmonyPanelProps) {
  const [active, setActive] = useState<HarmonyName>('analogous');
  const harmony = generateHarmony(seedHex, active);
  const requiresPro = active !== 'monochromatic' && !canApplyMulti;

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
        {ALL_HARMONIES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setActive(name)}
            className={cn(
              'shrink-0 rounded-md px-3 py-2 text-left text-sm transition',
              active === name
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted',
            )}
          >
            {LABELS[name]}
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{LABELS[active]}</h3>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              {harmony.descriptor}
            </p>
          </div>
          <Button
            onClick={() => onApply(active)}
            disabled={requiresPro}
            className="gap-1.5"
          >
            {requiresPro ? (
              <>
                <Lock className="h-3.5 w-3.5" />
                Pro
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Apply
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {harmony.seeds.map((hex, i) => (
            <div
              key={hex + i}
              className="flex flex-col overflow-hidden rounded-lg border"
            >
              <div className="h-24" style={{ background: hex }} aria-hidden />
              <div className="flex items-center justify-between gap-1 p-2 text-xs">
                <span className="text-muted-foreground">
                  {i === 0 ? 'Seed' : `Seed ${i + 1}`}
                </span>
                <span className="font-mono uppercase">{hex.replace('#', '')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
