/**
 * ToolPanel — Canva-style icon rail + expandable side panel.
 *
 * 56px icon strip on the left with expandable 280px panel.
 * Tabs: Templates, Elements, Text, Brand, Uploads, Share
 */
import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Brand } from '@/shared/types/brand';
import {
  LayoutTemplate, Shapes, Type, Palette, Upload, Search,
  Square, Circle, Minus, Triangle, Star, Hexagon,
  Image as ImageIcon, Sparkles, Pencil, Diamond, Heart,
  ArrowRight, MessageSquare, RectangleHorizontal,
  Share2, Download, Link2, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { DESIGN_TEMPLATES, type DesignTemplate } from '../data/templates';

type PanelTab = 'templates' | 'elements' | 'text' | 'brand' | 'uploads' | 'share' | null;

interface ToolPanelProps {
  brand: Brand;
  onToolSelect: (tool: string) => void;
  selectedTool: string | null;
  onAddImage: (imageUrl: string) => void;
}

const TABS: { id: PanelTab; icon: React.ElementType; label: string }[] = [
  { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
  { id: 'elements',  icon: Shapes,         label: 'Elements' },
  { id: 'text',      icon: Type,           label: 'Text' },
  { id: 'brand',     icon: Palette,        label: 'Brand' },
  { id: 'uploads',   icon: Upload,         label: 'Uploads' },
  { id: 'share',     icon: Share2,         label: 'Share' },
];

const SHAPES = [
  { id: 'rectangle', icon: Square,              label: 'Rectangle' },
  { id: 'circle',    icon: Circle,              label: 'Circle' },
  { id: 'line',      icon: Minus,               label: 'Line' },
  { id: 'triangle',  icon: Triangle,            label: 'Triangle' },
  { id: 'star',      icon: Star,                label: 'Star' },
  { id: 'hexagon',   icon: Hexagon,             label: 'Hexagon' },
  { id: 'diamond',   icon: Diamond,             label: 'Diamond' },
  { id: 'heart',     icon: Heart,               label: 'Heart' },
  { id: 'arrow',     icon: ArrowRight,          label: 'Arrow' },
  { id: 'rounded',   icon: RectangleHorizontal, label: 'Rounded' },
  { id: 'callout',   icon: MessageSquare,       label: 'Callout' },
];

const TEXT_PRESETS = [
  { label: 'Add a heading',    size: 48, weight: '700', tool: 'text:heading' },
  { label: 'Add a subheading', size: 32, weight: '600', tool: 'text:subheading' },
  { label: 'Add body text',    size: 18, weight: '400', tool: 'text:body' },
  { label: 'Add a caption',    size: 13, weight: '400', tool: 'text:caption' },
];

export function ToolPanel({ brand, onToolSelect, selectedTool, onAddImage }: ToolPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleTab = (tab: PanelTab) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
    setSearchQuery('');
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onAddImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [onAddImage]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="flex h-full">
      {/* ─── Icon Rail (56px) ──────────────────────────────── */}
      <div className="w-14 shrink-0 border-r border-border bg-card flex flex-col items-center py-2 gap-1">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => toggleTab(id)}
            className={cn(
              'flex flex-col items-center gap-0.5 w-12 py-2 rounded-lg text-[10px] transition-colors',
              activeTab === id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
            title={label}
          >
            <Icon className="h-5 w-5" />
            <span className="leading-none">{label}</span>
          </button>
        ))}
      </div>

      {/* ─── Expandable Panel (280px) ──────────────────────── */}
      {activeTab && (
        <div className="w-[280px] shrink-0 border-r border-border bg-card/50 flex flex-col min-h-0">
          {/* Search */}
          {activeTab !== 'share' && (
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab}...`}
                  className="w-full h-8 rounded-lg border border-border bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'elements' && (
              <div className="space-y-4">
                {/* Drawing Tool */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Draw</p>
                  <button
                    onClick={() => onToolSelect('draw')}
                    className={cn(
                      'flex items-center gap-3 w-full p-3 rounded-xl border transition-all text-sm',
                      selectedTool === 'draw'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background hover:border-primary/40 hover:bg-primary/5',
                    )}
                  >
                    <Pencil className="h-5 w-5" />
                    <div className="text-left">
                      <span className="font-medium">Free Draw</span>
                      <p className="text-[10px] text-muted-foreground">Draw freely on the canvas</p>
                    </div>
                  </button>
                </div>

                {/* Shapes */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Shapes</p>
                  <div className="grid grid-cols-3 gap-2">
                    {SHAPES.map((shape) => {
                      const Icon = shape.icon;
                      return (
                        <button
                          key={shape.id}
                          onClick={() => onToolSelect(shape.id)}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-all text-xs group"
                        >
                          <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-[10px] text-muted-foreground">{shape.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'text' && (
              <div className="space-y-4">
                <Button onClick={() => onToolSelect('text')} className="w-full gap-2 h-11 text-sm">
                  <Type className="h-4 w-4" />
                  Add a text box
                </Button>

                {brand.fonts && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Brand Kit</span>
                    </div>
                    <button
                      onClick={() => onToolSelect('text')}
                      className="w-full text-left px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 transition-colors mb-2"
                    >
                      <span className="text-base font-semibold" style={{ fontFamily: brand.fonts.primary }}>{brand.fonts.primary}</span>
                    </button>
                  </div>
                )}

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Default text styles</p>
                  <div className="space-y-1.5">
                    {TEXT_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => onToolSelect(preset.tool)}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 transition-all"
                      >
                        <span style={{ fontSize: Math.min(preset.size, 24), fontWeight: preset.weight }}>
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'brand' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Brand Colors</p>
                  <div className="flex gap-2 flex-wrap">
                    {[brand.primaryColor, brand.secondaryColor, '#1a1a1a', '#ffffff'].filter(Boolean).map((color) => (
                      <button
                        key={color}
                        className="h-10 w-10 rounded-lg border-2 border-border hover:border-primary hover:scale-110 transition-all shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {brand.logo && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Logo</p>
                    <button
                      onClick={() => onAddImage(brand.logo!)}
                      className="w-full p-4 rounded-lg border border-border hover:border-primary/40 transition-colors bg-background"
                    >
                      <img src={brand.logo} alt="Brand logo" className="h-12 mx-auto object-contain" />
                    </button>
                  </div>
                )}

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Fonts</p>
                  <div className="space-y-1.5">
                    {[brand.fonts?.primary, brand.fonts?.secondary].filter(Boolean).map((font) => (
                      <div key={font} className="px-3 py-2 rounded-lg border border-border bg-background">
                        <span className="text-sm" style={{ fontFamily: font }}>{font}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'uploads' && (
              <div className="space-y-4">
                <label className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-background/50">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload an image</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Stock Photos</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=200&fit=crop',
                      'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=200&h=200&fit=crop',
                      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&h=200&fit=crop',
                      'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=200&h=200&fit=crop',
                    ].map((url) => (
                      <button
                        key={url}
                        onClick={() => onAddImage(url)}
                        className="aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/40 transition-all hover:scale-105"
                      >
                        <img src={url} alt="Stock" className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'share' && (
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Export & Share</p>

                <Button className="w-full gap-2" onClick={() => {
                  // Dispatch export event
                  window.dispatchEvent(new CustomEvent('editor:export'));
                }}>
                  <Download className="h-4 w-4" /> Download Design
                </Button>

                <Button variant="outline" className="w-full gap-2" onClick={handleCopyLink}>
                  <Link2 className="h-4 w-4" /> Copy Link
                </Button>

                <div className="border-t pt-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Quick Resize</p>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Instagram Post', size: '1080 × 1080' },
                      { label: 'Instagram Story', size: '1080 × 1920' },
                      { label: 'Facebook Cover', size: '1640 × 856' },
                      { label: 'Presentation', size: '1920 × 1080' },
                      { label: 'YouTube Thumb', size: '1280 × 720' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 transition-all text-sm"
                        onClick={() => toast.info(`Resize to ${preset.size} coming soon`)}
                      >
                        <span>{preset.label}</span>
                        <span className="text-xs text-muted-foreground">{preset.size}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <TemplatesGrid searchQuery={searchQuery} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Templates Grid ──────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  social: 'Social Media',
  presentation: 'Presentations',
  marketing: 'Marketing',
  card: 'Cards & Invites',
};

function TemplatesGrid({ searchQuery }: { searchQuery: string }) {
  const filtered = useMemo(() => {
    if (!searchQuery) return DESIGN_TEMPLATES;
    const q = searchQuery.toLowerCase();
    return DESIGN_TEMPLATES.filter(
      (t) => t.name.toLowerCase().includes(q) || t.category.includes(q),
    );
  }, [searchQuery]);

  const grouped = useMemo(() => {
    const map: Record<string, DesignTemplate[]> = {};
    for (const t of filtered) {
      (map[t.category] ??= []).push(t);
    }
    return map;
  }, [filtered]);

  const loadTemplate = (tpl: DesignTemplate) => {
    window.dispatchEvent(
      new CustomEvent('loadTemplate', { detail: { json: tpl.json } }),
    );
  };

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8">
        <LayoutTemplate className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">No templates found</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([cat, templates]) => (
        <div key={cat}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            {CATEGORY_LABELS[cat] || cat}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => loadTemplate(tpl)}
                className="group relative rounded-lg border border-border overflow-hidden hover:border-primary/50 hover:shadow-md transition-all text-left"
              >
                {/* Color preview thumbnail */}
                <div
                  className="aspect-[4/3] flex items-center justify-center"
                  style={{ backgroundColor: tpl.accent }}
                >
                  <span className="text-white text-[10px] font-bold opacity-80 px-2 text-center leading-tight">
                    {tpl.name}
                  </span>
                </div>
                <div className="px-2 py-1.5 bg-background">
                  <span className="text-[10px] font-medium truncate block">{tpl.name}</span>
                  <span className="text-[9px] text-muted-foreground">{tpl.width}×{tpl.height}</span>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-3 py-1 rounded-full shadow">
                    Use Template
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
