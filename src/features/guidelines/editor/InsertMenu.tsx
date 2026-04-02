import { Type, Heading1, Image, Square, Link, Smartphone, Quote, StickyNote, GitBranch, LayoutGrid, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface InsertMenuProps {
  onClose: () => void;
}

export function InsertMenu({ onClose }: InsertMenuProps) {
  const insertElement = (type: string) => {
    // Find the current slide canvas and add an element
    const canvas = document.querySelector('[data-slide-canvas]');
    if (!canvas) { toast.error('No slide selected'); return; }

    const slideContent = canvas.querySelector('.relative') || canvas.firstElementChild;
    if (!slideContent) return;

    let newEl: HTMLElement;

    switch (type) {
      case 'paragraph':
        newEl = document.createElement('p');
        newEl.textContent = 'New paragraph text. Double-click to edit.';
        newEl.style.cssText = 'font-size: 14px; color: inherit; padding: 8px; margin: 8px; cursor: text; opacity: 0.7;';
        newEl.contentEditable = 'false';
        break;
      case 'heading':
        newEl = document.createElement('h2');
        newEl.textContent = 'New Heading';
        newEl.style.cssText = 'font-size: 28px; font-weight: 700; color: inherit; padding: 8px; margin: 8px; cursor: text;';
        newEl.contentEditable = 'false';
        break;
      case 'quote':
        newEl = document.createElement('blockquote');
        newEl.textContent = '"Your quote goes here"';
        newEl.style.cssText = 'font-size: 18px; font-style: italic; color: inherit; padding: 16px; margin: 8px; border-left: 3px solid currentColor; opacity: 0.7;';
        break;
      case 'sticky':
        newEl = document.createElement('div');
        newEl.textContent = 'Sticky note';
        newEl.style.cssText = 'background: #FEF3C7; color: #92400E; padding: 12px; margin: 8px; border-radius: 4px; font-size: 13px; width: fit-content;';
        break;
      case 'image':
        newEl = document.createElement('div');
        newEl.style.cssText = 'background: rgba(128,128,128,0.15); padding: 24px; margin: 8px; border-radius: 8px; text-align: center; color: inherit; opacity: 0.5; font-size: 12px; border: 1px dashed rgba(128,128,128,0.3);';
        newEl.textContent = 'Click to add image';
        break;
      default:
        newEl = document.createElement('div');
        newEl.textContent = `New ${type} block`;
        newEl.style.cssText = 'padding: 8px; margin: 8px; color: inherit; opacity: 0.5; font-size: 13px;';
    }

    slideContent.appendChild(newEl);
    toast.success(`Added ${type}`);
    onClose();
  };

  const widgets = [
    { icon: Type, label: 'Paragraph', action: () => insertElement('paragraph') },
    { icon: Heading1, label: 'Heading', action: () => insertElement('heading') },
    { icon: Image, label: 'Image', action: () => insertElement('image'), arrow: true },
    { icon: Square, label: 'Card', action: () => insertElement('card'), arrow: true },
    { icon: Link, label: 'Embed or link', action: () => toast.success('Embed: paste a URL'), arrow: true },
    { icon: Smartphone, label: 'Mockup', action: () => insertElement('mockup'), arrow: true },
    { icon: Quote, label: 'Quote', action: () => insertElement('quote') },
    { icon: StickyNote, label: 'Sticky note', action: () => insertElement('sticky') },
    { icon: GitBranch, label: 'Diagrams', action: () => toast.success('Diagrams coming soon'), arrow: true },
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
          {w.arrow && <span className="text-white/15 text-[10px]">›</span>}
        </button>
      ))}
      <div className="my-1.5 mx-3 border-t border-white/[0.06]" />
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
