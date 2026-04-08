import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BrandLayout } from '@/features/brand/components/BrandLayout';
import { BrandBoard } from '@/features/brand/components/BrandBoard';
import { LogoUploader } from '@/features/brand/components/LogoUploader';
import { ColorPaletteEditor } from '@/features/brand/components/ColorPaletteEditor';
import { FontSelector } from '@/features/brand/components/FontSelector';
import { IconGallery } from '@/features/brand/components/IconGallery';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/shared/ui/PageHeader';
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
    <BrandLayout brandName={brand?.name} maxWidth="7xl">
      <PageHeader
        title="Setup"
        subtitle="Edit this brand's identity — logos, colors, type — with a live preview."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? (
                <>
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit Mode
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Preview Mode
                </>
              )}
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Changes
            </Button>
          </>
        }
      />

      <div
        className={`grid gap-6 transition-all duration-300 ${
          previewMode ? 'grid-cols-1' : 'lg:grid-cols-[65%_35%]'
        }`}
      >
        {/* Left Panel — Editor Grid */}
        {!previewMode && (
          <div className="space-y-6 min-w-0">
            <LogoUploader
              brandId={editedBrand.id}
              logoSystem={editedBrand.guidelines?.logoSystem || {}}
              onLogoSystemChange={(logoSystem) => {
                const updated = {
                  ...editedBrand,
                  guidelines: { ...(editedBrand.guidelines || {}), logoSystem },
                };
                setEditedBrand(updated);
                update(editedBrand.id, { guidelines: updated.guidelines });
              }}
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ColorPaletteEditor
                colorPalette={editedBrand.guidelines?.colorPalette || {}}
                onColorPaletteChange={(colorPalette) => {
                  const updated = {
                    ...editedBrand,
                    guidelines: { ...(editedBrand.guidelines || {}), colorPalette },
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

            <IconGallery />
          </div>
        )}

        {/* Right Panel — Live Preview */}
        <div className={previewMode ? 'mx-auto max-w-5xl w-full' : 'min-w-0'}>
          <div className={!previewMode ? 'sticky top-4' : ''}>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
                <h3 className="text-sm font-medium text-foreground">Live Preview</h3>
                <span className="text-xs text-muted-foreground">Updates in real-time</span>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-16rem)]">
                <BrandBoard brand={editedBrand} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrandLayout>
  );
}
