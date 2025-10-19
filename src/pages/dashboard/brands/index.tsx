import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useBrandStore } from '@/shared/store/brandStore';
import { useEffect } from 'react';
import { Presentation, Edit, Folder, Loader2 } from 'lucide-react';

export default function BrandsPage() {
  const navigate = useNavigate();
  const { list: brands, loadAll, isLoading } = useBrandStore();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Brands</h1>
            <p className="text-muted-foreground">
              Manage and organize all your brands in one place.
            </p>
          </div>
          <Button onClick={() => navigate('/onboarding')}>
            Create New Brand
          </Button>
        </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand) => (
              <Card key={brand.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{brand.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {brand.tone || 'Brand toolkit'}
                      </CardDescription>
                    </div>
                    {brand.logo && (
                      <img 
                        src={brand.logo} 
                        alt={brand.name}
                        className="w-12 h-12 object-contain rounded"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    className="w-full gap-2"
                    onClick={() => navigate(`/dashboard/brand/${brand.slug}/guidelines/canvas`)}
                  >
                    <Presentation className="w-4 h-4" />
                    Canvas Editor
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => navigate(`/dashboard/brand/${brand.slug}/edit`)}
                  >
                    <Edit className="w-4 h-4" />
                    Edit Brand
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => navigate(`/dashboard/brand/${brand.slug}/brandkit`)}
                  >
                    <Folder className="w-4 h-4" />
                    Brand Kit
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}