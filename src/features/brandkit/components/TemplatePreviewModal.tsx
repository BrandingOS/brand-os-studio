import { useState, useRef, useMemo } from 'react';
import { X, Download, Bookmark, Edit3, RotateCcw, Palette, Type, Image as ImageIcon, MessageSquare, Hash, Globe, Phone, Mail, AtSign, FileText, Megaphone } from 'lucide-react';
import type { BrandKitTemplate } from '../types';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';

interface TemplatePreviewModalProps {
  template: BrandKitTemplate;
  brand: Brand;
  onClose: () => void;
  onSave: (template: BrandKitTemplate) => void;
  onOpenEditor?: () => void;
  renderPreview: (overrides: TemplateOverrides) => React.ReactNode;
}

export interface TemplateOverrides {
  name?: string;
  title?: string;
  subtitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  showLogo?: boolean;
  // Social
  headline?: string;
  body?: string;
  cta?: string;
  // Business card
  email?: string;
  phone?: string;
  website?: string;
  // Presentation
  slideTitle?: string;
  slideSubtitle?: string;
}

interface EditorField {
  key: keyof TemplateOverrides;
  label: string;
  icon: React.ElementType;
  type?: string;
  placeholder?: string;
}

function getEditorFields(templateType: string): EditorField[] {
  switch (templateType) {
    case 'business-cards':
      return [
        { key: 'title', label: 'Full Name', icon: Type, placeholder: 'Jane Smith' },
        { key: 'subtitle', label: 'Job Title', icon: AtSign, placeholder: 'Brand Manager' },
        { key: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'jane@company.com' },
        { key: 'phone', label: 'Phone', icon: Phone, type: 'tel', placeholder: '+1 234 56789' },
        { key: 'website', label: 'Website', icon: Globe, placeholder: 'company.com' },
      ];
    case 'facebook-covers':
      return [
        { key: 'headline', label: 'Headline', icon: Megaphone, placeholder: 'Your tagline here' },
        { key: 'body', label: 'Description', icon: MessageSquare, placeholder: 'Supporting text...' },
      ];
    case 'instagram-posts':
      return [
        { key: 'headline', label: 'Post Headline', icon: Megaphone, placeholder: 'Bold statement' },
        { key: 'body', label: 'Post Body', icon: MessageSquare, placeholder: 'Supporting copy...' },
        { key: 'cta', label: 'CTA Text', icon: Hash, placeholder: 'Learn More' },
      ];
    case 'instagram-stories':
      return [
        { key: 'headline', label: 'Story Headline', icon: Megaphone, placeholder: 'Your headline' },
        { key: 'cta', label: 'CTA Text', icon: Hash, placeholder: 'Swipe Up' },
      ];
    case 'presentations':
      return [
        { key: 'slideTitle', label: 'Slide Title', icon: FileText, placeholder: 'Presentation Title' },
        { key: 'slideSubtitle', label: 'Subtitle', icon: MessageSquare, placeholder: 'Subtitle or date' },
      ];
    case 'invoices':
      return [
        { key: 'title', label: 'Company Name', icon: Type, placeholder: 'Client Corp' },
        { key: 'subtitle', label: 'Invoice #', icon: Hash, placeholder: 'INV-0042' },
      ];
    case 'brand-guides':
      return [
        { key: 'slideTitle', label: 'Guide Title', icon: FileText, placeholder: 'Brand Guidelines' },
        { key: 'slideSubtitle', label: 'Version', icon: Hash, placeholder: 'v2.0 — 2025' },
      ];
    case 'profile-icons':
      return []; // Only colors and logo toggle
    case 'mockups':
      return [
        { key: 'headline', label: 'Product Label', icon: Type, placeholder: 'Your product' },
      ];
    default:
      return [
        { key: 'headline', label: 'Headline', icon: Type, placeholder: 'Your text here' },
      ];
  }
}

function getDefaultOverrides(templateType: string, brand: Brand): TemplateOverrides {
  const base = {
    name: brand.name,
    primaryColor: brand.primaryColor,
    secondaryColor: brand.secondaryColor || '#00D4AA',
    showLogo: true,
  };

  switch (templateType) {
    case 'business-cards':
      return { ...base, title: 'Jane Smith', subtitle: 'Brand Manager', email: `jane@${brand.name.toLowerCase()}.com`, phone: '+1 234 56789', website: `${brand.name.toLowerCase()}.com` };
    case 'facebook-covers':
      return { ...base, headline: brand.guidelines?.strategy?.positioning || `${brand.name} — ${brand.tone || ''}`, body: brand.strategy || '' };
    case 'instagram-posts':
      return { ...base, headline: 'Bold statement here', body: 'Supporting copy for the post', cta: 'Learn More' };
    case 'instagram-stories':
      return { ...base, headline: brand.guidelines?.strategy?.positioning || 'Your story headline', cta: 'Swipe Up' };
    case 'presentations':
      return { ...base, slideTitle: 'Quarterly Review', slideSubtitle: 'Q1 2025 — Confidential' };
    case 'invoices':
      return { ...base, title: 'Acme Corp', subtitle: 'INV-0042' };
    case 'brand-guides':
      return { ...base, slideTitle: 'Brand Guidelines', slideSubtitle: 'v2.0 — 2025' };
    case 'mockups':
      return { ...base, headline: brand.name };
    default:
      return { ...base, headline: brand.name };
  }
}

