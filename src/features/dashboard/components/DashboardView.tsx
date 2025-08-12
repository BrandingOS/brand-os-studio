import { Plus, Palette, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Section } from '@/shared/components/Section';
import { useDashboard } from '../hooks/useDashboard';

export function DashboardView() {
  const {
    brands,
    isLoading,
    error,
    canCreateMoreBrands,
    mode,
    handleCreateBrand,
    handleViewBrand,
  } = useDashboard();

  if (isLoading && brands.length === 0) {
    return (
      <Section className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your brands...</p>
        </div>
      </Section>
    );
  }

  if (error) {
    return (
      <Section className="min-h-screen flex items-center justify-center">
        <Card className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Brands</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </Card>
      </Section>
    );
  }

  return (
    <Section container={false} className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Brand Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your brand systems and assets
            </p>
          </div>
          <Button
            onClick={handleCreateBrand}
            disabled={!canCreateMoreBrands}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create New Brand
          </Button>
        </div>

        {/* Guest Notice */}
        {mode === 'guest' && brands.length > 0 && (
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
              <Button size="sm" variant="outline" className="ml-auto">
                Sign Up
              </Button>
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
              <Card
                key={brand.id}
                className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
                onClick={() => handleViewBrand(brand.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {brand.name}
                  </h3>
                  <div
                    className="w-6 h-6 rounded-full border border-border"
                    style={{ backgroundColor: brand.primaryColor }}
                  />
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Palette className="h-3 w-3" />
                    <span>{brand.tone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <span>{brand.audience}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(brand.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            ))}

            {/* Create New Card */}
            {canCreateMoreBrands && (
              <Card
                className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border-dashed border-2 border-muted-foreground/25 hover:border-primary/50"
                onClick={handleCreateBrand}
              >
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                  <Plus className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground group-hover:text-primary transition-colors mb-2">
                    Create New Brand
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Start building another brand system
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}