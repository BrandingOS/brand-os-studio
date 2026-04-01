import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBrandStore } from '@/shared/store/brandStore';
import { useGuidelinesStore } from '../store/guidelinesStore';
import type { GuidelineSlide } from '../types/guidelines';
import { InteractiveSlideNavigator } from './InteractiveSlideNavigator';
import { InteractivePreviewCanvas } from './InteractivePreviewCanvas';
import { EnhancedGuidelineCustomizer } from './EnhancedGuidelineCustomizer';
import { AIContentGenerator } from './AIContentGenerator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Eye, Settings, Wand2, Plus } from 'lucide-react';
import { demoBrandIdentity } from '@/data/demo';
import { BrandLayout } from '@/features/brand';
import { toast } from 'sonner';
import { exportAsPDF, exportAsZIP } from '@/shared/services/exportService';

export const InteractiveGuidelinesEditor: React.FC = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const { current: brand, isLoading, loadById, update } = useBrandStore();
  const { 
    activePanel, 
    setCurrentSlide, 
    slides, 
    currentSlide, 
    setActivePanel,
    updateSlide 
  } = useGuidelinesStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'navigator' | 'customize' | 'ai' | 'export'>('navigator');
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Load brand data
  useEffect(() => {
    if (brandId && brandId !== brand?.id) {
      if (brandId === '550e8400-e29b-41d4-a716-446655440000') {
        useBrandStore.getState().setCurrent(demoBrandIdentity);
      } else {
        loadById(brandId);
      }
    }
  }, [brandId, brand?.id, loadById]);

  // Initialize slides when brand is loaded
  useEffect(() => {
    if (brand && slides.length === 0) {
      const initialSlides: GuidelineSlide[] = [
        { 
          id: 'cover', 
          type: 'cover', 
          title: 'Brand Overview', 
          content: { 
            pageNumber: 1,
            title: brand.name || 'Your Brand',
            subtitle: brand.guidelines?.strategy?.mission || 'Building extraordinary experiences',
            description: brand.strategy || 'Professional brand guidelines that define our identity and ensure consistent communication across all touchpoints.'
          },
          order: 0, 
          enabled: true 
        },
        { 
          id: 'strategy', 
          type: 'strategy', 
          title: 'Brand Strategy', 
          content: { 
            pageNumber: 2,
            mission: brand.guidelines?.strategy?.mission || 'To create meaningful connections through innovative design and authentic storytelling.',
            vision: brand.guidelines?.strategy?.vision || 'To be recognized as a leader in creative excellence and brand innovation.',
            values: brand.guidelines?.strategy?.values || ['Innovation', 'Authenticity', 'Excellence', 'Collaboration']
          },
          order: 1, 
          enabled: true 
        },
        { 
          id: 'logos', 
          type: 'logos', 
          title: 'Logo System', 
          content: { 
            pageNumber: 3,
            primaryLogo: brand.logo,
            variations: brand.assets?.filter(asset => asset.type === 'logo') || [],
            usageGuidelines: 'The logo should always maintain clear space equal to the height of the "x" character in the logotype.',
            donts: ['Do not stretch or distort', 'Do not change colors', 'Do not place on busy backgrounds']
          },
          order: 2, 
          enabled: true 
        },
        { 
          id: 'colors', 
          type: 'colors', 
          title: 'Color Palette', 
          content: { 
            pageNumber: 4,
            primary: brand.primaryColor || '#000000',
            secondary: brand.secondaryColor || '#666666',
            accent: brand.secondaryColor || '#007bff',
            palette: { primary: brand.primaryColor || '#000000', secondary: brand.secondaryColor || '#666666', accent: brand.secondaryColor || '#007bff' }
          },
          order: 3, 
          enabled: true 
        },
        { 
          id: 'typography', 
          type: 'typography', 
          title: 'Typography', 
          content: { 
            pageNumber: 5,
            primaryFont: brand.fonts?.primary || 'Inter',
            secondaryFont: brand.fonts?.secondary || 'Inter',
            headingFont: brand.fonts?.primary || 'Inter',
            bodyFont: brand.fonts?.secondary || brand.fonts?.primary || 'Inter'
          },
          order: 4, 
          enabled: true 
        },
        { 
          id: 'voice', 
          type: 'voice', 
          title: 'Voice & Tone', 
          content: { 
            pageNumber: 6,
            voice: brand.tone || 'Professional, approachable, innovative',
            personality: brand.guidelines?.strategy?.personality || ['Modern', 'Friendly', 'Reliable'],
            toneDos: ['Be clear and direct', 'Use active voice', 'Stay positive'],
            toneDonts: ['Use jargon', 'Be overly formal', 'Make assumptions']
          },
          order: 5, 
          enabled: true 
        },
      ];
      initialSlides.forEach(slide => useGuidelinesStore.getState().addSlide(slide));
    }
  }, [brand, slides.length]);

  const handleContentUpdate = async (slideId: string, field: string, value: any) => {
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;

    const updatedContent = { ...slide.content, [field]: value };
    updateSlide(slideId, { content: updatedContent });

    // Update brand store if it's a core brand field
    if (brand && (field === 'mission' || field === 'vision' || field === 'voice')) {
      try {
        await update(brand.id, { [field]: value });
        toast.success('Brand updated successfully');
      } catch (error) {
        toast.error('Failed to update brand');
      }
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'pdf' | 'web' | 'pptx') => {
    if (!brand || isExporting) return;

    const { settings } = useGuidelinesStore.getState();
    const enabledSlides = slides.filter((s) => s.enabled);

    if (enabledSlides.length === 0) {
      toast.error('No slides are enabled for export.');
      return;
    }

    setIsExporting(true);
    try {
      if (format === 'pdf') {
        toast.loading('Generating PDF...', { id: 'export' });
        await exportAsPDF(brand, enabledSlides, settings);
        toast.success('PDF downloaded successfully!', { id: 'export' });
      } else if (format === 'web') {
        toast.loading('Generating brand kit ZIP...', { id: 'export' });
        await exportAsZIP(brand, enabledSlides, settings);
        toast.success('Brand kit ZIP downloaded successfully!', { id: 'export' });
      } else {
        toast.info(`Export as ${format.toUpperCase()} is not yet supported.`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.', { id: 'export' });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Brand not found</h2>
          <p className="text-muted-foreground">The requested brand could not be loaded.</p>
        </div>
      </div>
    );
  }

  const renderSidePanel = () => {
    switch (activeTab) {
      case 'navigator':
        return (
          <InteractiveSlideNavigator 
            slides={slides}
            currentSlide={currentSlide}
            onSlideSelect={setCurrentSlide}
            brand={brand}
            onSlideUpdate={updateSlide}
          />
        );
      case 'customize':
        return <EnhancedGuidelineCustomizer />;
      case 'ai':
        return (
          <AIContentGenerator 
            brand={brand}
            currentSlide={slides[currentSlide]}
            onContentGenerated={(content) => {
              const slide = slides[currentSlide];
              if (slide) {
                handleContentUpdate(slide.id, 'generatedContent', content);
              }
            }}
          />
        );
      case 'export':
        return (
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold mb-4">Export Guidelines</h3>
            <div className="space-y-3">
              <Button
                onClick={() => handleExport('pdf')}
                className="w-full justify-start"
                variant="outline"
                disabled={isExporting}
              >
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Export as PDF
              </Button>
              <Button
                onClick={() => handleExport('web')}
                className="w-full justify-start"
                variant="outline"
                disabled={isExporting}
              >
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Download Brand Kit (ZIP)
              </Button>
              <Button
                onClick={() => handleExport('pptx')}
                className="w-full justify-start"
                variant="outline"
                disabled={isExporting}
              >
                <Download className="w-4 h-4 mr-2" />
                Export as PowerPoint
              </Button>
            </div>
          </div>
        );
      default:
        return <EnhancedGuidelineCustomizer />;
    }
  };

  return (
    <BrandLayout>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Left Panel */}
        <aside className={`flex flex-col bg-muted/20 border-r border-border transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            {!isCollapsed && (
              <h2 className="text-lg font-semibold">Brand Guidelines</h2>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(prev => !prev)}
            >
              {isCollapsed ? '›' : '‹'}
            </Button>
          </div>

          {!isCollapsed && (
            <Tabs value={activeTab} onValueChange={(val: string) => setActiveTab(val as any)} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-4 m-2">
                <TabsTrigger value="navigator" className="text-xs">
                  <Settings className="w-3 h-3 mr-1" />
                  {isCollapsed ? '' : 'Nav'}
                </TabsTrigger>
                <TabsTrigger value="customize" className="text-xs">
                  <Settings className="w-3 h-3 mr-1" />
                  {isCollapsed ? '' : 'Style'}
                </TabsTrigger>
                <TabsTrigger value="ai" className="text-xs">
                  <Wand2 className="w-3 h-3 mr-1" />
                  {isCollapsed ? '' : 'AI'}
                </TabsTrigger>
                <TabsTrigger value="export" className="text-xs">
                  <Download className="w-3 h-3 mr-1" />
                  {isCollapsed ? '' : 'Export'}
                </TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-auto">
                {renderSidePanel()}
              </div>
            </Tabs>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 min-h-0 flex flex-col">
          <InteractivePreviewCanvas 
            brand={brand}
            currentSlide={slides[currentSlide]}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
            editingElement={editingElement}
            onEditingElementChange={setEditingElement}
            onContentUpdate={handleContentUpdate}
          />
        </main>
      </div>
    </BrandLayout>
  );
};