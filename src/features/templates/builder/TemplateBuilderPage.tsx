/**
 * Template Builder — visual, no-code template creation.
 *
 * Three-panel layout:
 *   Left: Elements library + Variables panel
 *   Center: Live canvas preview (DOM Renderer)
 *   Right: Properties panel with variable binding
 *
 * The builder produces a TemplateDefinition JSON that can be saved to the
 * store and used across any brand.
 */
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditorChrome, useAutoSave } from '@/features/editor/core';
import { DomRenderer } from '@/shared/templates/renderers/DomRenderer';
import { resolveTemplate } from '@/shared/templates/engine/resolve';
import { useTemplateStore } from '@/shared/templates/store/templateStore';
import { useBrandStore } from '@/shared/store/brandStore';
import { BRAND_VARIABLES, getVariablesByCategory } from '@/shared/templates/variables/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { TemplateDefinition, TemplateElement, TextElement, ShapeElement, LogoElement, TemplateType, TemplatePage } from '@/shared/templates/types';
import {
  Type, Square, Circle, Image, Sparkles, Plus, Trash2, Copy, Save,
  ChevronDown, Link2, Unlink, Eye, Palette, Layers, Settings,
  MoveVertical, GripVertical,
} from 'lucide-react';

// ─── Canvas dimension presets ─────────────────────────────────────

const SIZE_PRESETS: Record<string, { width: number; height: number; label: string }> = {
  'business-card': { width: 1050, height: 600, label: 'Business Card (1050×600)' },
  'social-post':   { width: 1080, height: 1080, label: 'Social Post (1080×1080)' },
  'social-story':  { width: 1080, height: 1920, label: 'Story (1080×1920)' },
  'social-cover':  { width: 1640, height: 624, label: 'Cover (1640×624)' },
  'presentation':  { width: 1920, height: 1080, label: 'Presentation (16:9)' },
  'a4-portrait':   { width: 794, height: 1123, label: 'A4 Portrait' },
  'custom':        { width: 800, height: 600, label: 'Custom' },
};

// ─── Default new template ─────────────────────────────────────────

function createBlankTemplate(type: TemplateType = 'custom'): TemplateDefinition {
  const preset = SIZE_PRESETS[type] || SIZE_PRESETS['custom'];
  return {
    id: crypto.randomUUID(),
    version: 1,
    meta: { name: 'Untitled Template', type, category: 'Custom', tags: [] },
    canvas: { width: preset.width, height: preset.height },
    pages: [{
      id: 'page-1',
      background: { type: 'solid', value: '#ffffff' },
      elements: [],
    }],
    variables: [],
  };
}

// ─── Element factories ────────────────────────────────────────────

let elementCounter = 0;

function createTextElement(): TextElement {
  elementCounter++;
  return {
    id: `text-${elementCounter}`,
    type: 'text',
    position: { x: 10, y: 10 + (elementCounter * 8 % 60) },
    size: { width: 60, height: 8 },
    content: 'Edit this text',
    style: { fontFamily: '{{brand.fonts.primary}}', fontSize: 18, color: '#333333' },
  };
}

function createShapeElement(): ShapeElement {
  elementCounter++;
  return {
    id: `shape-${elementCounter}`,
    type: 'shape',
    position: { x: 20, y: 20 + (elementCounter * 5 % 50) },
    size: { width: 30, height: 10 },
    shape: 'rect',
    style: { fill: '{{brand.colors.primary}}', borderRadius: 4 },
  };
}

function createLogoElement(): LogoElement {
  elementCounter++;
  return {
    id: `logo-${elementCounter}`,
    type: 'logo',
    position: { x: 5, y: 5 },
    size: { width: 20, height: 12 },
    variant: 'full',
    src: '{{brand.logo}}',
  };
}

// ─── Component ────────────────────────────────────────────────────

