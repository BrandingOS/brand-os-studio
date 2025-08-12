import { useParams } from 'react-router-dom';
import { EditorShell } from '@/features/editor';
import { Container } from '@/shared/ui/Container';

export default function BrandKitModulePage() {
  const { brandId, moduleId } = useParams<{ brandId: string; moduleId: string }>();
  
  if (!brandId || !moduleId) {
    return (
      <Container className="py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Invalid parameters</p>
        </div>
      </Container>
    );
  }
  
  return <EditorShell moduleId={moduleId} brandId={brandId} />;
}