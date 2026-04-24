import { Download, Link2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrandStore } from '@/shared/store/brandStore';
import { cn } from '@/lib/utils';

interface Props {
  brandId: string;
  /** Re-seed the draft from brand.typography.primary/secondary. */
  onPullFromBrand: () => void;
  /** Revert the active surface back to its default config. */
  onResetActiveSurface: () => void;
}

/**
 * BrandSyncBar — actionable "Linked to <brand>" control row. Offers two
 * recovery actions (Pull, Reset) and a small meta on the right showing
 * when the typescale was last saved. Visual pattern mirrors the color
 * system's BrandSyncBar so the two tools feel like siblings.
 */
export function BrandSyncBar({ brandId, onPullFromBrand, onResetActiveSurface }: Props) {
  const brand = useBrandStore(s => s.list.find(b => b.id === brandId));
  if (!brand) return null;

  const brandHeading = brand.fonts?.primary ?? brand.typography?.primary?.family;
  const brandBody = brand.fonts?.secondary ?? brand.typography?.secondary?.family;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-gradient-to-r from-primary/5 via-background to-background p-3',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Link2 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            Linked to <span className="text-primary">{brand.name}</span>
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            Preview only — only font selection saves back to the brand.
            {brandHeading || brandBody
              ? ` Current: ${brandHeading ?? '—'}${brandBody ? ` · ${brandBody}` : ''}`
              : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          onClick={onPullFromBrand}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Pull from brand
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onResetActiveSurface}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset scale
        </Button>
      </div>
    </div>
  );
}
