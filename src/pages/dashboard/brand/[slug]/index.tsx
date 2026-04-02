import { useParams, useNavigate } from 'react-router-dom';
import { BrandLayout } from '@/features/brand';
import { TeamPanel } from '@/features/collaboration';
import { SharePanel } from '@/features/brand/components/SharePanel';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { services } from '@/shared/services/registry';
import type { Brand } from '@/shared/types/brand';
import {
  Briefcase, FileText, Edit, Presentation, Image, BookOpen,
  CreditCard, Square, QrCode, Play
} from 'lucide-react';

const quickActions = [
  { label: 'Brand Kit', icon: Briefcase, path: 'brandkit', gradient: 'from-violet-500 to-purple-600' },
  { label: 'Guidelines', icon: FileText, path: 'guidelines/canvas', gradient: 'from-pink-500 to-rose-600' },
  { label: 'Edit Brand', icon: Edit, path: 'edit', gradient: 'from-blue-500 to-blue-600' },
  { label: 'Logo Files', icon: Image, path: 'brandkit/logo-files', gradient: 'from-cyan-500 to-blue-500' },
  { label: 'Brand Guides', icon: BookOpen, path: 'brandkit/brand-guides', gradient: 'from-pink-500 to-rose-500' },
  { label: 'Business Cards', icon: CreditCard, path: 'brandkit/business-cards', gradient: 'from-indigo-500 to-blue-600' },
  { label: 'Instagram', icon: Square, path: 'brandkit/instagram-posts', gradient: 'from-teal-400 to-cyan-500' },
  { label: 'QR Code', icon: QrCode, path: 'brandkit/qr-code', gradient: 'from-blue-400 to-blue-600' },
  { label: 'Animations', icon: Play, path: 'brandkit/animations', gradient: 'from-orange-500 to-amber-500' },
  { label: 'Presentations', icon: Presentation, path: 'brandkit/presentations', gradient: 'from-purple-500 to-violet-600' },
];

export default function BrandHomePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  const handleBrandUpdate = async (patch: Partial<Brand>) => {
    if (!brand) return;
    await services.brands.update(brand.id, patch);
  };

  if (isLoading) {
    return (
      <BrandLayout brandName="Loading...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </BrandLayout>
    );
  }

  if (error || !brand) {
    return (
      <BrandLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Brand Not Found</h3>
            <p className="text-muted-foreground mb-4">{error || 'Could not load brand.'}</p>
            <button onClick={() => navigate('/dashboard/brands')} className="text-sm text-primary hover:underline">
              Back to My Brands
            </button>
          </div>
        </div>
      </BrandLayout>
    );
  }

  return (
    <BrandLayout brandName={brand.name}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Brand Header */}
        <div className="mb-8 flex items-center gap-4">
          {brand.logo ? (
            <div className="w-14 h-14 rounded-xl bg-muted/30 flex items-center justify-center p-2 overflow-hidden">
              <img src={brand.logo} alt={brand.name} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ backgroundColor: brand.primaryColor }}>
              {brand.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{brand.name}</h1>
            <p className="text-sm text-muted-foreground">{brand.tone || 'Configure your brand identity'}</p>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(`/dashboard/brand/${slug}/${action.path}`)}
              className="group relative rounded-xl p-4 text-left transition-all overflow-hidden hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-90`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
              <div className="relative z-10">
                <action.icon className="h-5 w-5 text-white mb-2" />
                <p className="text-white text-xs font-medium">{action.label}</p>
              </div>
              <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-white/10" />
            </button>
          ))}
        </div>

        {/* Brand Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Brand Colors</p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: brand.primaryColor }} />
              {brand.secondaryColor && (
                <div className="w-6 h-6 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: brand.secondaryColor }} />
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Primary Font</p>
            <p className="text-sm font-semibold truncate">{brand.fonts.primary}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Assets</p>
            <p className="text-sm font-semibold">{brand.assets?.length || 0} files</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Visibility</p>
            <p className="text-sm font-semibold">{brand.isPublic ? 'Public' : 'Private'}</p>
          </div>
        </div>

        {/* Share & Team */}
        <div className="space-y-6">
          <SharePanel brand={brand} onUpdate={handleBrandUpdate} />
          <TeamPanel brandId={slug ?? ''} brandName={brand.name} />
        </div>
      </div>
    </BrandLayout>
  );
}
