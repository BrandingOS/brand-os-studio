import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Container } from '@/shared/ui/Container';
import { Button } from '@/shared/ui/Button';
import { BrandLayout } from '@/features/brand';
import { TeamPanel } from '@/features/collaboration';
import { SharePanel } from '@/features/brand/components/SharePanel';
import { brandsService } from '@/features/brand/services/brands.local';
import type { Brand } from '@/shared/types/brand';

export default function BrandHomePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [brand, setBrand] = useState<Brand | null>(null);

  useEffect(() => {
    if (!slug) return;
    brandsService.getBySlug(slug).then(setBrand);
  }, [slug]);

  const handleBrandUpdate = (patch: Partial<Brand>) => {
    if (!brand) return;
    brandsService.update(brand.id, patch).then(setBrand);
  };

  return (
    <BrandLayout>
      <Container className="py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Brand Home</h1>
          <p className="text-muted-foreground mb-8">Brand Slug: {slug}</p>
          
          {/* Featured: Canvas Editor */}
          <div className="card-soft p-8 mb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">Guidelines</h2>
                <p className="text-muted-foreground mb-4">Create stunning brand guidelines with our modern slide-based editor. Build, customize, and export professional presentations.</p>
                <Button 
                  onClick={() => navigate(`/dashboard/brand/${slug}/guidelines/canvas`)}
                  size="lg"
                  className="gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Open Guidelines
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-soft p-6">
              <h2 className="text-xl font-semibold mb-4">Brand Editor</h2>
              <p className="text-muted-foreground mb-4">Edit your brand identity and assets</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/dashboard/brand/${slug}/edit`)}
              >
                Open Brand Editor
              </Button>
            </div>
            
            <div className="card-soft p-6">
              <h2 className="text-xl font-semibold mb-4">Brand Kit</h2>
              <p className="text-muted-foreground mb-4">Access your complete brand toolkit</p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate(`/dashboard/brand/${slug}/brandkit`)}
              >
                Open Brand Kit
              </Button>
            </div>
            
            <div className="card-soft p-6">
              <h2 className="text-xl font-semibold mb-4">Slide Editor</h2>
              <p className="text-muted-foreground mb-4">Build guidelines as a slide presentation</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/dashboard/brand/${slug}/guidelines`)}
              >
                Open Slide Editor
              </Button>
            </div>
          </div>

          {/* Share & Visibility */}
          {brand && (
            <div className="mt-8">
              <SharePanel brand={brand} onUpdate={handleBrandUpdate} />
            </div>
          )}

          {/* Team Collaboration */}
          <div className="mt-8">
            <TeamPanel brandId={slug ?? ''} brandName={brand?.name ?? `Brand ${slug}`} />
          </div>
        </div>
      </Container>
    </BrandLayout>
  );
}