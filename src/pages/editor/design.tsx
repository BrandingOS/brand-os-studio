import { useParams } from 'react-router-dom';
import { DesignEditor } from '@/features/editor';
import { useBrandStore } from '@/shared/store/brandStore';
import { useEffect } from 'react';
import { demoBrandIdentity } from '@/data/demo';

export default function DesignEditorPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const { current: brand, loadById, isLoading, setCurrent } = useBrandStore();

  useEffect(() => {
    if (brandId) {
      // Handle demo brand
      if (brandId === 'demo-brand-1') {
        setCurrent(demoBrandIdentity);
      } else {
        loadById(brandId);
      }
    }
  }, [brandId, loadById, setCurrent]);

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

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Brand Not Found</h2>
          <p className="text-muted-foreground">The requested brand could not be loaded.</p>
        </div>
      </div>
    );
  }

  return <DesignEditor brand={brand} brandId={brandId} />;
}