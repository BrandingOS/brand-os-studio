import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BrandLayout } from '@/features/brand/components/BrandLayout';
import { BrandBoard } from '@/features/brand/components/BrandBoard';
import { LogoUploader } from '@/features/brand/components/LogoUploader';
import { ColorPaletteEditor } from '@/features/brand/components/ColorPaletteEditor';
import { FontSelector } from '@/features/brand/components/FontSelector';
import { IconGallery } from '@/features/brand/components/IconGallery';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Save } from 'lucide-react';
import { useBrandStore } from '@/shared/store/brandStore';
import { useToast } from '@/hooks/use-toast';
import { Brand } from '@/shared/types/brand';

export default function BrandEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const { current: brand, loadBySlug, update, isLoading } = useBrandStore();
  const [previewMode, setPreviewMode] = useState(false);
  const [editedBrand, setEditedBrand] = useState<Brand | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (slug) {
      loadBySlug(slug);
    }
  }, [slug, loadBySlug]);

  useEffect(() => {
    if (brand) {
      setEditedBrand(brand);
    }
  }, [brand]);

  const handleSave = async () => {
    if (!editedBrand || !brand) return;

    try {
      await update(brand.id, {
        guidelines: editedBrand.guidelines,
        fonts: editedBrand.fonts,
      });

      toast({
        title: 'Changes saved',
        description: 'Your brand has been updated successfully.'
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (isLoading || !editedBrand) {
    return (
      <BrandLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-lg font-medium">Loading brand...</div>
          </div>
        </div>
      </BrandLayout>
    );
  }

  return (
    <BrandLayout brandName={brand?.name}>
      <div className="space-y-6">
        {/* Header with Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Brand Editor</h1>
            <p className="text-muted-foreground mt-1">
              Edit your brand identity and see live preview
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} variant="default">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Mode
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Mode
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Split View Layout */}
        <div className={`grid gap-6 transition-all duration-300 ${previewMode ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
          {/* Left Panel - Editor */}
          {!previewMode && (
            <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)] pr-2">
              <LogoUploader
                brandId={editedBrand.id}
                logoSystem={editedBrand.guidelines?.logoSystem || {}}
                onLogoSystemChange={(logoSystem) => 
                  setEditedBrand({ 
                    ...editedBrand, 
                    guidelines: { ...(editedBrand.guidelines || {}), logoSystem }
                  })
                }
              />

              <ColorPaletteEditor
                colorPalette={editedBrand.guidelines?.colorPalette || {}}
                onColorPaletteChange={(colorPalette) => 
                  setEditedBrand({ 
                    ...editedBrand, 
                    guidelines: { ...(editedBrand.guidelines || {}), colorPalette }
                  })
                }
              />

              <FontSelector
                fonts={editedBrand.fonts}
                onFontsChange={(fonts) => setEditedBrand({ 
                  ...editedBrand, 
                  fonts: { 
                    primary: fonts.primary || editedBrand.fonts.primary,
                    secondary: fonts.secondary || editedBrand.fonts.secondary
                  }
                })}
              />

              <IconGallery />
            </div>
          )}

          {/* Right Panel - Preview */}
          <div className={`overflow-y-auto max-h-[calc(100vh-12rem)] ${previewMode ? 'mx-auto max-w-4xl w-full' : ''}`}>
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 mb-4 border-b">
              <div className="text-sm font-medium text-muted-foreground">
                Live Preview
              </div>
            </div>
            <BrandBoard brand={editedBrand} />
          </div>
        </div>
      </div>
    </BrandLayout>
  );
}
