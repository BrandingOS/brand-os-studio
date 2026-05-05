import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useBrandStore } from '@/shared/store/brandStore';
import { useEffect } from 'react';
import { Presentation, Edit, Folder, Loader2, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { logoUrl, hasLogo } from '@/shared/brand/logoUrl';
import { useUiPreference } from '@/shared/hooks/useUiPreference';

export default function BrandsPage() {
  const navigate = useNavigate();
  const { list: brands, loadAll, isLoading } = useBrandStore();
  const uiPreference = useUiPreference();

  // Brand-entry URLs respect the user's UI preference. Studio users land
  // on Setup (the canonical Studio entry) for "Open"; Classic users land
  // on Overview. "Brand Kit" picks the cosmos hub for Studio and the
  // legacy anchored hub for Classic. "Edit" goes to Identity in either
  // namespace (Identity is unmigrated, so /b/:slug/identity will redirect
  // to /a/:slug/identity for Studio users — but skipping the redirect
  // here saves a hop).
  const homeUrlFor = (slug: string) =>
    uiPreference === 'classic' ? `/a/${slug}` : `/b/${slug}/setup`;
  const kitUrlFor = (slug: string) =>
    uiPreference === 'classic' ? `/a/${slug}/kit` : `/b/${slug}/brand-kit`;
  // Identity is unmigrated in Studio (Phase B will port it). For now both
  // namespaces land on the Classic page directly to avoid a redirect hop.
  const identityUrlFor = (slug: string) => `/a/${slug}/identity`;

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="My Brands"
          subtitle="Manage and organize all your brands in one place."
          actions={
            <Button onClick={() => navigate('/onboarding')}>
              Create New Brand
            </Button>
          }
        />

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : brands.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Brands Yet</CardTitle>
              <CardDescription>
                Get started by creating your first brand.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/onboarding')}>
                Create Your First Brand
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {brands.map((brand) => {
              const swatches = [
                brand.primaryColor,
                brand.secondaryColor,
                brand.accentColor,
                ...(brand.neutrals?.slice(0, 2) ?? []),
              ].filter((c): c is string => Boolean(c)).slice(0, 5);
              const stripEnd = brand.secondaryColor || brand.accentColor || brand.primaryColor;

              return (
                <Card
                  key={brand.id}
                  className="group overflow-hidden border-border transform-gpu will-change-transform transition-all duration-[280ms] ease-[cubic-bezier(0.15,0.5,0.05,1)] motion-safe:hover:-translate-y-0.5 hover:shadow-xl hover:border-primary/30"
                >
                  <div className="flex flex-row">
                    {/* Color strip — gradient primary → secondary/accent */}
                    <div
                      className="w-1.5 shrink-0 transition-[width] duration-[280ms] group-hover:w-2"
                      style={{
                        background: `linear-gradient(to bottom, ${brand.primaryColor}, ${stripEnd})`,
                      }}
                    />

                    {/* Brand info in the middle */}
                    <div className="flex-1 p-5 flex items-center gap-4 min-w-0">
                      {hasLogo(brand) ? (
                        <img
                          src={logoUrl(brand)}
                          alt={brand.name}
                          className="w-12 h-12 object-contain rounded shrink-0 transition-transform duration-300 motion-safe:group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded shrink-0 border border-border transition-transform duration-300 motion-safe:group-hover:scale-105"
                          style={{ backgroundColor: brand.primaryColor }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{brand.name}</CardTitle>
                        <CardDescription className="mt-0.5 truncate">
                          {brand.tone || 'Brand toolkit'}
                        </CardDescription>
                        {swatches.length > 0 && (
                          <div className="mt-2 flex items-center gap-1.5">
                            {swatches.map((color, i) => (
                              <div
                                key={`${color}-${i}`}
                                className="w-4 h-4 rounded-full border border-border/60 shadow-sm transition-transform duration-300 motion-safe:group-hover:scale-110"
                                style={{
                                  backgroundColor: color,
                                  transitionDelay: `${i * 30}ms`,
                                }}
                                title={color}
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions on the right */}
                    <div className="flex items-center gap-2 pr-4 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit Brand"
                        onClick={() => navigate(identityUrlFor(brand.slug))}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Brand Kit"
                        onClick={() => navigate(kitUrlFor(brand.slug))}
                      >
                        <Folder className="w-4 h-4" />
                      </Button>
                      <Button
                        className="gap-2"
                        onClick={() => navigate(homeUrlFor(brand.slug))}
                      >
                        Open
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}