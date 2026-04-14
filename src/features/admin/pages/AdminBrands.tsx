import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { adminService, type AdminBrand } from '../services/adminService';
import { Search, Trash2, Globe, GlobeLock, ExternalLink, Loader2, Palette } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBrands() {
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    adminService.getBrands()
      .then(setBrands)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleTogglePublic = async (brand: AdminBrand) => {
    setActionLoading(brand.id);
    try {
      await adminService.toggleBrandPublic(brand.id, !brand.isPublic);
      setBrands((prev) => prev.map((b) => b.id === brand.id ? { ...b, isPublic: !b.isPublic } : b));
      toast.success(`${brand.name} is now ${!brand.isPublic ? 'public' : 'private'}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (brand: AdminBrand) => {
    if (!confirm(`Delete brand "${brand.name}"? This will delete all its assets, comments, and approvals.`)) return;
    setActionLoading(brand.id);
    try {
      await adminService.deleteBrand(brand.id);
      setBrands((prev) => prev.filter((b) => b.id !== brand.id));
      toast.success(`Deleted ${brand.name}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.slug.toLowerCase().includes(search.toLowerCase()) ||
    (b.userEmail || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="h-6 w-6" /> Brands
        </h1>
        <p className="text-muted-foreground mt-1">{brands.length} total brands across all workspaces</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search brands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Brand</th>
                  <th className="text-left px-4 py-3 font-medium">Owner</th>
                  <th className="text-left px-4 py-3 font-medium">Workspace</th>
                  <th className="text-left px-4 py-3 font-medium">Visibility</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((brand) => (
                  <tr key={brand.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-lg"
                          style={{ backgroundColor: brand.primaryColor }}
                        />
                        <div>
                          <span className="font-medium">{brand.name}</span>
                          <p className="text-xs text-muted-foreground">/{brand.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{brand.userEmail || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{brand.workspaceName || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={brand.isPublic ? 'default' : 'secondary'}>
                        {brand.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(brand.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={`/b/${brand.slug}`} target="_blank" rel="noopener">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePublic(brand)}
                          disabled={actionLoading === brand.id}
                          title={brand.isPublic ? 'Make private' : 'Make public'}
                        >
                          {brand.isPublic ? <GlobeLock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(brand)}
                          disabled={actionLoading === brand.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {search ? 'No brands match your search' : 'No brands yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
