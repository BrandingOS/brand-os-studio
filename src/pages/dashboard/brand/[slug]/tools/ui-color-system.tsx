/**
 * /dashboard/brand/:slug/tools/ui-color-system (and /b/:slug/tools/...)
 *
 * In-app variant. Auto-seeds from the active brand's primary color if
 * available; otherwise falls back to a default seed. The generator
 * renders a BrandSyncBar internally via the `brand` prop; we just hand
 * it the brand data and the push handler.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { ColorSystemGenerator } from '@/features/tools/ui-color-system';
import { useBrandStore } from '@/shared/store/brandStore';
import { Button } from '@/components/ui/button';
import { isValidHex, normalizeHex, type PaletteSystem, type ShadeStop } from '@/lib/color-engine';

export default function InAppUiColorSystemPage() {
  const { slug } = useParams();
  const brand = useBrandStore((s) => s.list.find((b) => b.slug === slug));
  const updateBrand = useBrandStore((s) => s.update);
  const loadBySlug = useBrandStore((s) => s.loadBySlug);

  // If the store hasn't hydrated the brand yet, ask it to.
  useEffect(() => {
    if (slug && !brand) {
      loadBySlug(slug).catch(() => {
        /* surfaced by store */
      });
    }
  }, [slug, brand, loadBySlug]);

  const brandPrimary = useMemo(() => {
    const guess = brand?.primaryColor;
    return guess && isValidHex(guess) ? normalizeHex(guess) : undefined;
  }, [brand]);

  const seed = brandPrimary ?? '#0ea5e9';

  const pushToBrand = useCallback(
    async (palette: PaletteSystem) => {
      if (!brand) return;
      try {
        const stops: ShadeStop[] = [50, 100, 200, 500, 800, 950];
        await updateBrand(brand.id, {
          primaryColor: palette.roles.primary.inputHex,
          secondaryColor: palette.roles.secondary?.inputHex ?? brand.secondaryColor,
          accentColor: palette.roles.tertiary?.inputHex ?? brand.accentColor,
          neutrals: stops.map((s) => palette.roles.neutral.shades[s].hex),
        });
        toast.success('Brand Kit updated', {
          description: 'Colors pushed to this brand.',
        });
      } catch (err) {
        toast.error('Could not save', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [brand, updateBrand],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5">
            <a href={`/b/${slug}`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to brand
            </a>
          </Button>
          <div className="hidden text-sm text-muted-foreground md:block">
            <span className="font-semibold text-foreground">UI Color System</span>
            {brand && <span className="ml-2">· {brand.name}</span>}
          </div>
        </div>
      </header>
      <ColorSystemGenerator
        initialSeed={seed}
        forcedMode="integrated"
        brand={
          brand
            ? {
                brandName: brand.name,
                brandPrimary,
                onPush: pushToBrand,
              }
            : undefined
        }
      />
    </div>
  );
}
