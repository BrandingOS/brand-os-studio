import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isUnfinished, isPlaceholderPath, unfinishedLabel } from '@/shared/onboarding/onboardingState';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useBrandStore } from '@/shared/store/brandStore';
import { useEffect } from 'react';
import { Presentation, Edit, Folder, Loader2, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { logoUrl, hasLogo } from '@/shared/brand/logoUrl';
import { useUiPreference } from '@/shared/hooks/useUiPreference';
import { BrandCardMenu } from '@/features/dashboard/components/BrandCardMenu';

export default function BrandsPage() {
  const navigate = useNavigate();
  const { list: brands, loadAll, isLoading } = useBrandStore();
  const uiPreference = useUiPreference();

  // Brand-entry URLs respect the user's UI preference. Both namespaces
  // share the canonical /<ns>/:slug/setup shape (Phase A v2 / Commit 6
  // harmonization). Studio's Setup is the cosmos editor; Classic's
  // /a/:slug/setup is the legacy BrandHomePage at the same canonical
  // path.
  //
  // The `uiPreference` value comes from `useUiPreference()` above and is
  // re-read on every render — when the user toggles in Settings, this
  // page re-renders with the new value, and the click closures below
  // pick up the new value. Don't memoize these helpers; that would
  // capture a stale reference. Don't move them outside the component
  // body either; they need to read the live store.
  const homeUrlFor = (slug: string) =>
    uiPreference === 'classic' ? `/a/${slug}/setup` : `/b/${slug}/setup`;
  const kitUrlFor = (slug: string) =>
    uiPreference === 'classic' ? `/a/${slug}/brand-kit` : `/b/${slug}/brand-kit`;
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
            <Button onClick={() => navigate('/onboard-brand')}>
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
              <Button onClick={() => navigate('/onboard-brand')}>
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

              // Still setting up — a situation, never a deficiency. The same
              // not-decided language as the flow itself, applied at the scale of
              // a whole brand: the card stays solid because the brand is real.
              const wip = isUnfinished(brand);
              const wipLabel = unfinishedLabel(brand);
              // A sentinel colour is not a brand colour, so it is not shown as
              // one — no strip gradient, no swatch, no avatar fill.
              const colorIsSentinel = isPlaceholderPath(brand, 'colors.primary');

              return (
                <BrandCardMenu key={brand.id} brand={brand} editUrl={identityUrlFor(brand.slug)}>
                <Card
                  className="group overflow-hidden border-border transform-gpu will-change-transform transition-all duration-[280ms] ease-[cubic-bezier(0.15,0.5,0.05,1)] motion-safe:hover:-translate-y-0.5 hover:shadow-xl hover:border-primary/30"
                >
                  <div className="flex flex-row">
                    {/* Color strip — gradient primary → secondary/accent */}
                    <div
                      className="w-1.5 shrink-0 transition-[width] duration-[280ms] group-hover:w-2"
                      style={{
                        background: colorIsSentinel
                          ? 'hsl(var(--border))'
                          : `linear-gradient(to bottom, ${brand.primaryColor}, ${stripEnd})`,
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
                          className={`w-12 h-12 rounded shrink-0 border transition-transform duration-300 motion-safe:group-hover:scale-105 ${
                            colorIsSentinel ? 'border-dashed border-muted-foreground/40' : 'border-border'
                          }`}
                          style={colorIsSentinel ? undefined : { backgroundColor: brand.primaryColor }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{brand.name}</CardTitle>
                        <CardDescription className="mt-0.5 truncate">
                          {wipLabel ?? (brand.tone || "Brand toolkit")}
                        </CardDescription>
                        {swatches.length > 0 && !colorIsSentinel && (
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
                      {!wip && (
                        <>
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
                        </>
                      )}
                      <Button
                        className="gap-2"
                        variant={wip ? 'outline' : 'default'}
                        onClick={() =>
                          navigate(wip ? `/onboard-brand/${brand.slug}` : homeUrlFor(brand.slug))
                        }
                      >
                        {wip ? 'Resume' : 'Open'}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
                </BrandCardMenu>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}