/**
 * MissingVariantsRail — the killer in-app feature: "your brand is
 * missing these variants — generate them in one click."
 *
 * Diffs the canonical archetype against the user's current variant
 * list (via `findMissingVariants`) and surfaces what's missing as a
 * one-click "Generate" CTA.
 */
import { Sparkles } from 'lucide-react';
import type { PaletteContext, SourceLogo, VariantSpec } from '../engine/types';
import { findMissingVariants } from '../engine/missingVariants';

interface Props {
  source: SourceLogo;
  palette: PaletteContext;
  variants: VariantSpec[];
  onGenerate: (spec: VariantSpec) => void;
}

export function MissingVariantsRail({ source, palette, variants, onGenerate }: Props) {
  const missing = findMissingVariants(source, palette, variants);
  if (missing.length === 0) {
    return (
      <div className="border-b bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        <Sparkles className="mr-1 inline h-3 w-3" />
        Your logo system is complete.
      </div>
    );
  }
  return (
    <div className="border-b p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Missing from your brand
        </h3>
        <span className="text-[10px] text-muted-foreground">{missing.length}</span>
      </div>
      <div className="space-y-1">
        {missing.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onGenerate(m.spec)}
            className="group flex w-full items-center justify-between rounded-md border bg-card px-2.5 py-1.5 text-left hover:border-primary"
          >
            <div className="min-w-0">
              <div className="truncate text-xs font-medium">{m.label}</div>
              <div className="truncate text-[10px] text-muted-foreground">{m.purpose}</div>
            </div>
            <span className="shrink-0 text-[10px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Generate
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
