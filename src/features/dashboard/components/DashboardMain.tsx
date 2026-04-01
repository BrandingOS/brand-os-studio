import { useDashboard } from '../hooks/useDashboard';
import { AdminPanel } from './AdminPanel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Users, 
  FileText, 
  Palette, 
  ArrowRight, 
  Building2,
  TrendingUp,
  Activity,
  Target,
  Zap,
  Eye,
  MoreHorizontal,
  Edit
} from 'lucide-react';

export function DashboardMain() {
  const {
    brands,
    isLoading,
    error,
    canCreateMoreBrands,
    mode,
    handleCreateBrand,
    handleViewBrand,
  } = useDashboard();

  // Show loading state while brands are being fetched
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="text-destructive mb-4">
          <Activity className="h-12 w-12 mx-auto mb-2" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Error Loading Brands</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Panel - Only for admin users */}
      <AdminPanel />
      
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Brands</p>
              <p className="text-2xl font-bold">{brands.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
              <p className="text-2xl font-bold">{brands.length}</p>
            </div>
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Guidelines</p>
              <p className="text-2xl font-bold">{brands.length}</p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assets</p>
              <p className="text-2xl font-bold">{brands.reduce((sum, b) => sum + (b.assets?.length || 0), 0)}</p>
            </div>
            <Palette className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>
      {/* Brands Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Your Brands</h2>
            <p className="text-muted-foreground">
              Manage and collaborate on your brand systems
            </p>
          </div>
          <Button
            onClick={handleCreateBrand}
            disabled={!canCreateMoreBrands}
            className="flex items-center gap-2"
            size="lg"
          >
            <Plus className="h-4 w-4" />
            Create Brand
          </Button>
        </div>

        {/* Guest Notice */}
        {mode === 'guest' && brands.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/50">
            <div className="p-4 flex items-start gap-3">
              <Zap className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Guest Mode Active
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  You're limited to 1 brand. Sign up to create unlimited brands and access pro features.
                </p>
              </div>
            </div>
          </Card>
        )}

        {brands.length > 0 && (
          <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
            <div className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Quick Access</h3>
                <p className="text-muted-foreground text-sm">
                  Jump straight into editing your brand assets
                </p>
              </div>
              <Button 
                onClick={() => window.open(`/editor/design/${brands[0].id}`, '_blank')}
                className="flex items-center gap-2"
                size="lg"
              >
                <Palette className="h-4 w-4" />
                Open Editor
              </Button>
            </div>
          </Card>
        )}

        {/* Brands Grid */}
        {brands.length === 0 ? (
          <Card className="border-dashed border-2">
            <div className="text-center p-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Create your first brand</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Get started by creating a comprehensive brand system. Our wizard will guide you through each step.
              </p>
              <Button onClick={handleCreateBrand} size="lg" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Start Building
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <Card
                key={brand.id}
                className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-0 shadow-sm"
                onClick={() => handleViewBrand(brand.id)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl border-2 border-white shadow-sm"
                        style={{ backgroundColor: brand.primaryColor }}
                      />
                      <div>
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {brand.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Palette className="h-4 w-4" />
                      <span>{brand.tone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{brand.audience}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm text-muted-foreground">
                      Updated {new Date(brand.updatedAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/dashboard/brand/${brand.slug}/edit`;
                        }}
                        className="text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/editor/design/${brand.id}`, '_blank');
                        }}
                        className="text-xs"
                      >
                        <Palette className="h-3 w-3 mr-1" />
                        Editor
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}