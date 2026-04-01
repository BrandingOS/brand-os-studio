import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '@/shared/ui/Container';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { BrandLayout } from '@/features/brand';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { ArrowLeft } from 'lucide-react';

const BRAND_KIT_MODULES = [
  { id: 'business-cards', name: 'Business Cards', description: 'Professional business card designs' },
  { id: 'letterhead', name: 'Letterhead', description: 'Corporate letterhead templates' },
  { id: 'social-media', name: 'Social Media', description: 'Social media templates and assets' },
  { id: 'presentations', name: 'Presentations', description: 'Presentation templates' },
  { id: 'web-assets', name: 'Web Assets', description: 'Digital assets for web use' },
  { id: 'print-collateral', name: 'Print Collateral', description: 'Brochures, flyers, and more' },
];

export default function BrandKitHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  if (isLoading) {
    return (
      <BrandLayout>
        <Container className="py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading brand kit...</p>
            </div>
          </div>
        </Container>
      </BrandLayout>
    );
  }

  if (error || !brand) {
    return (
      <BrandLayout>
        <Container className="py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Brand Not Found</h3>
              <p className="text-muted-foreground mb-4">{error || 'The requested brand could not be found.'}</p>
              <Button onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </Container>
      </BrandLayout>
    );
  }

  return (
    <BrandLayout>
      <Container className="py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Brand Kit</h1>
            <p className="text-muted-foreground">Generate and customize branded materials</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BRAND_KIT_MODULES.map((module) => (
              <Card key={module.id} className="p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold mb-2">{module.name}</h3>
                <p className="text-muted-foreground mb-4 text-sm">{module.description}</p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate(`/dashboard/brand/${slug}/brandkit/${module.id}`)}
                >
                  Open Module
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </BrandLayout>
  );
}