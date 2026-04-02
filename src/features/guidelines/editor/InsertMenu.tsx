import { Type, Heading1, Image, Square, BarChart3, Table, Smartphone, Link, ArrowUpRight, StickyNote, GitBranch, Plus } from 'lucide-react';

interface InsertMenuProps {
  onClose: () => void;
}

export function InsertMenu({ onClose }: InsertMenuProps) {
  const widgets = [
    { icon: Type, label: 'Paragraph', shortcut: 'T' },
    { icon: Heading1, label: 'Heading', shortcut: 'H' },
    { icon: Image, label: 'Media', arrow: true },
    { icon: Square, label: 'Card', arrow: true },
    { icon: BarChart3, label: 'Chart', arrow: true },
    { icon: Table, label: 'Table' },
    { icon: Smartphone, label: 'Mockup', arrow: true },
    { icon: Link, label: 'Embed or link', arrow: true },
    { icon: ArrowUpRight, label: 'Connectors', arrow: true },
    { icon: StickyNote, label: 'Sticky note', shortcut: 'S' },
    { icon: GitBranch, label: 'Diagrams', arrow: true },
  ];

  const slideActions = [
    { icon: Square, label: 'Start with template' },
    { icon: Plus, label: 'Blank slide' },
  ];

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="px-3 py-1.5">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Insert widget</p>
      </div>
      {widgets.map(w => (
        <button key={w.label} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
          <w.icon className="h-4 w-4 text-gray-400" />
          <span className="flex-1 text-left">{w.label}</span>
          {w.shortcut && <span className="text-[10px] text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded">{w.shortcut}</span>}
          {w.arrow && <span className="text-gray-300">›</span>}
        </button>
      ))}

      <div className="my-1.5 border-t border-gray-100" />

      <div className="px-3 py-1.5">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Add slide</p>
      </div>
      {slideActions.map(a => (
        <button key={a.label} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
          <a.icon className="h-4 w-4 text-gray-400" />
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}