export default function TemplateBuilderPage() {
  const navigate = useNavigate();
  const { save: saveTemplate } = useTemplateStore();
  const brands = useBrandStore((s) => s.list);
  const [previewBrandIndex, setPreviewBrandIndex] = useState(0);
  const previewBrand = brands[previewBrandIndex] || null;

  const [template, setTemplate] = useState<TemplateDefinition>(() => createBlankTemplate('business-card'));
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'elements' | 'variables'>('elements');

  const page = template.pages[0];
  const selectedElement = page?.elements.find((e) => e.id === selectedElementId) || null;

  // Auto-save to localStorage
  const { saveState, markDirty, flush, retry } = useAutoSave({
    value: template,
    save: async (t) => localStorage.setItem('template-builder-draft', JSON.stringify(t)),
    debounceMs: 1000,
  });

  // Resolve for preview
  const resolved = useMemo(() => {
    if (!previewBrand) return null;
    return resolveTemplate({ template, brand: previewBrand });
  }, [template, previewBrand]);

  // ─── Template mutations ───────────────────────────────────────

  const updateTemplate = useCallback((updater: (t: TemplateDefinition) => TemplateDefinition) => {
    setTemplate((prev) => {
      const next = updater(prev);
      markDirty();
      return next;
    });
  }, [markDirty]);

  const updatePage = useCallback((updater: (p: TemplatePage) => TemplatePage) => {
    updateTemplate((t) => ({
      ...t,
      pages: [updater(t.pages[0]), ...t.pages.slice(1)],
    }));
  }, [updateTemplate]);

  const addElement = useCallback((el: TemplateElement) => {
    updatePage((p) => ({ ...p, elements: [...p.elements, el] }));
    setSelectedElementId(el.id);
  }, [updatePage]);

  const removeElement = useCallback((id: string) => {
    updatePage((p) => ({ ...p, elements: p.elements.filter((e) => e.id !== id) }));
    if (selectedElementId === id) setSelectedElementId(null);
  }, [updatePage, selectedElementId]);

  const updateElement = useCallback((id: string, patch: Partial<TemplateElement>) => {
    updatePage((p) => ({
      ...p,
      elements: p.elements.map((e) => (e.id === id ? { ...e, ...patch } as TemplateElement : e)),
    }));
  }, [updatePage]);

  const duplicateElement = useCallback((id: string) => {
    const el = page?.elements.find((e) => e.id === id);
    if (!el) return;
    elementCounter++;
    const dup = {
      ...JSON.parse(JSON.stringify(el)),
      id: `${el.type}-${elementCounter}`,
      position: { x: el.position.x + 3, y: el.position.y + 3 },
    };
    addElement(dup);
  }, [page, addElement]);

  const handleSave = useCallback(() => {
    saveTemplate(template);
    toast.success('Template saved');
  }, [template, saveTemplate]);

  const handlePublish = useCallback(() => {
    saveTemplate(template);
    toast.success('Template published to marketplace');
    navigate('/templates');
  }, [template, saveTemplate, navigate]);

  // ─── Variable categories for sidebar ──────────────────────────

  const varCategories = useMemo(() => getVariablesByCategory(), []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <EditorChrome
        backTo="/templates"
        breadcrumb={['Templates']}
        title={
          <input
            value={template.meta.name}
            onChange={(e) => updateTemplate((t) => ({ ...t, meta: { ...t.meta, name: e.target.value } }))}
            className="bg-transparent text-sm font-semibold outline-none w-48"
            placeholder="Template name"
          />
        }
        saveState={saveState}
        onRetry={retry}
        actions={
          <>
            {/* Brand preview switcher */}
            {brands.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={previewBrandIndex}
                  onChange={(e) => setPreviewBrandIndex(Number(e.target.value))}
                  className="bg-transparent text-xs border border-border rounded px-2 py-1"
                >
                  {brands.map((b, i) => (
                    <option key={b.id} value={i}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
            <Button size="sm" onClick={handlePublish} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Publish
            </Button>
          </>
        }
      />

      <div className="flex-1 flex min-h-0">
        {/* ─── LEFT PANEL: Elements + Variables ─────────────────── */}
        <div className="w-[280px] shrink-0 border-r border-border bg-card/50 flex flex-col min-h-0">
          <div className="flex border-b border-border">
            <button onClick={() => setActiveTab('elements')} className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${activeTab === 'elements' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}>
              <Layers className="h-3.5 w-3.5 inline mr-1.5" />Elements
            </button>
            <button onClick={() => setActiveTab('variables')} className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${activeTab === 'variables' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}>
              <Link2 className="h-3.5 w-3.5 inline mr-1.5" />Variables
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'elements' ? (
              <div className="space-y-4">
                {/* Add element buttons */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Add Element</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => addElement(createTextElement())} className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-xs">
                      <Type className="h-4 w-4" />Text
                    </button>
                    <button onClick={() => addElement(createShapeElement())} className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-xs">
                      <Square className="h-4 w-4" />Shape
                    </button>
                    <button onClick={() => addElement(createLogoElement())} className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-xs">
                      <Image className="h-4 w-4" />Logo
                    </button>
                  </div>
                </div>

                {/* Element list */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Layers ({page?.elements.length || 0})</p>
                  <div className="space-y-1">
                    {(page?.elements || []).map((el) => (
                      <div
                        key={el.id}
                        onClick={() => setSelectedElementId(el.id)}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors ${selectedElementId === el.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground'}`}
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground/40" />
                        {el.type === 'text' && <Type className="h-3 w-3 shrink-0" />}
                        {el.type === 'shape' && <Square className="h-3 w-3 shrink-0" />}
                        {el.type === 'logo' && <Image className="h-3 w-3 shrink-0" />}
                        <span className="truncate flex-1">
                          {el.type === 'text' ? (el as TextElement).content.slice(0, 20) : el.id}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); duplicateElement(el.id); }} className="text-muted-foreground/40 hover:text-foreground">
                          <Copy className="h-3 w-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); removeElement(el.id); }} className="text-muted-foreground/40 hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {(page?.elements.length || 0) === 0 && (
                      <p className="text-[11px] text-muted-foreground text-center py-4">Add elements to get started</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Variables tab */
              <div className="space-y-4">
                <p className="text-[11px] text-muted-foreground">
                  Click a variable to copy its reference. Use it in any text or style field.
                </p>
                {Object.entries(varCategories).map(([category, vars]) => (
                  <div key={category}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 capitalize">{category}</p>
                    <div className="space-y-1">
                      {vars.map((v) => (
                        <button
                          key={v.path}
                          onClick={() => {
                            navigator.clipboard.writeText(`{{${v.path}}}`);
                            toast.success(`Copied {{${v.path}}}`);
                          }}
                          className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors text-left"
                        >
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">{v.type}</Badge>
                          <span className="truncate flex-1">{v.label}</span>
                          <Copy className="h-3 w-3 text-muted-foreground/40" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── CENTER: Canvas preview ──────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 bg-muted/20">
          {/* Canvas toolbar */}
          <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border bg-background/50">
            <div className="flex items-center gap-2">
              <select
                value={template.meta.type}
                onChange={(e) => {
                  const type = e.target.value as TemplateType;
                  const preset = SIZE_PRESETS[type] || SIZE_PRESETS['custom'];
                  updateTemplate((t) => ({
                    ...t,
                    meta: { ...t.meta, type },
                    canvas: { width: preset.width, height: preset.height },
                  }));
                }}
                className="text-xs border border-border rounded px-2 py-1 bg-background"
              >
                {Object.entries(SIZE_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>{preset.label}</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-muted-foreground">
              {template.canvas.width} × {template.canvas.height}
            </div>
          </div>

          {/* Canvas area */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            <div
              className="relative bg-white shadow-xl rounded-lg overflow-hidden border border-border"
              style={{
                width: Math.min(template.canvas.width, 600),
                maxWidth: '100%',
              }}
            >
              {resolved ? (
                <DomRenderer template={resolved} />
              ) : (
                <div
                  className="flex items-center justify-center text-sm text-muted-foreground"
                  style={{ aspectRatio: `${template.canvas.width}/${template.canvas.height}` }}
                >
                  {brands.length === 0 ? 'Create a brand to preview' : 'Select a brand to preview'}
                </div>
              )}

              {/* Element selection overlays */}
              {page?.elements.map((el) => (
                <div
                  key={el.id}
                  onClick={() => setSelectedElementId(el.id)}
                  className={`absolute cursor-pointer transition-all ${
                    selectedElementId === el.id
                      ? 'ring-2 ring-primary ring-offset-1'
                      : 'hover:ring-1 hover:ring-primary/30'
                  }`}
                  style={{
                    left: `${el.position.x}%`,
                    top: `${el.position.y}%`,
                    width: `${el.size.width}%`,
                    height: `${el.size.height}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL: Properties ─────────────────────────── */}
        <div className="w-[280px] shrink-0 border-l border-border bg-card/50 flex flex-col min-h-0">
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-xs font-semibold">{selectedElement ? `${selectedElement.type} properties` : 'Template Settings'}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {selectedElement ? (
              <ElementPropertiesPanel
                element={selectedElement}
                onUpdate={(patch) => updateElement(selectedElement.id, patch as Partial<TemplateElement>)}
              />
            ) : (
              /* Template-level settings */
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Template Name</label>
                  <Input
                    value={template.meta.name}
                    onChange={(e) => updateTemplate((t) => ({ ...t, meta: { ...t.meta, name: e.target.value } }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Category</label>
                  <Input
                    value={template.meta.category}
                    onChange={(e) => updateTemplate((t) => ({ ...t, meta: { ...t.meta, category: e.target.value } }))}
                    className="h-8 text-xs"
                    placeholder="e.g., Minimalist, Bold, Elegant"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Background</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={page?.background.value || '#ffffff'}
                      onChange={(e) => updatePage((p) => ({ ...p, background: { type: 'solid', value: e.target.value } }))}
                      className="h-8 w-8 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={page?.background.value || '#ffffff'}
                      onChange={(e) => updatePage((p) => ({ ...p, background: { type: 'solid', value: e.target.value } }))}
                      className="h-8 text-xs flex-1"
                      placeholder="Color or {{brand.colors.primary}}"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tags</label>
                  <Input
                    value={template.meta.tags.join(', ')}
                    onChange={(e) => updateTemplate((t) => ({ ...t, meta: { ...t.meta, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }))}
                    className="h-8 text-xs"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Element Properties Panel ─────────────────────────────────────

function ElementPropertiesPanel({ element, onUpdate }: { element: TemplateElement; onUpdate: (patch: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      {/* Position */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Position (%)</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">X</label>
            <Input type="number" value={element.position.x} onChange={(e) => onUpdate({ position: { ...element.position, x: Number(e.target.value) } })} className="h-7 text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Y</label>
            <Input type="number" value={element.position.y} onChange={(e) => onUpdate({ position: { ...element.position, y: Number(e.target.value) } })} className="h-7 text-xs" />
          </div>
        </div>
      </div>

      {/* Size */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Size (%)</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">Width</label>
            <Input type="number" value={element.size.width} onChange={(e) => onUpdate({ size: { ...element.size, width: Number(e.target.value) } })} className="h-7 text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Height</label>
            <Input type="number" value={element.size.height} onChange={(e) => onUpdate({ size: { ...element.size, height: Number(e.target.value) } })} className="h-7 text-xs" />
          </div>
        </div>
      </div>

      {/* Type-specific properties */}
      {element.type === 'text' && <TextProperties el={element as TextElement} onUpdate={onUpdate} />}
      {element.type === 'shape' && <ShapeProperties el={element as ShapeElement} onUpdate={onUpdate} />}
      {element.type === 'logo' && <LogoProperties el={element as LogoElement} onUpdate={onUpdate} />}
    </div>
  );
}

function TextProperties({ el, onUpdate }: { el: TextElement; onUpdate: (p: any) => void }) {
  return (
    <>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Content</p>
        <textarea
          value={el.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs resize-none h-16"
          placeholder="Text or {{brand.name}}"
        />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Font</p>
        <Input value={el.style.fontFamily} onChange={(e) => onUpdate({ style: { ...el.style, fontFamily: e.target.value } })} className="h-7 text-xs mb-2" placeholder="Font or {{brand.fonts.primary}}" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">Size</label>
            <Input type="number" value={el.style.fontSize} onChange={(e) => onUpdate({ style: { ...el.style, fontSize: Number(e.target.value) } })} className="h-7 text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Weight</label>
            <Input type="number" value={Number(el.style.fontWeight) || 400} onChange={(e) => onUpdate({ style: { ...el.style, fontWeight: Number(e.target.value) } })} className="h-7 text-xs" />
          </div>
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Color</p>
        <div className="flex gap-2">
          <input type="color" value={el.style.color.startsWith('#') ? el.style.color : '#333333'} onChange={(e) => onUpdate({ style: { ...el.style, color: e.target.value } })} className="h-7 w-7 rounded border border-border cursor-pointer" />
          <Input value={el.style.color} onChange={(e) => onUpdate({ style: { ...el.style, color: e.target.value } })} className="h-7 text-xs flex-1" placeholder="Color or {{brand.colors.primary}}" />
        </div>
      </div>
    </>
  );
}

function ShapeProperties({ el, onUpdate }: { el: ShapeElement; onUpdate: (p: any) => void }) {
  return (
    <>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Shape</p>
        <select
          value={el.shape}
          onChange={(e) => onUpdate({ shape: e.target.value })}
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="rect">Rectangle</option>
          <option value="circle">Circle</option>
          <option value="line">Line</option>
        </select>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Fill</p>
        <div className="flex gap-2">
          <input type="color" value={el.style.fill.startsWith('#') ? el.style.fill : '#0066FF'} onChange={(e) => onUpdate({ style: { ...el.style, fill: e.target.value } })} className="h-7 w-7 rounded border border-border cursor-pointer" />
          <Input value={el.style.fill} onChange={(e) => onUpdate({ style: { ...el.style, fill: e.target.value } })} className="h-7 text-xs flex-1" placeholder="Color or {{brand.colors.primary}}" />
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Border Radius</p>
        <Input type="number" value={el.style.borderRadius || 0} onChange={(e) => onUpdate({ style: { ...el.style, borderRadius: Number(e.target.value) } })} className="h-7 text-xs" />
      </div>
    </>
  );
}

function LogoProperties({ el, onUpdate }: { el: LogoElement; onUpdate: (p: any) => void }) {
  return (
    <>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Logo Variant</p>
        <select
          value={el.variant}
          onChange={(e) => onUpdate({ variant: e.target.value })}
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="full">Full Logo</option>
          <option value="icon">Icon Only</option>
          <option value="wordmark">Wordmark</option>
          <option value="monogram">Monogram</option>
          <option value="auto">Auto</option>
        </select>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Source</p>
        <Input value={el.src} onChange={(e) => onUpdate({ src: e.target.value })} className="h-7 text-xs" placeholder="{{brand.logo}}" />
      </div>
    </>
  );
}
