import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '@/shared/ui/Container';
import { Button } from '@/shared/ui/Button';

export default function BrandHomePage() {
  const { brandId } = useParams<{ brandId: string }>();
  const navigate = useNavigate();

  return (
    <Container className="py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Brand Home</h1>
        <p className="text-muted-foreground mb-8">Brand ID: {brandId}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-soft p-6">
            <h2 className="text-xl font-semibold mb-4">Brand Kit</h2>
            <p className="text-muted-foreground mb-4">Access your complete brand toolkit</p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate(`/dashboard/brand/${brandId}/brandkit`)}
            >
              Open Brand Kit
            </Button>
          </div>
          
          <div className="card-soft p-6">
            <h2 className="text-xl font-semibold mb-4">Guidelines</h2>
            <p className="text-muted-foreground mb-4">Manage brand guidelines and docs</p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate(`/dashboard/brand/${brandId}/guidelines`)}
            >
              View Guidelines
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}