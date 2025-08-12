import { useParams, useSearchParams } from 'react-router-dom';
import { Container } from '@/shared/ui/Container';
import { Button } from '@/shared/ui/Button';
import { ArrowLeft } from 'lucide-react';

export default function GuidelineDocPage() {
  const { brandId, docId } = useParams<{ brandId: string; docId: string }>();
  const [searchParams] = useSearchParams();
  const slide = searchParams.get('slide');

  const docName = docId?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <Container className="py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-4"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Guidelines
          </Button>
          
          <h1 className="text-3xl font-bold mb-2">{docName}</h1>
          <p className="text-muted-foreground">
            Brand ID: {brandId} | Document: {docId}
            {slide && ` | Slide: ${slide}`}
          </p>
        </div>
        
        <div className="card-soft p-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">Guideline Document Content</h2>
            <p className="text-muted-foreground">
              This is a placeholder for the {docName} document content.
              {slide && ` Currently viewing slide ${slide}.`}
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}