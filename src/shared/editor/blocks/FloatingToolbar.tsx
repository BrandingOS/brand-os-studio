/**
 * FloatingToolbar — appears above a selected block.
 * Every button is functional.
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, MoreHorizontal, Maximize2, Trash2, Copy, AlignLeft, AlignCenter, AlignRight, Upload, FolderOpen, ImageIcon } from 'lucide-react';
import type { BlockType } from './BlockTypes';
import { TURN_INTO_OPTIONS } from './BlockTypes';
import { useEditorContext } from '../EditorContext';
import { toast } from 'sonner';

interface FloatingToolbarProps {
  blockType: BlockType;
  style: { fontWeight?: string; fontStyle?: string; textAlign?: string; color?: string; fontSize?: string; objectFit?: string };
  onChangeType: (type: BlockType) => void;
  onChangeStyle: (key: string, value: string) => void;
  position: { top: number; left: number; width: number };
  onDelete?: () => void;
  onDuplicate?: () => void;
  onReplace?: () => void;
}

const FONT_WEIGHTS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
  { value: '900', label: 'Black' },
];

const FONT_SIZES = [
  { value: '12px', label: '12' }, { value: '14px', label: '14' }, { value: '16px', label: '16' },
  { value: '20px', label: '20' }, { value: '24px', label: '24' }, { value: '32px', label: '32' },
  { value: '40px', label: '40' }, { value: '48px', label: '48' }, { value: '64px', label: '64' },
  { value: '72px', label: '72' }, { value: '96px', label: '96' },
];

const COLORS = ['#ffffff', '#000000', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];

const ALIGN_ICONS: Record<string, typeof AlignLeft> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
};

export function FloatingToolbar({ blockType, style, onChangeType, onChangeStyle, position, onDelete, onDuplicate, onReplace }: FloatingToolbarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isText = blockType === 'text' || blockType === 'heading';
  const isImage = blockType === 'image' || blockType === 'logo';

  // Brand assets from editor context — used to populate the asset picker
  const editorCtx = useEditorContext();
  const brand = editorCtx?.brand;
  const imageAssets = (brand?.assets || []).filter(a =>
    a.type === 'image' || a.type === 'logo' || a.type === 'icon'
  );

  const toggleDropdown = (id: string) => setOpenDropdown(prev => prev === id ? null : id);

  // Close dropdown when clicking outside toolbar
  useEffect(() => {
    if (!openDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    // Delay to avoid closing immediately from the click that opened it
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openDropdown]);

  const currentWeightLabel = FONT_WEIGHTS.find(w => w.value === style.fontWeight)?.label || 'Medium';
  const currentFontSize = style.fontSize ? parseInt(style.fontSize) + 'px' : 'Aa';

  const currentAlign = style.textAlign || 'left';
  const AlignIcon = ALIGN_ICONS[currentAlign] || AlignLeft;

  const isBold = style.fontWeight === '700' || style.fontWeight === 'bold';
  const isItalic = style.fontStyle === 'italic';

  const handleReplace = () => {
    if (onReplace) {
      onReplace();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChangeStyle('__replaceImageSrc', url);
    toast.success('Image replaced');
  };

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[60] flex items-center gap-0.5 bg-[#2a2a2a] rounded-xl px-1 py-1 shadow-2xl border border-white/[0.08] animate-in fade-in duration-100"
      style={{ top: Math.max(8, position.top - 56), left: Math.min(window.innerWidth - 500, Math.max(8, position.left + position.width / 2 - 250)) }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Hidden file input for image replace */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

      {/* Block type / Turn Into */}
      <div className="relative">
        <button onClick={() => toggleDropdown('turnInto')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] text-white/70 hover:text-white hover:bg-white/10 transition-colors">
          {isText ? (blockType === 'heading' ? 'Heading' : 'Paragraph') : isImage ? 'Image' : blockType}
          <ChevronDown className="h-3 w-3 text-white/30" />
        </button>
        {openDropdown === 'turnInto' && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-[#2a2a2a] rounded-xl border border-white/[0.08] py-1 shadow-2xl z-50">
            <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold px-3 py-1">Turn into</p>
            {TURN_INTO_OPTIONS.map(opt => (
              <button key={opt.type} onClick={() => { onChangeType(opt.type); setOpenDropdown(null); toast.success(`Changed to ${opt.label}`); }}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors ${opt.type === blockType ? 'text-white bg-white/5' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                <span className="w-4 text-center text-white/30 text-[11px]">{opt.icon}</span>
                <span className="flex-1 text-left">{opt.label}</span>
                {opt.type === blockType && <span className="text-white/40 text-[10px]">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {isText && (
        <>
          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* Font weight dropdown */}
          <div className="relative">
            <button onClick={() => toggleDropdown('weight')} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[12px] text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              {currentWeightLabel} <ChevronDown className="h-3 w-3 text-white/20" />
            </button>
            {openDropdown === 'weight' && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-[#2a2a2a] rounded-xl border border-white/[0.08] py-1 shadow-2xl z-50">
                {FONT_WEIGHTS.map(w => (
                  <button key={w.value} onClick={() => { onChangeStyle('fontWeight', w.value); setOpenDropdown(null); }}
                    className={`w-full px-3 py-1.5 text-left text-[12px] transition-colors ${style.fontWeight === w.value ? 'text-white bg-white/5' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                    style={{ fontWeight: Number(w.value) }}>{w.label}</button>
                ))}
              </div>
            )}
          </div>

          {/* Font size dropdown */}
          <div className="relative">
            <button onClick={() => toggleDropdown('fontSize')} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[12px] text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              {currentFontSize} <ChevronDown className="h-3 w-3 text-white/20" />
            </button>
            {openDropdown === 'fontSize' && (
              <div className="absolute top-full left-0 mt-1 w-28 bg-[#2a2a2a] rounded-xl border border-white/[0.08] py-1 shadow-2xl z-50 max-h-48 overflow-auto">
                {FONT_SIZES.map(s => (
                  <button key={s.value} onClick={() => { onChangeStyle('fontSize', s.value); setOpenDropdown(null); }}
                    className={`w-full px-3 py-1 text-left text-[12px] transition-colors ${style.fontSize === s.value ? 'text-white bg-white/5' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>{s.label}px</button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* Color picker */}
          <div className="relative">
            <button onClick={() => toggleDropdown('color')} className="flex items-center gap-1 px-1.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: style.color || '#ffffff' }} />
              <ChevronDown className="h-3 w-3 text-white/20" />
            </button>
            {openDropdown === 'color' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-[#2a2a2a] rounded-xl border border-white/[0.08] p-2 shadow-2xl z-50">
                <div className="flex gap-1.5 mb-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => { onChangeStyle('color', c); setOpenDropdown(null); }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${style.color === c ? 'border-white scale-110' : 'border-white/10 hover:border-white/30'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                {/* Custom color input */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-white/[0.06]">
                  <input
                    type="color"
                    value={style.color || '#ffffff'}
                    onChange={e => { onChangeStyle('color', e.target.value); }}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-[10px] text-white/30">Custom</span>
                </div>
              </div>
            )}
          </div>

          {/* Alignment */}
          <div className="relative">
            <button onClick={() => toggleDropdown('align')} className="flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-[12px] text-white/50 hover:text-white hover:bg-white/10 transition-colors">
              <AlignIcon className="h-3.5 w-3.5" /> <ChevronDown className="h-3 w-3 text-white/20" />
            </button>
            {openDropdown === 'align' && (
              <div className="absolute top-full left-0 mt-1 w-28 bg-[#2a2a2a] rounded-xl border border-white/[0.08] py-1 shadow-2xl z-50">
                {(['left', 'center', 'right'] as const).map(a => {
                  const Icon = ALIGN_ICONS[a];
                  return (
                    <button key={a} onClick={() => { onChangeStyle('textAlign', a); setOpenDropdown(null); }}
                      className={`w-full px-3 py-1.5 text-left text-[12px] capitalize transition-colors flex items-center gap-2 ${style.textAlign === a ? 'text-white bg-white/5' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {a}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* Bold toggle */}
          <button onClick={() => onChangeStyle('fontWeight', isBold ? '400' : '700')}
            className={`px-1.5 py-1 rounded-lg text-[13px] font-bold transition-colors ${isBold ? 'text-white bg-white/15' : 'text-white/40 hover:text-white hover:bg-white/10'}`}>B</button>
          {/* Italic toggle */}
          <button onClick={() => onChangeStyle('fontStyle', isItalic ? 'normal' : 'italic')}
            className={`px-1.5 py-1 rounded-lg text-[13px] italic transition-colors ${isItalic ? 'text-white bg-white/15' : 'text-white/40 hover:text-white hover:bg-white/10'}`}>I</button>
        </>
      )}

      {isImage && (
        <>
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          {/* Replace dropdown — Upload + Brand Assets */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('replace')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              Replace <ChevronDown className="h-3 w-3" />
            </button>
            {openDropdown === 'replace' && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-[#2a2a2a] rounded-xl border border-white/[0.08] shadow-2xl z-50 overflow-hidden">
                {/* Upload from device */}
                <button
                  onClick={() => { fileInputRef.current?.click(); setOpenDropdown(null); }}
                  className="w-full px-3 py-2.5 text-left text-[12px] text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2 border-b border-white/[0.04]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <div className="flex-1">
                    <div>Upload from device</div>
                    <div className="text-[10px] text-white/30">PNG, JPG, SVG, WebP</div>
                  </div>
                </button>

                {/* Brand Assets section */}
                <div className="px-3 py-2 flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
                  <FolderOpen className="h-3 w-3" />
                  Brand Assets ({imageAssets.length})
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {imageAssets.length === 0 ? (
                    <div className="px-3 py-6 text-center text-[11px] text-white/25">
                      No image assets in brand library
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 p-2">
                      {imageAssets.map((asset) => (
                        <button
                          key={asset.id}
                          onClick={() => {
                            onChangeStyle('__replaceImageSrc', asset.url);
                            setOpenDropdown(null);
                            toast.success(`Replaced with ${asset.name}`);
                          }}
                          className="group relative aspect-square rounded-md overflow-hidden bg-white/[0.04] border border-white/[0.06] hover:border-white/20 transition-colors"
                          title={asset.name}
                        >
                          <img
                            src={asset.url}
                            alt={asset.name}
                            className="w-full h-full object-contain p-1"
                            loading="lazy"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="text-[8px] text-white/80 truncate">{asset.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => {
            const currentFit = style.objectFit || 'cover';
            const nextFit = currentFit === 'cover' ? 'contain' : currentFit === 'contain' ? 'fill' : 'cover';
            onChangeStyle('objectFit', nextFit);
            toast.success(`Object fit: ${nextFit}`);
          }} className="px-2 py-1.5 rounded-lg text-[11px] text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            {style.objectFit === 'contain' ? 'Contain' : style.objectFit === 'fill' ? 'Fill' : 'Cover'}
          </button>
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          <button onClick={() => {
            onChangeStyle('width', '100%');
            onChangeStyle('height', '100%');
            toast.success('Expanded to full size');
          }} className="px-1.5 py-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"><Maximize2 className="h-3.5 w-3.5" /></button>
        </>
      )}

      <div className="w-px h-4 bg-white/10 mx-0.5" />

      {/* Duplicate / Delete / More */}
      <button onClick={() => { onDuplicate?.(); toast.success('Duplicated'); }} className="px-1 py-1 rounded-lg text-white/25 hover:text-white hover:bg-white/10 transition-colors"><Copy className="h-3.5 w-3.5" /></button>
      <button onClick={() => { onDelete?.(); toast.success('Deleted'); }} className="px-1 py-1 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
      <button onClick={() => toggleDropdown('more')} className="px-1 py-1 rounded-lg text-white/25 hover:text-white hover:bg-white/10 transition-colors"><MoreHorizontal className="h-3.5 w-3.5" /></button>

      {openDropdown === 'more' && (
        <div className="absolute top-full right-0 mt-1 w-40 bg-[#2a2a2a] rounded-xl border border-white/[0.08] py-1 shadow-2xl z-50">
          <button onClick={() => { onDuplicate?.(); setOpenDropdown(null); }} className="w-full px-3 py-1.5 text-left text-[12px] text-white/50 hover:text-white hover:bg-white/5 flex items-center gap-2"><Copy className="h-3 w-3" /> Duplicate</button>
          <button onClick={() => { onChangeStyle('opacity', '0.5'); setOpenDropdown(null); }} className="w-full px-3 py-1.5 text-left text-[12px] text-white/50 hover:text-white hover:bg-white/5">Set opacity 50%</button>
          <button onClick={() => { onChangeStyle('opacity', '1'); setOpenDropdown(null); }} className="w-full px-3 py-1.5 text-left text-[12px] text-white/50 hover:text-white hover:bg-white/5">Reset opacity</button>
          <div className="my-1 mx-2 border-t border-white/[0.06]" />
          <button onClick={() => { onDelete?.(); setOpenDropdown(null); }} className="w-full px-3 py-1.5 text-left text-[12px] text-red-400 hover:bg-red-400/10 flex items-center gap-2"><Trash2 className="h-3 w-3" /> Delete</button>
        </div>
      )}
    </div>
  );
}
