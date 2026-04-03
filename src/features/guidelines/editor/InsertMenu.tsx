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

    // Find the deepest content container inside the slide
    // Walk into the EditableSlide wrapper > the rendered slide content
    let slideContent: Element | null = canvas;
    // The EditableSlide wraps children in a div.relative > div
    // We want to insert into the actual slide content area
    const editableInner = canvas.querySelector('.relative > div');
    if (editableInner) {
      // Find the main content area (usually the first child that has children)
      const firstChild = editableInner.firstElementChild;
      if (firstChild) {
        slideContent = firstChild;
      }
    }
    // Fallback: find any container with multiple children
    if (slideContent === canvas) {
      const candidates = canvas.querySelectorAll('div');
      for (const c of candidates) {
        if (c.children.length >= 2 && c.textContent && c.textContent.trim().length > 10) {
          slideContent = c;
          break;
        }
      }
    }

    if (!slideContent) {
      slideContent = canvas;
    }

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
      case 'image': {
        newEl = document.createElement('div');
        newEl.style.cssText = 'background: rgba(128,128,128,0.15); padding: 24px; margin: 8px; border-radius: 8px; text-align: center; color: inherit; opacity: 0.5; font-size: 12px; border: 1px dashed rgba(128,128,128,0.3); cursor: pointer; position: relative;';
        newEl.textContent = 'Click to add image';
        // Make it functional: clicking opens file picker
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        input.addEventListener('change', () => {
          const file = input.files?.[0];
          if (!file) return;
          const url = URL.createObjectURL(file);
          const img = document.createElement('img');
          img.src = url;
          img.style.cssText = 'max-width: 100%; border-radius: 8px; margin: 8px; position: relative;';
          newEl.replaceWith(img);
        });
        newEl.appendChild(input);
        newEl.addEventListener('click', () => input.click());
        break;
      }
      case 'card':
        newEl = document.createElement('div');
        newEl.innerHTML = '<h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">Card Title</h3><p style="font-size: 13px; opacity: 0.6;">Card description text. Double-click to edit.</p>';
        newEl.style.cssText = 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; margin: 8px; color: inherit; cursor: text; position: relative;';
        break;
      case 'mockup':
        newEl = document.createElement('div');
        newEl.innerHTML = '<div style="width: 120px; height: 200px; background: #222; border-radius: 16px; border: 2px solid #444; margin: auto; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">Screen</div>';
        newEl.style.cssText = 'text-align: center; padding: 16px; margin: 8px; position: relative;';
        break;
      default:
        newEl = document.createElement('div');
        newEl.textContent = `New ${type} block`;
        newEl.style.cssText = 'padding: 8px; margin: 8px; color: inherit; opacity: 0.5; font-size: 13px; position: relative;';
    }

    slideContent.appendChild(newEl);

    // Scroll the new element into view
    newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Flash highlight to show where it was added
    newEl.style.transition = 'outline 0.3s ease';
    newEl.style.outline = '2px solid rgba(59, 130, 246, 0.5)';
    newEl.style.outlineOffset = '2px';
    setTimeout(() => {
      newEl.style.outline = '';
      newEl.style.outlineOffset = '';
    }, 1500);

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
