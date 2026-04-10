import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryFilter } from './CategoryFilter';
import { TemplateCard, renderTemplateDesign } from './TemplateCard';
import { TemplatePreviewModal, type TemplateOverrides } from './TemplatePreviewModal';
import { CanvasEditor } from './editor/CanvasEditor';
import { getTemplatesForModule, filterTemplatesByCategory } from '../data/templates';
import type { BrandKitModuleConfig, BrandKitTemplate } from '../types';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';

interface TemplateGalleryProps {
  moduleConfig: BrandKitModuleConfig;
  brand: Brand;
}

async function quickDownloadTemplate(template: BrandKitTemplate, brand: Brand, cardEl: HTMLElement) {
  try {
    const { default: html2canvas } = await import('html2canvas');
    // Find the rendered design inside the card (first child of the aspect-ratio container)
    const designEl = cardEl.querySelector('[class*="aspect-"]');
    if (!designEl) { toast.error('Design element not found'); return; }

    const canvas = await html2canvas(designEl as HTMLElement, {
      scale: 4,
      backgroundColor: null,
      useCORS: true,
      logging: false,
    });
    const link = document.createElement('a');
    const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
    link.download = `${slug}-${template.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded ${template.name} (${canvas.width}×${canvas.height}px)`);
  } catch (err) {
    console.error(err);
    toast.error('Download failed');
  }
}

export function TemplateGallery({ moduleConfig, brand }: TemplateGalleryProps) {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState<'templates' | 'saved' | 'extra'>('templates');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<Set<string>>(new Set());
  const [editTemplate, setEditTemplate] = useState<BrandKitTemplate | null>(null);
  const [canvasEditorTemplate, setCanvasEditorTemplate] = useState<BrandKitTemplate | null>(null);

  const allTemplates = useMemo(() => getTemplatesForModule(moduleConfig.id), [moduleConfig.id]);

  const filteredTemplates = useMemo(() => {
    let result = filterTemplatesByCategory(allTemplates, activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allTemplates, activeCategory, searchQuery]);

  // Quick download: capture the card's rendered design directly
  const handleQuickDownload = useCallback((template: BrandKitTemplate) => {
    if (template.type === 'brand-guides') {
      navigate(`/b/${slug}/guidelines`);
      return;
    }
    // Find the card element by template id and capture it
    const cardEl = document.querySelector(`[data-template-id="${template.id}"]`) as HTMLElement;
    if (cardEl) {
      quickDownloadTemplate(template, brand, cardEl);
    } else {
      // Fallback: open in edit mode
      setEditTemplate(template);
    }
  }, [brand, navigate, slug]);

  // Open editor modal
  const handleOpenEditor = useCallback((template: BrandKitTemplate) => {
    if (template.type === 'brand-guides') {
      navigate(`/b/${slug}/guidelines`);
      return;
    }
    setEditTemplate(template);
  }, [navigate, slug]);

  const handleSaveTemplate = useCallback((template: BrandKitTemplate) => {
    setSavedTemplates(prev => new Set(prev).add(template.id));
  }, []);

  // Render preview with overrides applied (for editor modal)
  const renderPreviewWithOverrides = useCallback((template: BrandKitTemplate) => {
    return (overrides: TemplateOverrides) => {
      // Create a modified brand with the overrides
      const modifiedBrand: Brand = {
        ...brand,
        primaryColor: overrides.primaryColor || brand.primaryColor,
        secondaryColor: overrides.secondaryColor || brand.secondaryColor,
        logo: overrides.showLogo === false ? undefined : brand.logo,
      };
      return renderTemplateDesign(template, modifiedBrand);
    };
  }, [brand]);

  const gridCols = moduleConfig.orientation === 'portrait'
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
    : moduleConfig.orientation === 'square'
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const tabs = moduleConfig.tabLabels;

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
      </div>

      {/* Tabs */}
      {moduleConfig.hasTabs && tabs && (
        <div className="flex gap-1 border-b border-border">
          <button onClick={() => setActiveTab('templates')} className={cn('px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px', activeTab === 'templates' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{tabs.templates}</button>
          <button onClick={() => setActiveTab('saved')} className={cn('px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px', activeTab === 'saved' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{tabs.saved} {savedTemplates.size > 0 && `(${savedTemplates.size})`}</button>
          {tabs.extra && <button onClick={() => setActiveTab('extra')} className={cn('px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px', activeTab === 'extra' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{tabs.extra}</button>}
        </div>
      )}

      {/* Category Filter */}
      {moduleConfig.categories.length > 0 && activeTab === 'templates' && (
        <CategoryFilter categories={['All', ...moduleConfig.categories.filter(c => c !== 'All')]} activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      )}

      {/* Template Grid */}
      {activeTab === 'templates' && (
        filteredTemplates.length > 0 ? (
          <div className={cn('grid gap-4', gridCols)}>
            {filteredTemplates.map((template) => (
              <div key={template.id} data-template-id={template.id}>
                <TemplateCard template={template} brand={brand} onUse={handleQuickDownload} onEdit={handleOpenEditor} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16"><p className="text-muted-foreground">No templates match your search.</p></div>
        )
      )}

      {/* Saved Designs */}
      {activeTab === 'saved' && (
        savedTemplates.size > 0 ? (
          <div className={cn('grid gap-4', gridCols)}>
            {allTemplates.filter(t => savedTemplates.has(t.id)).map((template) => (
              <div key={template.id} data-template-id={template.id}>
                <TemplateCard template={template} brand={brand} onUse={handleQuickDownload} onEdit={handleOpenEditor} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            </div>
            <p className="text-muted-foreground font-medium">No saved designs yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Click "Edit" on a template then "Save" to add it here.</p>
          </div>
        )
      )}

      {/* Extra Tab */}
      {activeTab === 'extra' && (
        <div className="max-w-md space-y-4">
          {[
            { label: 'Full Name', default: 'Jane Smith' },
            { label: 'Job Title', default: 'Brand Manager' },
            { label: 'Email', default: 'jane@company.com', type: 'email' },
            { label: 'Phone', default: '+1 (555) 123-4567', type: 'tel' },
            { label: 'Website', default: 'www.company.com', type: 'url' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-sm font-medium mb-1.5 block">{f.label}</label>
              <input type={f.type || 'text'} defaultValue={f.default} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          ))}
          <button className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Save Contact Info</button>
        </div>
      )}

      {/* Edit/Preview Modal */}
      {editTemplate && !canvasEditorTemplate && (
        <TemplatePreviewModal
          template={editTemplate}
          brand={brand}
          onClose={() => setEditTemplate(null)}
          onSave={handleSaveTemplate}
          onOpenEditor={() => {
            setCanvasEditorTemplate(editTemplate);
            setEditTemplate(null);
          }}
          renderPreview={renderPreviewWithOverrides(editTemplate)}
        />
      )}

      {/* Canvas Editor (Canva-style) */}
      {canvasEditorTemplate && (
        <CanvasEditor
          brand={brand}
          template={canvasEditorTemplate}
          onClose={() => setCanvasEditorTemplate(null)}
        />
      )}
    </div>
  );
}
