import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Palette, Users, AlertCircle, Briefcase, FileText } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { brandsService } from '@/features/brand/services/brands.local';
import type { Brand } from '@/shared/types/brand';

export function DashboardMain() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      setIsLoading(true);
      const brandList = await brandsService.list();
      setBrands(brandList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brands');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBrand = () => {
    navigate('/onboarding');
  };

  const handleViewBrand = (brandId: string) => {
    navigate(`/dashboard/brand/${brandId}`);
  };

  const handleOpenBrandKit = (brandId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/dashboard/brand/${brandId}/brandkit`);
  };

  const handleOpenGuidelines = (brandId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/dashboard/brand/${brandId}/guidelines`);
  };

  if (isLoading && brands.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <h1 className="text-xl font-semibold">Brand OS Dashboard</h1>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your brands...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <h1 className="text-xl font-semibold">Brand OS Dashboard</h1>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center p-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Brands</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadBrands}>Try Again</Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-xl font-semibold">Brand OS Dashboard</h1>
            <div className="flex items-center gap-4">
              {/* Future: User menu, notifications, etc. */}
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold">Welcome to Brand OS</h2>
            <p className="text-muted-foreground">Manage your brand system from here.</p>
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold">Your Brands</h3>
              <p className="text-muted-foreground mt-1">
                Manage your brand systems and assets
              </p>
            </div>
        <Button
          onClick={handleCreateBrand}
          disabled={brands.length >= 1} // Guest mode limitation
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Brand
        </Button>
      </div>

      {/* Guest Notice */}
      {brands.length > 0 && (
        <Card className="mb-8 p-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Guest Mode - Limited to 1 Brand
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Sign up to create unlimited brands and access advanced features
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Brands Grid */}
      {brands.length === 0 ? (
        <Card className="text-center p-12">
          <Palette className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Brands Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create your first brand to get started with Brand OS. 
            We'll guide you through the setup process step by step.
          </p>
          <Button onClick={handleCreateBrand} className="flex items-center gap-2 mx-auto">
            <Plus className="h-4 w-4" />
            Create Your First Brand
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
              onClick={() => handleViewBrand(brand.id)}
            >
              <Card className="h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                  {brand.name}
                </h3>
                <div
                  className="w-6 h-6 rounded-full border border-border"
                  style={{ backgroundColor: brand.primaryColor }}
                />
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-3 w-3" />
                  <span>{brand.tone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  <span>{brand.audience}</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mb-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={(e) => handleOpenBrandKit(brand.id, e)}
                >
                  <Briefcase className="h-3 w-3 mr-1" />
                  Brand Kit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={(e) => handleOpenGuidelines(brand.id, e)}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Guidelines
                </Button>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(brand.updatedAt).toLocaleDateString()}
                </p>
              </div>
              </Card>
            </div>
          ))}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}