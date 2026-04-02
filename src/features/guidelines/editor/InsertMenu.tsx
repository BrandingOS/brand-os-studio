import { Type, Heading1, Image, Square, Link, Smartphone, Quote, StickyNote, GitBranch, LayoutGrid, Plus } from 'lucide-react';

interface InsertMenuProps {
  onClose: () => void;
}

export function InsertMenu({ onClose }: InsertMenuProps) {
  const widgets = [
    { icon: Type, label: 'Paragraph' },
    { icon: Heading1, label: 'Heading' },
    { icon: Image, label: 'Image' },
    { icon: Square, label: 'Card', arrow: true },
    { icon: Link, label: 'Embed or link', arrow: true },
    { icon: Smartphone, label: 'Mockup', arrow: true },
    { icon: Quote, label: 'Quote' },
    { icon: StickyNote, label: 'Sticky note' },
    { icon: GitBranch, label: 'Diagrams', arrow: true },
  ];

  return (
    <div className="w-56 bg-[#222] rounded-2xl shadow-2xl border border-white/[0.06] py-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="px-3 py-1">
        <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold">Insert widget</p>
      </div>
      {widgets.map(w => (
        <button key={w.label} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
          <w.icon className="h-4 w-4 text-white/30" />
          <span className="flex-1 text-left">{w.label}</span>
          {w.arrow && <span className="text-white/15 text-[10px]">›</span>}
        </button>
      ))}

      <div className="my-1.5 mx-3 border-t border-white/[0.06]" />

      <div className="px-3 py-1">
        <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold">Add structure</p>
      </div>
      <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
        <LayoutGrid className="h-4 w-4 text-white/30" />
        <span>Choose template</span>
      </button>
      <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors">
        <Plus className="h-4 w-4 text-white/30" />
        <span>Blank chapter</span>
      </button>
    </div>
  );
}
