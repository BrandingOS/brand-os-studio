/**
 * BrandSyncBar — the thin control bar that appears above the generator
 * when the tool is mounted inside a brand scope.
 *
 * It handles the three integration flows:
 *   - Sync FROM brand: pull brand.primaryColor into the seed.
 *   - Save to brand: write back primary/secondary/neutrals.
 *   - Save as new palette variant (non-destructive).
 *
 * We only render when `mode === 'integrated'` and a brand is present.
 */
import { Sparkles, Download, Save, Link2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PaletteSystem } from '@/lib/color-engine';

export interface BrandSyncBarProps {
  brandName: string;
  brandPrimary?: string;
  palette: PaletteSystem;
  onPullFromBrand: () => void;
  onPushToBrand: () => void;
  onSaveAsVariant: () => void;
  disabled?: boolean;
}

export function BrandSyncBar({
  brandName,
  brandPrimary,
  palette,
  onPullFromBrand,
  onPushToBrand,
  onSaveAsVariant,
  disabled,
}: BrandSyncBarProps) {
  const isDrifted =
    !!brandPrimary &&
    brandPrimary.toLowerCase() !== palette.roles.primary.inputHex.toLowerCase();

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-primary/5 via-background to-background p-3',
        disabled && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Link2 className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">
            Linked to <span className="text-primary">{brandName}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isDrifted
              ? `Palette differs from brand (brand: ${brandPrimary}, tool: ${palette.roles.primary.inputHex}).`
              : 'In sync with brand color.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {brandPrimary && (
          <Button
            size="sm"
            variant="outline"
            onClick={onPullFromBrand}
            className="gap-1.5"
            disabled={disabled}
          >
            <Download className="h-3.5 w-3.5" />
            Pull from brand
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={onSaveAsVariant}
          className="gap-1.5"
          disabled={disabled}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Save as variant
        </Button>
        <Button size="sm" onClick={onPushToBrand} className="gap-1.5" disabled={disabled}>
          <Save className="h-3.5 w-3.5" />
          Save to Brand Kit
        </Button>
      </div>
    </div>
  );
}
