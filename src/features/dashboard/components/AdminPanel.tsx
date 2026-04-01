import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getAdminBrandService } from '@/shared/services/brandService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Brand } from '@/shared/types/brand';
import { Trash2, Users, Building } from 'lucide-react';

export function AdminPanel() {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadAllBrands();
    }
  }, [isAdmin]);

  const loadAllBrands = async () => {
    setIsLoading(true);
    try {
      const adminService = getAdminBrandService();
      const allBrands = await adminService.getAllBrands();
      setBrands(allBrands);
    } catch (error) {
      console.error('Failed to load all brands:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;
    
    try {
      const adminService = getAdminBrandService();
      await adminService.delete(brandId);
      setBrands(prev => prev.filter(b => b.id !== brandId));
    } catch (error) {
      console.error('Failed to delete brand:', error);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mb-8">
      <Card className="border-destructive/20 bg-destructive/5">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Administration Panel</h2>
              <p className="text-sm text-muted-foreground">Manage all system brands and users</p>
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-destructive mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading all brands...</p>
            </div>
          ) : brands.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No brands found in database</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {brands.map((brand) => (
                <Card key={brand.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg border-2 border-white shadow-sm"
                        style={{ backgroundColor: brand.primaryColor }}
                      />
                      <div>
                        <h3 className="font-medium">{brand.name}</h3>
                        <p className="text-xs text-muted-foreground">ID: {brand.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBrand(brand.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Tone:</span>
                      <span className="font-medium">{brand.tone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Audience:</span>
                      <span className="font-medium">{brand.audience}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Created:</span>
                      <span className="font-medium">{brand.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}