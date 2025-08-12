import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '@/shared/ui/Container';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';

const BRAND_KIT_MODULES = [
  { id: 'business-cards', name: 'Business Cards', description: 'Professional business card designs' },
  { id: 'letterhead', name: 'Letterhead', description: 'Corporate letterhead templates' },
  { id: 'social-media', name: 'Social Media', description: 'Social media templates and assets' },
  { id: 'presentations', name: 'Presentations', description: 'Presentation templates' },
  { id: 'web-assets', name: 'Web Assets', description: 'Digital assets for web use' },
  { id: 'print-collateral', name: 'Print Collateral', description: 'Brochures, flyers, and more' },
];

export default function BrandKitHubPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const navigate = useNavigate();

  return (
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
                onClick={() => navigate(`/dashboard/brand/${brandId}/brandkit/${module.id}`)}
              >
                Open Module
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </Container>
  );
}