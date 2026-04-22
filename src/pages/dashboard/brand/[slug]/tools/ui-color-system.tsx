/**
 * /dashboard/brand/:slug/tools/ui-color-system (and /b/:slug/tools/...)
 *
 * In-app variant. Auto-seeds from the active brand's primary color if
 * available; otherwise falls back to a default seed. The brand-sync bar
 * is rendered here via the `headerSlot` prop so tool state can drive
 * Save-to-brand from inside the generator.
 */
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { ColorSystemGenerator } from '@/features/tools/ui-color-system';
import { useBrandStore } from '@/shared/store/brandStore';
import { Button } from '@/components/ui/button';
import { isValidHex, normalizeHex } from '@/lib/color-engine';

export default function InAppUiColorSystemPage() {
  const { slug } = useParams();
  const brand = useBrandStore((s) => s.brands.find((b) => b.slug === slug));

  const seed = useMemo(() => {
    const guess = (brand as unknown as { primaryColor?: string })?.primaryColor;
    if (guess && isValidHex(guess)) return normalizeHex(guess);
    return '#0ea5e9';
  }, [brand]);

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
        <div className="flex items-center gap-2 text-sm">
          <Button variant="outline" size="sm" disabled>
            Save to Brand Kit
          </Button>
        </div>
      </header>
      <ColorSystemGenerator initialSeed={seed} forcedMode="integrated" />
    </div>
  );
}
