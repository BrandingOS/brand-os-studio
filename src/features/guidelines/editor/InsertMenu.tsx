import { useState, useRef } from 'react';
import { Type, Heading1, Image, Square, Link, Smartphone, Quote, StickyNote, GitBranch, LayoutGrid, Plus, Upload, FolderOpen, Check } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';

interface InsertMenuProps {
  onClose: () => void;
  brand?: Brand;
  onAddAsset?: (name: string, url: string) => void;
}

export function InsertMenu({ onClose, brand, onAddAsset }: InsertMenuProps) {
  const [subMenu, setSubMenu] = useState<null | 'media' | 'logo'>('null');
  const [addToAssets, setAddToAssets] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const findSlideContent = () => {
    const canvas = document.querySelector('[data-slide-canvas]');
    if (!canvas) return null;
    const editableInner = canvas.querySelector('.relative > div');
    if (editableInner?.firstElementChild) return editableInner.firstElementChild;
    const candidates = canvas.querySelectorAll('div');
    for (const c of candidates) {
      if (c.children.length >= 2 && c.textContent && c.textContent.trim().length > 10) return c;
    }
    return canvas;
  };

  const insertAndHighlight = (el: HTMLElement) => {
    const container = findSlideContent();
    if (!container) { toast.error('No slide selected'); return; }
    container.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    el.style.transition = 'outline 0.3s ease';
    el.style.outline = '2px solid rgba(59, 130, 246, 0.5)';
    el.style.outlineOffset = '2px';
    setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 1500);
  };

  const handleImageUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'max-width: 100%; border-radius: 8px; margin: 8px; position: relative;';
    insertAndHighlight(img);

    if (addToAssets && onAddAsset) {
      // Also read as data URL for persistent storage
      const reader = new FileReader();
      reader.onload = () => {
        onAddAsset(file.name.replace(/\.[^.]+$/, ''), reader.result as string);
        toast.success(`Image added to slide${addToAssets ? ' + Brand Assets' : ''}`);
      };
      reader.readAsDataURL(file);
    } else {
      toast.success('Image added to slide');
    }
    onClose();
  };

  const insertFromUrl = (url: string, name: string) => {
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'max-width: 100%; border-radius: 8px; margin: 8px; position: relative;';
    img.crossOrigin = 'anonymous';
    insertAndHighlight(img);
    toast.success(`${name} inserted`);
    onClose();
  };

  const insertElement = (type: string) => {
    let newEl: HTMLElement;
    switch (type) {
      case 'paragraph':
        newEl = document.createElement('p');
        newEl.textContent = 'New paragraph text. Double-click to edit.';
        newEl.style.cssText = 'font-size: 14px; color: inherit; padding: 8px; margin: 8px; cursor: text; opacity: 0.7; position: relative;';
        break;
      case 'heading':
        newEl = document.createElement('h2');
        newEl.textContent = 'New Heading';
        newEl.style.cssText = 'font-size: 28px; font-weight: 700; color: inherit; padding: 8px; margin: 8px; cursor: text; position: relative;';
        break;
      case 'quote':
        newEl = document.createElement('blockquote');
        newEl.textContent = '"Your quote goes here"';
        newEl.style.cssText = 'font-size: 18px; font-style: italic; color: inherit; padding: 16px; margin: 8px; border-left: 3px solid currentColor; opacity: 0.7; position: relative;';
        break;
      case 'sticky':
        newEl = document.createElement('div');
        newEl.textContent = 'Sticky note — double-click to edit';
        newEl.style.cssText = 'background: #FEF3C7; color: #92400E; padding: 12px; margin: 8px; border-radius: 4px; font-size: 13px; width: fit-content; position: relative; cursor: text;';
        break;
      case 'card':
        newEl = document.createElement('div');
        newEl.innerHTML = '<h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">Card Title</h3><p style="font-size: 13px; opacity: 0.6;">Card description.</p>';
        newEl.style.cssText = 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; margin: 8px; color: inherit; cursor: text; position: relative;';
        break;
      default:
        newEl = document.createElement('div');
        newEl.textContent = `New ${type} block`;
        newEl.style.cssText = 'padding: 8px; margin: 8px; color: inherit; opacity: 0.5; font-size: 13px; position: relative;';
    }
    insertAndHighlight(newEl);
    toast.success(`Added ${type}`);
    onClose();
  };

  // ─── MEDIA SUB-MENU ────────────────────────────────────────
  if (subMenu === 'media') {
    const brandAssets = (brand?.assets || []).filter(a => a.type === 'image' || a.type === 'logo' || a.type === 'icon');

    return (
      <div className="w-72 bg-[#222] rounded-2xl shadow-2xl border border-white/[0.06] py-2 animate-in fade-in duration-100">
        <div className="px-3 py-1 flex items-center justify-between">
          <button onClick={() => setSubMenu(null)} className="text-[10px] text-white/30 hover:text-white/60">← Back</button>
          <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold">Media</p>
          <div className="w-8" />
        </div>

        {/* Upload */}
        <div className="px-3 py-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }} />
          <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl border border-dashed border-white/10 hover:border-white/25 text-white/50 hover:text-white transition-colors">
            <Upload className="h-4 w-4" />
            <div className="text-left">
              <span className="text-[12px] font-medium block">Upload Image</span>
              <span className="text-[9px] text-white/25">PNG, JPG, SVG, WebP</span>
            </div>
          </button>
        </div>

        {/* Add to assets checkbox */}
        <div className="px-4 py-1.5">
          <label className="flex items-center gap-2 cursor-pointer group">
            <button onClick={() => setAddToAssets(!addToAssets)} className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${addToAssets ? 'bg-blue-500 border-blue-500' : 'border-white/20 hover:border-white/40'}`}>
              {addToAssets && <Check className="h-3 w-3 text-white" />}
            </button>
            <span className="text-[11px] text-white/40 group-hover:text-white/60">Also add to Brand Assets</span>
          </label>
        </div>

        {/* From Brand Assets */}
        {brandAssets.length > 0 && (
          <>
            <div className="mx-3 my-1.5 border-t border-white/[0.06]" />
            <div className="px-3 py-1">
              <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold flex items-center gap-1"><FolderOpen className="h-3 w-3" /> Brand Assets</p>
            </div>
            <div className="px-3 max-h-32 overflow-auto space-y-1">
              {brandAssets.map(asset => (
                <button key={asset.id} onClick={() => insertFromUrl(asset.url, asset.name)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  {asset.url ? (
                    <img src={asset.url} alt="" className="w-8 h-8 object-contain rounded bg-white/5 p-0.5" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-[8px] text-white/20">IMG</div>
                  )}
                  <span className="text-[11px] text-white/50 truncate">{asset.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── LOGO SUB-MENU ─────────────────────────────────────────
  if (subMenu === 'logo') {
    const logoAssets = (brand?.assets || []).filter(a => a.type === 'logo');
    const hasLogo = !!brand?.logo;

    return (
      <div className="w-72 bg-[#222] rounded-2xl shadow-2xl border border-white/[0.06] py-2 animate-in fade-in duration-100">
        <div className="px-3 py-1 flex items-center justify-between">
          <button onClick={() => setSubMenu(null)} className="text-[10px] text-white/30 hover:text-white/60">← Back</button>
          <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold">Logo</p>
          <div className="w-8" />
        </div>

        {/* Primary logo */}
        {hasLogo && (
          <div className="px-3 py-2">
            <button onClick={() => insertFromUrl(brand!.logo!, 'Primary Logo')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.03] transition-colors">
              <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center p-1.5">
                <img src={brand!.logo!} alt="" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="text-left">
                <span className="text-[12px] font-medium text-white/70 block">Primary Logo</span>
                <span className="text-[9px] text-white/25">Original color version</span>
              </div>
            </button>
          </div>
        )}

        {/* Logo on dark */}
        {hasLogo && (
          <div className="px-3 py-1">
            <button onClick={() => { insertFromUrl(brand!.logo!, 'Logo (white)'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#0a0a0f] flex items-center justify-center p-1.5">
                <img src={brand!.logo!} alt="" className="max-w-full max-h-full object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
              </div>
              <div className="text-left">
                <span className="text-[11px] text-white/50">White version</span>
              </div>
            </button>
          </div>
        )}

        {/* Logo on brand color */}
        {hasLogo && (
          <div className="px-3 py-1">
            <button onClick={() => insertFromUrl(brand!.logo!, 'Logo (on brand)')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center p-1.5" style={{ backgroundColor: brand!.primaryColor }}>
                <img src={brand!.logo!} alt="" className="max-w-full max-h-full object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
              </div>
              <div className="text-left">
                <span className="text-[11px] text-white/50">On brand color</span>
              </div>
            </button>
          </div>
        )}

        {/* Additional logo assets */}
        {logoAssets.length > 0 && (
          <>
            <div className="mx-3 my-1.5 border-t border-white/[0.06]" />
            <div className="px-3 py-1">
              <p className="text-[9px] text-white/15 uppercase tracking-wider">Logo Assets</p>
            </div>
            <div className="px-3 max-h-28 overflow-auto space-y-1">
              {logoAssets.map(asset => (
                <button key={asset.id} onClick={() => insertFromUrl(asset.url, asset.name)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <img src={asset.url} alt="" className="w-7 h-7 object-contain rounded bg-white/5 p-0.5" />
                  <span className="text-[10px] text-white/40 truncate">{asset.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {!hasLogo && logoAssets.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-[11px] text-white/20">No logo uploaded</p>
            <p className="text-[9px] text-white/10 mt-1">Add a logo in Brand Settings</p>
          </div>
        )}
      </div>
    );
  }

  // ─── MAIN INSERT MENU ──────────────────────────────────────
  const widgets = [
    { icon: Type, label: 'Paragraph', action: () => insertElement('paragraph') },
    { icon: Heading1, label: 'Heading', action: () => insertElement('heading') },
  ];

  return (
    <div className="w-56 bg-[#222] rounded-2xl shadow-2xl border border-white/[0.06] py-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="px-3 py-1">
        <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold">Insert widget</p>
      </div>

      {widgets.map(w => (
        <button key={w.label} onClick={w.action} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
          <w.icon className="h-4 w-4 text-white/30" />
          <span className="flex-1 text-left">{w.label}</span>
        </button>
      ))}

      <div className="mx-3 my-1 border-t border-white/[0.06]" />

      {/* Media — opens sub-menu */}
      <button onClick={() => setSubMenu('media')} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
        <Image className="h-4 w-4 text-white/30" />
        <span className="flex-1 text-left">Media</span>
        <span className="text-white/15 text-[10px]">›</span>
      </button>

      {/* Logo — separate section, opens sub-menu */}
      <button onClick={() => setSubMenu('logo')} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
        <svg className="h-4 w-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
        <span className="flex-1 text-left">Logo</span>
        <span className="text-white/15 text-[10px]">›</span>
      </button>

      <div className="mx-3 my-1 border-t border-white/[0.06]" />

      <button onClick={() => insertElement('card')} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
        <Square className="h-4 w-4 text-white/30" /><span className="flex-1 text-left">Card</span><span className="text-white/15 text-[10px]">›</span>
      </button>
      <button onClick={() => insertElement('quote')} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
        <Quote className="h-4 w-4 text-white/30" /><span>Quote</span>
      </button>
      <button onClick={() => insertElement('sticky')} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
        <StickyNote className="h-4 w-4 text-white/30" /><span>Sticky note</span>
      </button>

      <div className="mx-3 my-1 border-t border-white/[0.06]" />
      <div className="px-3 py-1">
        <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold">Add structure</p>
      </div>
      <button onClick={() => { toast.success('Choose a template from Remix'); onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
        <LayoutGrid className="h-4 w-4 text-white/30" /><span>Choose template</span>
      </button>
      <button onClick={() => { toast.success('Blank chapter added'); onClose(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
        <Plus className="h-4 w-4 text-white/30" /><span>Blank chapter</span>
      </button>
    </div>
  );
}
