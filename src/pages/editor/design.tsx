import { useParams } from 'react-router-dom';
import { EditorShell } from '@/features/editor/components/EditorShell';

export default function DesignEditorPage() {
  const { brandId } = useParams<{ brandId: string }>();

  if (!brandId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Brand ID Required</h2>
          <p className="text-muted-foreground">Please provide a brand ID to access the design editor.</p>
        </div>
      </div>
    );
  }

  return <EditorShell brandId={brandId} />;
}