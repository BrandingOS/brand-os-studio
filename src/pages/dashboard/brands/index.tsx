import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useBrandStore } from '@/shared/store/brandStore';
import { useEffect } from 'react';
import { Presentation, Edit, Folder, Loader2, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { logoUrl, hasLogo } from '@/shared/brand/logoUrl';

export default function BrandsPage() {
  const navigate = useNavigate();
  const { list: brands, loadAll, isLoading } = useBrandStore();

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
            {brands.map((brand) => (
              <Card key={brand.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                <div className="flex flex-row">
                  {/* Color strip on the left */}
                  <div
                    className="w-2 shrink-0"
                    style={{ backgroundColor: brand.primaryColor }}
                  />

                  {/* Brand info in the middle */}
                  <div className="flex-1 p-5 flex items-center gap-4 min-w-0">
                    {hasLogo(brand) ? (
                      <img
                        src={logoUrl(brand)}
                        alt={brand.name}
                        className="w-10 h-10 object-contain rounded shrink-0"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded shrink-0 border border-border"
                        style={{ backgroundColor: brand.primaryColor }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">{brand.name}</CardTitle>
                      <CardDescription className="mt-0.5 truncate">
                        {brand.tone || 'Brand toolkit'}
                      </CardDescription>
                    </div>
                  </div>

                  {/* Actions on the right */}
                  <div className="flex items-center gap-2 pr-4 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit Brand"
                      onClick={() => navigate(`/b/${brand.slug}/identity`)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Brand Kit"
                      onClick={() => navigate(`/b/${brand.slug}/kit`)}
                    >
                      <Folder className="w-4 h-4" />
                    </Button>
                    <Button
                      className="gap-2"
                      onClick={() => navigate(`/b/${brand.slug}`)}
                    >
                      Open
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}