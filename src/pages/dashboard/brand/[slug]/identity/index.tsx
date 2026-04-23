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
import { useCallback, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useBrandStore } from '@/shared/store/brandStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import type { InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { Sparkles, Pencil } from 'lucide-react';
import { LogoFilesModule } from '@/features/brandkit/components/LogoFilesModule';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { ColorSystemModule } from '@/features/brandkit/components/colors/ColorSystemModule';
import { TypographyModule } from '@/features/brandkit/components/TypographyModule';
import { BrandVoiceModule } from '@/features/brandkit/components/BrandVoiceModule';
import { BrandStrategyModule } from '@/features/brandkit/components/BrandStrategyModule';
import type { Brand } from '@/shared/types/brand';
import { Image as ImageIcon, Palette, Type, MessageCircle, Target } from 'lucide-react';
import { useBrandSettings } from '@/shared/brand-settings';
import { EmbeddedTypescaleDialog } from '@/features/tools/typescale';

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
  const [typescaleOpen, setTypescaleOpen] = useState(false);

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

  // Inner-nav items mirror the tabs as href links — clicking an item updates
  // ?tab= and stays on the same page, which keeps the rail and chrome mounted.
  const innerNav = useMemo<InnerNavConfig>(() => ({
    title: 'Identity',
    icon: Sparkles,
    storageKey: 'brandos:identity-nav-open',
    groups: [
      {
        id: 'tabs',
        label: 'Sections',
        items: TABS.map((id) => ({
          id,
          label: TAB_META[id].label,
          icon: TAB_META[id].icon,
          href: `/b/${slug}/identity?tab=${id}`,
        })),
      },
    ],
  }), [slug]);

  useBrandPageConfig({ brandName: brand?.name, maxWidth: '7xl', innerNav });

  const { openSettingsTab } = useBrandSettings();

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{error || 'Brand not found.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <PageHeader
          compact
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

          <TabsContent value="logo" className="mt-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Logo</h2>
                <p className="text-sm text-muted-foreground">Your brand's logo files and variants.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openSettingsTab('general')}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            </div>
            {/* Variant Studio entry — the missing-variants generator. The
                studio mounts inside the editor scope (its own h-12 shell)
                so this is a navigation, not an inline embed. */}
            <div className="flex items-center justify-between rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Wand2 className="h-4 w-4 text-primary" />
                  Variant Studio
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Generate, customize, and export every logo variant your brand needs.
                </p>
              </div>
              <Button asChild size="sm">
                <Link to={`/b/${brand.slug}/tools/variant-studio`}>
                  Open studio
                </Link>
              </Button>
            </div>
            <LogoFilesModule brand={brand} />
          </TabsContent>

          <TabsContent value="colors" className="mt-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Colors</h2>
                <p className="text-sm text-muted-foreground">Brand color system and palettes.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openSettingsTab('colors')}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            </div>
            <ColorSystemModule brand={brand} onUpdate={handleBrandUpdate} />
          </TabsContent>

          <TabsContent value="typography" className="mt-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Typography</h2>
                <p className="text-sm text-muted-foreground">Font families and type scale.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setTypescaleOpen(true)}>
                  Open typescale editor
                </Button>
                <Button variant="outline" size="sm" onClick={() => openSettingsTab('typography')}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              </div>
            </div>
            <TypographyModule brand={brand} />
          </TabsContent>

          <TabsContent value="voice" className="mt-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Voice</h2>
                <p className="text-sm text-muted-foreground">Brand tone and communication style.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openSettingsTab('voice')}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            </div>
            <BrandVoiceModule brand={brand} />
          </TabsContent>

          <TabsContent value="strategy" className="mt-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Strategy</h2>
                <p className="text-sm text-muted-foreground">Vision, mission, values, and positioning.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openSettingsTab('strategy')}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            </div>
            <BrandStrategyModule brand={brand} />
          </TabsContent>
        </Tabs>

        <EmbeddedTypescaleDialog
          brandId={brand.id}
          open={typescaleOpen}
          onOpenChange={setTypescaleOpen}
        />
    </div>
  );
}
