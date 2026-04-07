import { useParams, useNavigate } from 'react-router-dom';
import { BrandLayout } from '@/features/brand';
import { TeamPanel } from '@/features/collaboration';
import { SharePanel } from '@/features/brand/components/SharePanel';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useBrandStore } from '@/shared/store/brandStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import type { Brand } from '@/shared/types/brand';
import {
  Briefcase, FileText, Edit, Presentation, Image, BookOpen,
  CreditCard, Square, QrCode, Play
} from 'lucide-react';

// Quick actions on the brand overview lead into the new five-section IA.
// Each card maps to one of the canonical sections (Identity, Assets,
// Guidelines, Share) — see docs/ux-redesign/ARCHITECTURE.md §3.
//
// Legacy direct entries to specific brandkit modules were removed in
// Stage 10: they duplicated the Identity and Assets hubs. The single
// "Brand Guides" duplicate was also removed (Guidelines covers it).
const quickActions = [
  { label: 'Identity', icon: Edit, path: 'identity', gradient: 'from-blue-500 to-blue-600' },
  { label: 'Assets', icon: Briefcase, path: 'assets', gradient: 'from-violet-500 to-purple-600' },
  { label: 'Guidelines', icon: BookOpen, path: 'guidelines', gradient: 'from-rose-500 to-pink-600' },
  { label: 'Share', icon: Presentation, path: 'share', gradient: 'from-emerald-500 to-teal-600' },
  { label: 'Logo Files', icon: Image, path: 'identity?tab=logo', gradient: 'from-cyan-500 to-blue-500' },
  { label: 'Business Cards', icon: CreditCard, path: 'brandkit/business-cards', gradient: 'from-indigo-500 to-blue-600' },
  { label: 'Instagram', icon: Square, path: 'brandkit/instagram-posts', gradient: 'from-teal-400 to-cyan-500' },
  { label: 'QR Code', icon: QrCode, path: 'brandkit/qr-code', gradient: 'from-blue-400 to-blue-600' },
  { label: 'Animations', icon: Play, path: 'brandkit/animations', gradient: 'from-orange-500 to-amber-500' },
  { label: 'Presentations', icon: Presentation, path: 'presentations', gradient: 'from-purple-500 to-violet-600' },
];

export default function BrandHomePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);
  const updateBrand = useBrandStore((s) => s.update);

  const handleBrandUpdate = async (patch: Partial<Brand>) => {
    if (!brand) return;
    await updateBrand(brand.id, patch);
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
    <BrandLayout brandName={brand.name} maxWidth="5xl">
      <div>
        <PageHeader
          breadcrumb={[{ label: 'Brands', to: '/dashboard/brands' }]}
          eyebrow={
            brand.logo ? (
              <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center p-1.5 overflow-hidden">
                <img src={brand.logo} alt={brand.name} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold text-white"
                style={{ backgroundColor: brand.primaryColor }}
              >
                {brand.name.charAt(0)}
              </div>
            )
          }
          title={brand.name}
          subtitle={brand.tone || 'Configure your brand identity'}
        />

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

        {/* Brand Identity Summary */}
        {brand.guidelines?.strategy && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {brand.guidelines.strategy.mission && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Mission</h3>
                <p className="text-sm text-foreground leading-relaxed">{brand.guidelines.strategy.mission}</p>
              </div>
            )}
            {brand.guidelines.strategy.positioning && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Positioning</h3>
                <p className="text-sm text-foreground leading-relaxed">{brand.guidelines.strategy.positioning}</p>
              </div>
            )}
            {brand.guidelines.strategy.values && brand.guidelines.strategy.values.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Values</h3>
                <div className="flex flex-wrap gap-1.5">
                  {brand.guidelines.strategy.values.map((v) => (
                    <span key={v} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{v}</span>
                  ))}
                </div>
              </div>
            )}
            {brand.guidelines.voiceAndTone?.toneAttributes && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Voice & Tone</h3>
                <div className="flex flex-wrap gap-1.5">
                  {brand.guidelines.voiceAndTone.toneAttributes.map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Share & Team */}
        <div className="space-y-6">
          <SharePanel brand={brand} onUpdate={handleBrandUpdate} />
          <TeamPanel brandId={slug ?? ''} brandName={brand.name} />
        </div>
      </div>
    </BrandLayout>
  );
}
