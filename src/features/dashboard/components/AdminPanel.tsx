import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getAdminBrandService } from '@/shared/services/brandService';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import type { Brand } from '@/shared/types/brand';
import { Trash2, Users, Building } from 'lucide-react';

export function AdminPanel() {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const isAdmin = user?.email === 'hamza2007ezzat@gmail.com';

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
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Admin Panel - All Brands</h2>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">Loading all brands...</div>
        ) : brands.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No brands found in database
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <Card key={brand.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">{brand.name}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteBrand(brand.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border" 
                      style={{ backgroundColor: brand.primaryColor }}
                    />
                    Primary: {brand.primaryColor}
                  </div>
                  {brand.secondaryColor && (
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border" 
                        style={{ backgroundColor: brand.secondaryColor }}
                      />
                      Secondary: {brand.secondaryColor}
                    </div>
                  )}
                  <div>Tone: {brand.tone}</div>
                  <div>Audience: {brand.audience}</div>
                  <div>Created: {brand.createdAt.toLocaleDateString()}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}