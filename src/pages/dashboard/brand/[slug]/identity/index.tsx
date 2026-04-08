/**
 * Identity — tabbed page that absorbs the brand's identity-bearing modules.
 *
 * Tabs: Logo · Colors · Typography · Voice · Strategy
 *
 * Each tab inline-mounts the existing module from src/features/brandkit/.
 * No new module code — this is pure information-architecture work that
 * surfaces what already exists, in one place, with one header.
 *
 * The active tab is persisted to a `?tab=` search param so deep links work.
 *
 * See docs/ux-redesign/ARCHITECTURE.md §3.1.
 */
import { useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BrandLayout } from '@/features/brand';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useBrandStore } from '@/shared/store/brandStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogoFilesModule } from '@/features/brandkit/components/LogoFilesModule';
import { ColorSystemModule } from '@/features/brandkit/components/colors/ColorSystemModule';
import { TypographyModule } from '@/features/brandkit/components/TypographyModule';
import { BrandVoiceModule } from '@/features/brandkit/components/BrandVoiceModule';
import { BrandStrategyModule } from '@/features/brandkit/components/BrandStrategyModule';
import type { Brand } from '@/shared/types/brand';
import { Image as ImageIcon, Palette, Type, MessageCircle, Target } from 'lucide-react';

const TABS = ['logo', 'colors', 'typography', 'voice', 'strategy'] as const;
type TabId = (typeof TABS)[number];

const TAB_META: Record<TabId, { label: string; icon: React.ElementType }> = {
  logo: { label: 'Logo', icon: ImageIcon },
  colors: { label: 'Colors', icon: Palette },
  typography: { label: 'Typography', icon: Type },
  voice: { label: 'Voice', icon: MessageCircle },
  strategy: { label: 'Strategy', icon: Target },
};

function isValidTab(value: string | null): value is TabId {
  return value !== null && (TABS as readonly string[]).includes(value);
}

export default function IdentityPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { brand, isLoading, error } = useBrandBySlug(slug);
  const updateBrand = useBrandStore((s) => s.update);

  const activeTab: TabId = useMemo(() => {
    const fromUrl = searchParams.get('tab');
    return isValidTab(fromUrl) ? fromUrl : 'logo';
  }, [searchParams]);

  const handleTabChange = useCallback(
    (value: string) => {
      if (!isValidTab(value)) return;
      const next = new URLSearchParams(searchParams);
      next.set('tab', value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // ColorSystemModule is the only identity module that needs an updater.
  // Mirror the pattern used by BrandKitModuleView.
  const handleBrandUpdate = useCallback(
    async (patch: Partial<Brand>) => {
      if (!brand) return;
      await updateBrand(brand.id, patch);
    },
    [brand, updateBrand],
  );

  if (isLoading) {
    return (
      <BrandLayout brandName="Loading...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </BrandLayout>
    );
  }

  if (error || !brand) {
    return (
      <BrandLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">{error || 'Brand not found.'}</p>
        </div>
      </BrandLayout>
    );
  }

  return (
    <BrandLayout brandName={brand.name}>
      <div className="space-y-6">
        <PageHeader
          title="Identity"
          subtitle="Everything that makes this brand recognizable — logo, colors, type, voice, strategy."
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            {TABS.map((id) => {
              const { label, icon: Icon } = TAB_META[id];
              return (
                <TabsTrigger key={id} value={id} className="gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="logo" className="mt-6">
            <LogoFilesModule brand={brand} />
          </TabsContent>

          <TabsContent value="colors" className="mt-6">
            <ColorSystemModule brand={brand} onUpdate={handleBrandUpdate} />
          </TabsContent>

          <TabsContent value="typography" className="mt-6">
            <TypographyModule brand={brand} />
          </TabsContent>

          <TabsContent value="voice" className="mt-6">
            <BrandVoiceModule brand={brand} />
          </TabsContent>

          <TabsContent value="strategy" className="mt-6">
            <BrandStrategyModule brand={brand} />
          </TabsContent>
        </Tabs>
      </div>
    </BrandLayout>
  );
}
