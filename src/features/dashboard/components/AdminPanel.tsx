import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Brand } from '@/shared/types/brand';
import { Trash2, Users, Building, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export function AdminPanel() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'brands' | 'users'>('brands');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      // Load all brands (admin can see all due to RLS policy)
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('*')
        .order('created_at', { ascending: false });

      if (brandsError) {
        console.error('Error loading brands:', brandsError);
        toast.error('Failed to load brands');
      } else {
        // Map database brands to Brand type
        const mappedBrands: Brand[] = (brandsData || []).map(brand => ({
          id: brand.id,
          slug: brand.slug,
          name: brand.name,
          primaryColor: brand.primary_color,
          secondaryColor: brand.secondary_color,
          logo: brand.logo_url,
          tone: brand.tone,
          audience: brand.audience,
          fonts: brand.fonts as { primary: string; secondary?: string } || { primary: 'Inter' },
          assets: [], // Default empty assets
          createdAt: new Date(brand.created_at),
          updatedAt: new Date(brand.updated_at),
          userId: brand.user_id
        }));
        setBrands(mappedBrands);
      }

      // Load all user profiles (admin can see all due to RLS policy)
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error loading users:', usersError);
        toast.error('Failed to load users');
      } else {
        setUsers(usersData || []);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;
    
    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId);

      if (error) throw error;
      
      setBrands(prev => prev.filter(b => b.id !== brandId));
      toast.success('Brand deleted successfully');
    } catch (error) {
      console.error('Failed to delete brand:', error);
      toast.error('Failed to delete brand');
    }
  };

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

          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6">
            <Button
              variant={activeTab === 'brands' ? 'default' : 'outline'}
              onClick={() => setActiveTab('brands')}
              className="flex items-center gap-2"
            >
              <Building className="h-4 w-4" />
              All Brands ({brands.length})
            </Button>
            <Button
              variant={activeTab === 'users' ? 'default' : 'outline'}
              onClick={() => setActiveTab('users')}
              className="flex items-center gap-2"
            >
              <UserCheck className="h-4 w-4" />
              All Users ({users.length})
            </Button>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-destructive mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading admin data...</p>
            </div>
          ) : activeTab === 'brands' ? (
            brands.length === 0 ? (
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
                        <span className="font-medium">
                          {new Date(brand.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )
          ) : (
            // Users tab
            users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found in database</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {users.map((user) => (
                  <Card key={user.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCheck className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{user.full_name || 'No Name'}</h3>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>User ID:</span>
                        <span className="font-medium">{user.id.slice(0, 8)}...</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Joined:</span>
                        <span className="font-medium">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}
        </div>
      </Card>
    </div>
  );
}