import { useParams } from 'react-router-dom';
import { EditorShell } from '@/features/editor';
import { Container } from '@/shared/ui/Container';

export default function BrandKitModulePage() {
  const { brandId, moduleId } = useParams<{ brandId: string; moduleId: string }>();

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {moduleId?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </h1>
        <p className="text-muted-foreground">Brand ID: {brandId} | Module: {moduleId}</p>
      </div>
      
      <EditorShell moduleId={moduleId} brandId={brandId} />
    </Container>
  );
}