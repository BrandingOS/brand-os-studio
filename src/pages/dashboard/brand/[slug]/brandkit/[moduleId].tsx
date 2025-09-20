import { useParams } from 'react-router-dom';
import { EditorShell } from '@/features/editor';
import { Container } from '@/shared/ui/Container';
import { BrandLayout } from '@/features/brand';

export default function BrandKitModulePage() {
  const { brandId, moduleId } = useParams<{ brandId: string; moduleId: string }>();
  
  if (!brandId || !moduleId) {
    return (
      <BrandLayout>
        <Container className="py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Invalid parameters</p>
          </div>
        </Container>
      </BrandLayout>
    );
  }
  
  return (
    <BrandLayout>
      <EditorShell moduleId={moduleId} brandId={brandId} />
    </BrandLayout>
  );
}