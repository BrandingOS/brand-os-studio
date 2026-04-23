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

  const when = brand.typescale?.updatedAt;
  const brandHeading = brand.typography?.primary?.family;
  const brandBody = brand.typography?.secondary?.family;
  const savedLabel = when
    ? `Saved ${relativeTime(when)}`
    : 'Not saved yet';

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
            {brandHeading || brandBody
              ? `Brand fonts: ${brandHeading ?? '—'}${brandBody ? ` · ${brandBody}` : ''}`
              : 'No brand typography set yet.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground font-mono mr-1 hidden sm:inline">
          {savedLabel}
        </span>
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

/** "Saved 12s ago" / "Saved 3m ago" / "Saved 2h ago". */
function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 'just now';
  const diff = Math.max(0, Date.now() - then);
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
