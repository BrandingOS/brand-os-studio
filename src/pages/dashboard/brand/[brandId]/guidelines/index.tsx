import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '@/shared/ui/Container';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';

const GUIDELINE_DOCS = [
  { id: 'brand-strategy', name: 'Brand Strategy', description: 'Core brand positioning and values' },
  { id: 'logo-system', name: 'Logo System', description: 'Logo usage and variations' },
  { id: 'color-palette', name: 'Color Palette', description: 'Brand color definitions and usage' },
  { id: 'typography', name: 'Typography', description: 'Font selections and hierarchy' },
  { id: 'voice-tone', name: 'Voice & Tone', description: 'Brand communication guidelines' },
  { id: 'applications', name: 'Applications', description: 'Brand implementation examples' },
];

export default function GuidelinesHubPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const navigate = useNavigate();

  return (
    <Container className="py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Brand Guidelines</h1>
          <p className="text-muted-foreground">Comprehensive brand documentation</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GUIDELINE_DOCS.map((doc) => (
            <Card key={doc.id} className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold mb-2">{doc.name}</h3>
              <p className="text-muted-foreground mb-4 text-sm">{doc.description}</p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate(`/dashboard/brand/${brandId}/guidelines/${doc.id}`)}
              >
                View Document
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </Container>
  );
}