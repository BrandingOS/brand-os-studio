import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { BrandBoard } from '@/features/brand/components/BrandBoard';
import { LogoUploader } from '@/features/brand/components/LogoUploader';
import { ColorPaletteEditor } from '@/features/brand/components/ColorPaletteEditor';
import { FontSelector } from '@/features/brand/components/FontSelector';
import { IconGallery } from '@/features/brand/components/IconGallery';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useActiveAnchor, type InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import { useAutoSave, SaveStateIndicator } from '@/features/editor/core';
import { Eye, Edit, Wrench, Image as ImageIcon, Palette, Type, Shapes, Sparkles } from 'lucide-react';
import { useBrandStore } from '@/shared/store/brandStore';
import { Brand } from '@/shared/types/brand';

const SETUP_ANCHORS = ['logos', 'colors', 'typography', 'iconography'];

export default function BrandEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const { current: brand, loadBySlug, update, isLoading } = useBrandStore();
  const [previewMode, setPreviewMode] = useState(false);
  const [editedBrand, setEditedBrand] = useState<Brand | null>(null);
  const activeAnchor = useActiveAnchor(SETUP_ANCHORS);

  const innerNav = useMemo<InnerNavConfig>(() => ({
    title: 'Setup',
    icon: Wrench,
    storageKey: 'brandos:setup-nav-open',
    activeAnchor,
    groups: [
      {
        id: 'sections',
        label: 'On this page',
        items: [
          { id: 'logos',       label: 'Logos',       icon: ImageIcon, anchor: 'logos' },
          { id: 'colors',      label: 'Colors',      icon: Palette,   anchor: 'colors' },
          { id: 'typography',  label: 'Typography',  icon: Type,      anchor: 'typography' },
          { id: 'iconography', label: 'Iconography', icon: Shapes,    anchor: 'iconography' },
        ],
      },
      {
        id: 'related',
        label: 'Related',
        items: [
          { id: 'identity', label: 'Identity tabs', icon: Sparkles, href: `/b/${slug}/identity` },
        ],
      },
    ],
  }), [activeAnchor, slug]);

  useBrandPageConfig({ brandName: brand?.name, maxWidth: '7xl', innerNav });

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

  // Debounced auto-save via unified hook
  const { saveState, markDirty, flush, retry } = useAutoSave({
    value: editedBrand,
    save: async (next) => {
      if (!next || !brand) return;
      await update(brand.id, {
        guidelines: next.guidelines,
        fonts: next.fonts,
      });
    },
    debounceMs: 1500,
    enabled: !!editedBrand && !!brand,
  });

  // Cmd+S → immediate flush
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void flush();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flush]);

  if (isLoading || !editedBrand) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg font-medium">Loading brand...</div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        compact
        title="Setup"
        subtitle="Edit this brand's identity — logos, colors, type — with a live preview."
        actions={
          <>
            <SaveStateIndicator state={saveState} onRetry={retry} />
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
          <div className="space-y-8 min-w-0">
            <section id="section-logos" className="scroll-mt-24">
              <LogoUploader
                brandId={editedBrand.id}
                logoSystem={editedBrand.guidelines?.logoSystem || {}}
                onLogoSystemChange={(logoSystem) => {
                  setEditedBrand((prev) => prev ? {
                    ...prev,
                    guidelines: { ...(prev.guidelines || {}), logoSystem },
                  } : prev);
                  markDirty();
                }}
              />
            </section>

            <section id="section-colors" className="scroll-mt-24">
              <ColorPaletteEditor
                colorPalette={editedBrand.guidelines?.colorPalette || {}}
                onColorPaletteChange={(colorPalette) => {
                  setEditedBrand((prev) => prev ? {
                    ...prev,
                    guidelines: { ...(prev.guidelines || {}), colorPalette },
                  } : prev);
                  markDirty();
                }}
              />
            </section>

            <section id="section-typography" className="scroll-mt-24">
              <FontSelector
                fonts={editedBrand.fonts || { primary: 'Inter', secondary: 'Inter' }}
                onFontsChange={(fonts) => {
                  const updatedFonts = {
                    primary: fonts.primary || editedBrand.fonts?.primary || 'Inter',
                    secondary: fonts.secondary || editedBrand.fonts?.secondary || 'Inter',
                  };
                  setEditedBrand((prev) => prev ? { ...prev, fonts: updatedFonts } : prev);
                  markDirty();
                }}
              />
            </section>

            <section id="section-iconography" className="scroll-mt-24">
              <IconGallery />
            </section>
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
    </>
  );
}
