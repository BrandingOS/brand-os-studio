/**
 * Customization panel for brand guidelines.
 * Controls: slide visibility/order, chrome settings, text overrides, layout.
 */
import { useState } from 'react';
import { Eye, EyeOff, GripVertical, Settings2, Type, Layout, ChevronDown, ChevronUp } from 'lucide-react';
import type { TemplateLayout } from './layout-config';

export interface GuidelineCustomization {
  // Slide visibility
  hiddenSlides: Set<string>;
  // Chrome overrides
  showPageNumbers: boolean;
  showBrandMark: boolean;
  showDate: boolean;
  // Text overrides
  documentTitle: string;
  versionText: string;
  confidentialText: string;
  // Layout
  pagePadding: number; // 3-8%
}

export const DEFAULT_CUSTOMIZATION: GuidelineCustomization = {
  hiddenSlides: new Set(),
  showPageNumbers: true,
  showBrandMark: true,
  showDate: true,
  documentTitle: 'Brand Guidelines',
  versionText: `v2.0 — ${new Date().getFullYear()}`,
  confidentialText: 'Confidential',
  pagePadding: 5,
};

interface CustomizePanelProps {
  customization: GuidelineCustomization;
  onChange: (c: GuidelineCustomization) => void;
  slides: Array<{ id: string; name: string }>;
  layout: TemplateLayout;
  isOpen: boolean;
  onToggle: () => void;
}

export function CustomizePanel({ customization, onChange, slides, layout, isOpen, onToggle }: CustomizePanelProps) {
  const [activeSection, setActiveSection] = useState<'slides' | 'chrome' | 'text' | 'layout'>('slides');
  const c = customization;

  const update = (patch: Partial<GuidelineCustomization>) => {
    onChange({ ...c, ...patch });
  };

  const toggleSlide = (id: string) => {
    const next = new Set(c.hiddenSlides);
    if (next.has(id)) next.delete(id); else next.add(id);
    update({ hiddenSlides: next });
  };

  const visibleCount = slides.length - c.hiddenSlides.size;

  if (!isOpen) {
    return (
      <button onClick={onToggle} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
        <Settings2 className="h-3.5 w-3.5" /> Customize
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Settings2 className="h-4 w-4" /> Customize Guidelines
        </h3>
        <button onClick={onToggle} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-border">
        {[
          { key: 'slides' as const, label: 'Slides', icon: Layout },
          { key: 'chrome' as const, label: 'Chrome', icon: Eye },
          { key: 'text' as const, label: 'Text', icon: Type },
          { key: 'layout' as const, label: 'Layout', icon: Settings2 },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              activeSection === tab.key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-h-[400px] overflow-auto">
        {/* SLIDES TAB */}
        {activeSection === 'slides' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">{visibleCount} of {slides.length} slides visible</p>
              <div className="flex gap-1">
                <button onClick={() => update({ hiddenSlides: new Set() })} className="text-[10px] text-primary hover:underline">Show All</button>
                <span className="text-muted-foreground text-[10px]">·</span>
                <button onClick={() => update({ hiddenSlides: new Set(slides.map(s => s.id)) })} className="text-[10px] text-muted-foreground hover:underline">Hide All</button>
              </div>
            </div>
            {slides.map((slide, i) => {
              const hidden = c.hiddenSlides.has(slide.id);
              return (
                <div key={slide.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${hidden ? 'opacity-40' : 'hover:bg-muted/50'}`}>
                  <span className="text-[10px] font-mono text-muted-foreground w-5">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-xs flex-1">{slide.name}</span>
                  <button onClick={() => toggleSlide(slide.id)} className="p-1 rounded hover:bg-muted transition-colors">
                    {hidden ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-foreground" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* CHROME TAB */}
        {activeSection === 'chrome' && (
          <div className="space-y-4">
            {[
              { label: 'Page Numbers', key: 'showPageNumbers' as const, value: c.showPageNumbers },
              { label: 'Brand Mark', key: 'showBrandMark' as const, value: c.showBrandMark },
              { label: 'Date', key: 'showDate' as const, value: c.showDate },
            ].map(toggle => (
              <div key={toggle.key} className="flex items-center justify-between">
                <span className="text-sm">{toggle.label}</span>
                <button
                  onClick={() => update({ [toggle.key]: !toggle.value })}
                  className={`w-9 h-5 rounded-full transition-colors relative ${toggle.value ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${toggle.value ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TEXT TAB */}
        {activeSection === 'text' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Document Title</label>
              <input
                type="text"
                value={c.documentTitle}
                onChange={e => update({ documentTitle: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Version</label>
              <input
                type="text"
                value={c.versionText}
                onChange={e => update({ versionText: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Footer Note</label>
              <input
                type="text"
                value={c.confidentialText}
                onChange={e => update({ confidentialText: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
        )}

        {/* LAYOUT TAB */}
        {activeSection === 'layout' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Page Padding: {c.pagePadding}%</label>
              <input
                type="range"
                min="2"
                max="10"
                step="1"
                value={c.pagePadding}
                onChange={e => update({ pagePadding: Number(e.target.value) })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                <span>Tight</span>
                <span>Spacious</span>
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Current Template</p>
              <p className="text-sm font-medium">{layout.name}</p>
              <p className="text-xs text-muted-foreground">{layout.description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
