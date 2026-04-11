/**
 * ToolPanel — Canva-style icon rail + expandable side panel.
 *
 * 56px icon strip on the left with expandable 280px panel.
 * Tabs: Templates, Elements, Text, Brand, Uploads
 */
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Brand } from '@/shared/types/brand';
import {
  LayoutTemplate, Shapes, Type, Palette, Upload, Search,
  Square, Circle, Minus, Triangle, Star, Hexagon,
  Image as ImageIcon, Sparkles,
} from 'lucide-react';

type PanelTab = 'templates' | 'elements' | 'text' | 'brand' | 'uploads' | null;

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
];

const SHAPES = [
  { id: 'rectangle', icon: Square,   label: 'Rectangle' },
  { id: 'circle',    icon: Circle,   label: 'Circle' },
  { id: 'line',      icon: Minus,    label: 'Line' },
  { id: 'triangle',  icon: Triangle, label: 'Triangle' },
  { id: 'star',      icon: Star,     label: 'Star' },
  { id: 'hexagon',   icon: Hexagon,  label: 'Hexagon' },
];

const TEXT_PRESETS = [
  { label: 'Add a heading',    size: 36, weight: '700' },
  { label: 'Add a subheading', size: 24, weight: '600' },
  { label: 'Add body text',    size: 16, weight: '400' },
  { label: 'Add a caption',    size: 12, weight: '400' },
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

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'elements' && (
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Shapes</p>
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
                        onClick={() => onToolSelect('text')}
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

            {activeTab === 'templates' && (
              <div className="space-y-4 text-center py-6">
                <LayoutTemplate className="h-8 w-8 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Browse the marketplace for ready-made templates.</p>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/templates'} className="w-full">
                  Browse Templates
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
