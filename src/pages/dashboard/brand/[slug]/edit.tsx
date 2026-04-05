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
      // Seed colorPalette from top-level brand colors when guidelines.colorPalette is missing
      const colorPalette = brand.guidelines?.colorPalette;
      const hasPaletteColors = colorPalette?.primary?.hex || colorPalette?.secondary?.hex;
      if (!hasPaletteColors && (brand.primaryColor || brand.secondaryColor)) {
        setEditedBrand({
          ...brand,
          guidelines: {
            ...(brand.guidelines || {}),
            colorPalette: {
              ...(colorPalette || {}),
              primary: {
                hex: brand.primaryColor || '#000000',
                name: 'Primary',
                rgb: '',
                cmyk: '',
                usage: 'Primary brand color',
                ...(colorPalette?.primary || {}),
                ...(!colorPalette?.primary?.hex ? { hex: brand.primaryColor || '#000000' } : {}),
              },
              secondary: {
                hex: brand.secondaryColor || '#666666',
                name: 'Secondary',
                rgb: '',
                cmyk: '',
                usage: 'Secondary brand color',
                ...(colorPalette?.secondary || {}),
                ...(!colorPalette?.secondary?.hex ? { hex: brand.secondaryColor || '#666666' } : {}),
              },
            },
          },
        });
      } else {
        setEditedBrand(brand);
      }
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
      <div className="min-h-screen brand-editor-bg">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Brand Editor</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Edit your brand identity and see live preview
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleSave} variant="default" size="lg" className="shadow-sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setPreviewMode(!previewMode)}
                  className="shadow-sm"
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
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1400px] mx-auto px-8 py-8">
          <div className={`grid gap-6 transition-all duration-300 ${previewMode ? 'grid-cols-1' : 'lg:grid-cols-[65%_35%]'}`}>
            {/* Left Panel - Editor Grid */}
            {!previewMode && (
              <div className="space-y-6">
                {/* Logos Section */}
                <LogoUploader
                  brandId={editedBrand.id}
                  logoSystem={editedBrand.guidelines?.logoSystem || {}}
                  onLogoSystemChange={(logoSystem) => {
                    const updated = {
                      ...editedBrand,
                      guidelines: { ...(editedBrand.guidelines || {}), logoSystem }
                    };
                    setEditedBrand(updated);
                    // Auto-save logo changes immediately
                    update(editedBrand.id, { guidelines: updated.guidelines });
                  }}
                />

                {/* Colors & Typography Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <ColorPaletteEditor
                    colorPalette={editedBrand.guidelines?.colorPalette || {}}
                    onColorPaletteChange={(colorPalette) => {
                      const updated = {
                        ...editedBrand,
                        guidelines: { ...(editedBrand.guidelines || {}), colorPalette }
                      };
                      setEditedBrand(updated);
                      update(editedBrand.id, { guidelines: updated.guidelines });
                    }}
                  />

                  <FontSelector
                    fonts={editedBrand.fonts || { primary: 'Inter', secondary: 'Inter' }}
                    onFontsChange={(fonts) => {
                      const updatedFonts = {
                        primary: fonts.primary || editedBrand.fonts?.primary || 'Inter',
                        secondary: fonts.secondary || editedBrand.fonts?.secondary || 'Inter',
                      };
                      setEditedBrand({ ...editedBrand, fonts: updatedFonts });
                      update(editedBrand.id, { fonts: updatedFonts });
                    }}
                  />
                </div>

                {/* Iconography Section */}
                <IconGallery />
              </div>
            )}

            {/* Right Panel - Sticky Preview */}
            <div className={`${previewMode ? 'mx-auto max-w-5xl w-full' : ''}`}>
              <div className={`${!previewMode ? 'sticky top-24' : ''}`}>
                <div className="brand-card p-6">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-600">Live Preview</h3>
                    <div className="text-xs text-gray-400">Updates in real-time</div>
                  </div>
                  <div className="overflow-y-auto max-h-[calc(100vh-16rem)]">
                    <BrandBoard brand={editedBrand} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrandLayout>
  );
}
