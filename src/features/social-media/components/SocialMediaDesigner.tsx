import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader, SectionTitle } from '@/shared/design-system/Typography';
import { DSCard, EmptyState, FeatureCard } from '@/shared/design-system/Card';
import { Grid, Stack } from '@/shared/design-system/Layout';
import { DSBadge } from '@/shared/design-system/Feedback';
import { SOCIAL_TEMPLATES, TEMPLATE_CATEGORIES, getTemplatesForPlatform } from '../data/templates';
import { SOCIAL_MEDIA_SIZES } from '../data/sizes';
import type { Brand } from '@/shared/types/brand';
import type { SocialPlatform, SocialTemplate, TemplateCategory } from '../types';
import {
  Search, Instagram, Facebook, Twitter, Linkedin, Youtube,
  Sparkles, Layout, Crown, ArrowRight, Grid3X3, Layers,
  PenTool, Wand2, Image as ImageIcon, Download,
} from 'lucide-react';
import { ExportDialog } from '@/shared/components/ExportDialog';
import type { ExportFormat } from '@/shared/services/export/types';
import { exportAndDownload } from '@/shared/services/export';
import { toast } from 'sonner';

const platformConfig: Record<SocialPlatform, { label: string; icon: typeof Instagram; color: string }> = {
  instagram: { label: 'Instagram', icon: Instagram, color: '#E4405F' },
  facebook: { label: 'Facebook', icon: Facebook, color: '#1877F2' },
  twitter: { label: 'Twitter / X', icon: Twitter, color: '#1DA1F2' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  tiktok: { label: 'TikTok', icon: Layers, color: '#000000' },
  youtube: { label: 'YouTube', icon: Youtube, color: '#FF0000' },
  pinterest: { label: 'Pinterest', icon: Grid3X3, color: '#E60023' },
};

interface SocialMediaDesignerProps {
  brand: Brand;
}

function TemplateCard({ template, brand, onClick, onExport }: { template: SocialTemplate; brand: Brand; onClick: () => void; onExport?: (e: React.MouseEvent) => void }) {
  const bgStyle = useMemo(() => {
    const bg = template.layout.background;
    switch (bg.type) {
      case 'brand-primary': return { backgroundColor: brand.primaryColor };
      case 'brand-secondary': return { backgroundColor: brand.secondaryColor || brand.primaryColor };
      case 'gradient': {
        const value = bg.value
          .replace(/brand-primary/g, brand.primaryColor)
          .replace(/brand-secondary/g, brand.secondaryColor || brand.primaryColor);
        return { background: value };
      }
      case 'solid': return { backgroundColor: bg.value };
      default: return { backgroundColor: '#F5F5F5' };
    }
  }, [template, brand]);

  return (
    <div
      onClick={onClick}
      data-template-card
      className="group cursor-pointer rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300"
    >
      {/* Preview */}
      <div className="aspect-square relative overflow-hidden" data-template-preview style={bgStyle}>
        <div className="absolute inset-0 p-4 flex flex-col justify-center">
          {template.layout.elements.slice(0, 3).map((el, i) => {
            if (el.type === 'text') {
              const color = el.style?.color === '#fff' || el.style?.color === '#FFFFFF'
                ? '#fff'
                : el.style?.color === 'brand-primary'
                  ? brand.primaryColor
                  : el.style?.color || '#333';
              return (
                <div key={i} className="mb-1" style={{ opacity: Number(el.style?.opacity) || 1 }}>
                  <p
                    className="truncate"
                    style={{
                      fontSize: `${Math.min(Number(el.style?.fontSize || 14) * 0.5, 16)}px`,
                      fontWeight: Number(el.style?.fontWeight || 400),
                      color,
                      textTransform: (el.style?.textTransform as any) || 'none',
                    }}
                  >
                    {el.content}
                  </p>
                </div>
              );
            }
            if (el.type === 'logo') {
              return (
                <div key={i} className="mt-auto">
                  {brand.logo ? (
                    <img src={brand.logo} alt="" className="h-3 object-contain" style={{ filter: bgStyle.backgroundColor === '#0A0A0F' || bgStyle.backgroundColor === brand.primaryColor ? 'brightness(0) invert(1)' : undefined }} />
                  ) : (
                    <span className="text-[8px] font-bold" style={{ color: bgStyle.backgroundColor === '#FFFFFF' || bgStyle.backgroundColor === '#FAFAFA' ? brand.primaryColor : '#fff' }}>
                      {brand.name}
                    </span>
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-xs font-medium flex items-center gap-1.5">
              <PenTool className="h-3 w-3" /> Customize
            </div>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium truncate">{template.name}</p>
          {template.isPro && (
            <DSBadge variant="warning">
              <Crown className="h-2.5 w-2.5 mr-0.5" /> Pro
            </DSBadge>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            {template.platforms.slice(0, 3).map((p) => {
              const config = platformConfig[p];
              return <config.icon key={p} className="h-3 w-3 text-muted-foreground" />;
            })}
            {template.platforms.length > 3 && (
              <span className="text-xs text-muted-foreground">+{template.platforms.length - 3}</span>
            )}
          </div>
          {onExport && (
            <button
              onClick={onExport}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
              title="Export"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SocialMediaDesigner({ brand }: SocialMediaDesignerProps) {
  const [activePlatform, setActivePlatform] = useState<SocialPlatform | 'all'>('all');
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'templates' | 'ai'>('templates');

  const filteredTemplates = useMemo(() => {
    let templates = SOCIAL_TEMPLATES;

    if (activePlatform !== 'all') {
      templates = templates.filter(t => t.platforms.includes(activePlatform));
    }
    if (activeCategory !== 'all') {
      templates = templates.filter(t => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
      );
    }
    return templates;
  }, [activePlatform, activeCategory, searchQuery]);

  const [exportElement, setExportElement] = useState<HTMLElement | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportTemplateName, setExportTemplateName] = useState('');

  const handleTemplateClick = (template: SocialTemplate) => {
    // TODO: Open template in editor
    console.log('Open template:', template.id);
  };

  const handleExportTemplate = (e: React.MouseEvent, template: SocialTemplate) => {
    e.stopPropagation();
    const card = (e.currentTarget as HTMLElement).closest('[data-template-card]');
    const preview = card?.querySelector('[data-template-preview]') as HTMLElement | null;
    if (preview) {
      setExportElement(preview);
      setExportTemplateName(template.name.toLowerCase().replace(/\s+/g, '-'));
      setShowExportDialog(true);
    } else {
      toast.error('Preview not found');
    }
  };

  const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');

  return (
    <Stack gap={6}>
      <PageHeader
        title="Social Media Designer"
        description="Create stunning social media content with your brand assets. Choose a template or let AI generate designs for you."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={view === 'templates' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('templates')}
            >
              <Layout className="h-4 w-4 mr-1.5" /> Templates
            </Button>
            <Button
              variant={view === 'ai' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('ai')}
            >
              <Sparkles className="h-4 w-4 mr-1.5" /> AI Generate
            </Button>
          </div>
        }
      />

      {view === 'templates' ? (
        <>
          {/* Platform Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActivePlatform('all')}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap',
                activePlatform === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/40',
              )}
            >
              All Platforms
            </button>
            {Object.entries(platformConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setActivePlatform(key as SocialPlatform)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap',
                  activePlatform === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/40',
                )}
              >
                <config.icon className="h-3.5 w-3.5" />
                {config.label}
              </button>
            ))}
          </div>

          {/* Category Filter + Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveCategory('all')}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap',
                  activeCategory === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/40',
                )}
              >
                All
              </button>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap',
                    activeCategory === cat.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/40',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Template Grid */}
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  brand={brand}
                  onClick={() => handleTemplateClick(template)}
                  onExport={(e) => handleExportTemplate(e, template)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ImageIcon className="h-6 w-6" />}
              title="No templates found"
              description="Try adjusting your filters or search query"
              action={
                <Button variant="outline" size="sm" onClick={() => { setActivePlatform('all'); setActiveCategory('all'); setSearchQuery(''); }}>
                  Clear Filters
                </Button>
              }
            />
          )}

          {/* Size Reference */}
          <DSCard variant="outlined" padding="md">
            <SectionTitle
              title="Platform Size Reference"
              description="Standard dimensions for each platform and format"
            />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SOCIAL_MEDIA_SIZES.filter(s => activePlatform === 'all' || s.platform === activePlatform).slice(0, 12).map((size) => {
                const config = platformConfig[size.platform];
                return (
                  <div key={`${size.platform}-${size.format}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                    <config.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{size.label}</p>
                      <p className="text-xs text-muted-foreground">{size.width} x {size.height}px</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      Use <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </DSCard>
        </>
      ) : (
        /* AI Generate View */
        <AIDesignGenerator brand={brand} />
      )}

      {/* Export Dialog */}
      {exportElement && (
        <ExportDialog
          open={showExportDialog}
          onClose={() => { setShowExportDialog(false); setExportElement(null); }}
          source={{ type: 'html-element', element: exportElement }}
          availableFormats={['png', 'jpg', 'pdf-flat']}
          defaultFilename={`${slug}-${exportTemplateName}`}
          title="Export Design"
        />
      )}
    </Stack>
  );
}

// ─── AI Design Generator ─────────────────────────────────────────────
function AIDesignGenerator({ brand }: { brand: Brand }) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<SocialTemplate[]>([]);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setGenerating(true);

    // Simulated AI generation — picks random templates and customizes them
    setTimeout(() => {
      const shuffled = [...SOCIAL_TEMPLATES].sort(() => Math.random() - 0.5);
      setResults(shuffled.slice(0, 6));
      setGenerating(false);
    }, 2000);
  };

  return (
    <Stack gap={6}>
      <DSCard variant="elevated" padding="lg">
        <Stack gap={4}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Wand2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">AI Design Generator</h3>
              <p className="text-sm text-muted-foreground">Describe what you want and AI will create designs using your brand assets</p>
            </div>
          </div>

          <div className="space-y-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Create an Instagram post announcing our summer sale with 30% off. Make it bold and eye-catching with our brand colors."
              className="w-full h-28 rounded-lg border border-input bg-background px-4 py-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {['Instagram Post', 'Story', 'LinkedIn Post', 'Twitter Post'].map((quick) => (
                  <button
                    key={quick}
                    onClick={() => setPrompt((p) => p ? `${p} for ${quick}` : `Create a ${quick}`)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                  >
                    {quick}
                  </button>
                ))}
              </div>
              <Button onClick={handleGenerate} disabled={!prompt.trim() || generating}>
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1.5" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Generate Designs
                  </>
                )}
              </Button>
            </div>
          </div>
        </Stack>
      </DSCard>

      {/* Generated Results */}
      {results.length > 0 && (
        <div>
          <SectionTitle title="Generated Designs" description="Click any design to customize it in the editor" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
            {results.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                brand={brand}
                onClick={() => console.log('Edit:', template.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Suggestion Cards */}
      {results.length === 0 && !generating && (
        <div>
          <SectionTitle title="Quick Start Ideas" description="Select a prompt to get started" />
          <Grid cols={3} gap={4} className="mt-4">
            {[
              { title: 'Product Launch', desc: 'Announce a new product or feature', prompt: 'Create a product launch announcement post' },
              { title: 'Sale Promotion', desc: 'Promote a discount or offer', prompt: 'Create a bold sale promotion with 50% off' },
              { title: 'Inspirational Quote', desc: 'Share a motivational message', prompt: 'Create an inspirational quote post with clean typography' },
              { title: 'Team Introduction', desc: 'Introduce a team member', prompt: 'Create a team spotlight post introducing a new hire' },
              { title: 'Event Invite', desc: 'Promote an upcoming event', prompt: 'Create an event invitation for a webinar' },
              { title: 'Customer Story', desc: 'Share a testimonial', prompt: 'Create a customer testimonial post with a quote' },
            ].map((idea) => (
              <FeatureCard
                key={idea.title}
                title={idea.title}
                description={idea.desc}
                onClick={() => { setPrompt(idea.prompt); }}
              />
            ))}
          </Grid>
        </div>
      )}
    </Stack>
  );
}