export function TemplatePreviewModal({ template, brand, onClose, onSave, onOpenEditor, renderPreview }: TemplatePreviewModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const defaultOverrides = useMemo(() => getDefaultOverrides(template.type, brand), [template.type, brand]);
  const [overrides, setOverrides] = useState<TemplateOverrides>(defaultOverrides);
  const editorFields = useMemo(() => getEditorFields(template.type), [template.type]);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const el = previewRef.current?.querySelector('[data-export-target]') as HTMLElement | null;
      if (!el) { toast.error('Preview not found'); setDownloading(false); return; }
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, { scale: 4, backgroundColor: null, useCORS: true, logging: false });
      const link = document.createElement('a');
      const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
      link.download = `${slug}-${template.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloaded — ${canvas.width}×${canvas.height}px`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleReset = () => setOverrides(defaultOverrides);

  const aspectClass = template.orientation === 'portrait' ? 'max-w-xs'
    : template.orientation === 'square' ? 'max-w-sm' : 'max-w-xl';

  const typeLabel = template.type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-card rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col w-full max-w-5xl mx-4" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="shrink-0 border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">{template.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{typeLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isEditing ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              {isEditing ? 'Editing' : 'Customize'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto flex">
          {/* Preview Area */}
          <div className="flex-1 flex items-center justify-center p-6 bg-[#f0f0f0] dark:bg-[#1a1a1a]" ref={previewRef}>
            <div className={`${aspectClass} w-full`}>
              <div
                data-export-target
                className={`w-full ${template.orientation === 'portrait' ? 'aspect-[9/16]' : template.orientation === 'square' ? 'aspect-square' : 'aspect-video'} rounded-lg overflow-hidden shadow-lg`}
              >
                {renderPreview(overrides)}
              </div>
            </div>
          </div>

          {/* Editor Panel */}
          {isEditing && (
            <div className="w-72 shrink-0 border-l border-border bg-card overflow-auto">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h4 className="text-sm font-semibold">Customize {typeLabel}</h4>
                <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Type-specific text fields */}
                {editorFields.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Content</h5>
                    {editorFields.map(field => (
                      <div key={field.key}>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                          <field.icon className="h-3 w-3" /> {field.label}
                        </label>
                        <input
                          type={field.type || 'text'}
                          value={(overrides[field.key] as string) || ''}
                          onChange={e => setOverrides(p => ({ ...p, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Colors — always available */}
                <div className="space-y-3">
                  <h5 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Palette className="h-3 w-3" /> Colors
                  </h5>
                  <div className="flex items-center gap-2">
                    <input type="color" value={overrides.primaryColor} onChange={e => setOverrides(p => ({ ...p, primaryColor: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer p-0" />
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground">Primary</span>
                      <p className="text-[10px] font-mono">{overrides.primaryColor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={overrides.secondaryColor} onChange={e => setOverrides(p => ({ ...p, secondaryColor: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer p-0" />
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground">Secondary</span>
                      <p className="text-[10px] font-mono">{overrides.secondaryColor}</p>
                    </div>
                  </div>
                </div>

                {/* Logo Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> Show Logo
                  </label>
                  <button
                    onClick={() => setOverrides(p => ({ ...p, showLogo: !p.showLogo }))}
                    className={`w-9 h-5 rounded-full transition-colors relative ${overrides.showLogo ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${overrides.showLogo ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-5 py-3 flex items-center gap-3">
          <button onClick={handleDownload} disabled={downloading} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
            <Download className="h-4 w-4" />
            {downloading ? 'Exporting...' : 'Download PNG'}
          </button>
          <button onClick={() => { onSave(template); toast.success('Saved to collection'); }} className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-xl font-medium text-sm hover:bg-muted transition-colors">
            <Bookmark className="h-4 w-4" />
            Save
          </button>
          {onOpenEditor && (
            <button onClick={onOpenEditor} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1e1e2e] text-white rounded-xl font-medium text-sm hover:bg-[#2a2a3e] transition-colors">
              <Edit3 className="h-4 w-4" />
              Open in Editor
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{typeLabel} — {template.orientation}</span>
        </div>
      </div>
    </div>
  );
}
