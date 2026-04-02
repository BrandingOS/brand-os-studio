import { useState, useMemo, useCallback } from 'react';
import { Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryFilter } from './CategoryFilter';
import { TemplateCard } from './TemplateCard';
import { getTemplatesForModule, filterTemplatesByCategory } from '../data/templates';
import type { BrandKitModuleConfig, BrandKitTemplate } from '../types';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';

interface TemplateGalleryProps {
  moduleConfig: BrandKitModuleConfig;
  brand: Brand;
}

export function TemplateGallery({ moduleConfig, brand }: TemplateGalleryProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'saved' | 'extra'>('templates');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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

  const [savedTemplates, setSavedTemplates] = useState<Set<string>>(new Set());

  const handleUseTemplate = useCallback((template: BrandKitTemplate) => {
    setSavedTemplates(prev => new Set(prev).add(template.id));
    toast.success(`Template "${template.name}" saved for ${brand.name}`, {
      description: 'Design added to your saved collection.',
      icon: <Check className="h-4 w-4 text-green-500" />,
    });
  }, [brand.name]);

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
          <button
            onClick={() => setActiveTab('templates')}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
              activeTab === 'templates'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tabs.templates}
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
              activeTab === 'saved'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tabs.saved}
          </button>
          {tabs.extra && (
            <button
              onClick={() => setActiveTab('extra')}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
                activeTab === 'extra'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tabs.extra}
            </button>
          )}
        </div>
      )}

      {/* Category Filter */}
      {moduleConfig.categories.length > 0 && activeTab === 'templates' && (
        <CategoryFilter
          categories={['All', ...moduleConfig.categories.filter(c => c !== 'All')]}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      )}

      {/* Template Grid */}
      {activeTab === 'templates' && (
        <>
          {filteredTemplates.length > 0 ? (
            <div className={cn('grid gap-4', gridCols)}>
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  brand={brand}
                  onUse={handleUseTemplate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No templates match your search.</p>
            </div>
          )}
        </>
      )}

      {/* Saved Designs */}
      {activeTab === 'saved' && (
        <>
          {savedTemplates.size > 0 ? (
            <div className={cn('grid gap-4', gridCols)}>
              {allTemplates.filter(t => savedTemplates.has(t.id)).map((template) => (
                <TemplateCard key={template.id} template={template} brand={brand} onUse={handleUseTemplate} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <p className="text-muted-foreground font-medium">No saved designs yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Click "Use Template" to save designs here.</p>
            </div>
          )}
        </>
      )}

      {/* Extra Tab (e.g., Edit Info for Business Cards) */}
      {activeTab === 'extra' && (
        <div className="max-w-md space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Full Name</label>
            <input type="text" defaultValue="Jane Smith" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Job Title</label>
            <input type="text" defaultValue="Brand Manager" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <input type="email" defaultValue="jane@company.com" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Phone</label>
            <input type="tel" defaultValue="+1 (555) 123-4567" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Website</label>
            <input type="url" defaultValue="www.company.com" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <button className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Save Contact Info
          </button>
        </div>
      )}
    </div>
  );
}
