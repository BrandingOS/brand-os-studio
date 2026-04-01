import { useState, useEffect } from 'react';
import { OptimizedDesignEditor } from './OptimizedDesignEditor';
import { WelcomeTutorial } from './WelcomeTutorial';
import { services } from '@/shared/services/registry';
import { isUuid } from '@/shared/utils/slug';
import type { Brand } from '@/shared/types/brand';

interface EditorShellProps {
  moduleId?: string;
  brandId?: string;
  brandSlug?: string;
}

export function EditorShell({ moduleId, brandId, brandSlug }: EditorShellProps) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  const identifier = brandSlug || brandId;

  useEffect(() => {
    if (identifier) {
      loadBrand();
    }
  }, [identifier]);

  const loadBrand = async () => {
    try {
      setIsLoading(true);
      let brandData: Brand | null = null;
      if (brandId && isUuid(brandId)) {
        brandData = await services.brands.getById(brandId);
      } else if (identifier) {
        brandData = await services.brands.getBySlug(identifier);
      }
      setBrand(brandData);

      // Show tutorial for first-time users of this brand
      const tutorialKey = `editor-tutorial-${identifier}`;
      const hasSeenTutorial = localStorage.getItem(tutorialKey);
      if (!hasSeenTutorial) {
        setShowTutorial(true);
      }
    } catch (error) {
      console.error('Failed to load brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem(`editor-tutorial-${identifier}`, 'seen');
  };

  if (!identifier) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Brand ID Required</h2>
          <p className="text-muted-foreground">Please provide a brand ID to access the editor.</p>
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

  return (
    <>
      <OptimizedDesignEditor brand={brand} brandId={brand.id || identifier!} />
      {showTutorial && (
        <WelcomeTutorial 
          onClose={handleCloseTutorial}
          brandName={brand.name}
        />
      )}
    </>
  );
}