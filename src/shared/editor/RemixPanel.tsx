import { toast } from 'sonner';

interface RemixPanelProps {
  onClose: () => void;
}

const LAYOUTS = [
  { id: 'title-center', name: 'Centered title', desc: 'Large centered heading' },
  { id: 'title-left', name: 'Left-aligned title', desc: 'Heading with subtitle' },
  { id: 'two-col', name: 'Two columns', desc: 'Split content layout' },
  { id: 'three-col', name: 'Three columns', desc: 'Grid content' },
  { id: 'hero-text', name: 'Hero text', desc: 'Full-width statement' },
  { id: 'quote', name: 'Quote layout', desc: 'Large pull quote' },
  { id: 'image-text', name: 'Image + text', desc: 'Split with visual' },
  { id: 'stats', name: 'Stats grid', desc: 'Key metrics display' },
  { id: 'blank', name: 'Blank', desc: 'Empty canvas' },
];

export function RemixPanel({ onClose }: RemixPanelProps) {
  const handleSelectLayout = (layout: typeof LAYOUTS[0]) => {
    toast.success(`Applied "${layout.name}" layout`);
    onClose();
  };

  return (
    <div className="w-96 bg-[#222] rounded-2xl shadow-2xl border border-white/[0.06] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <p className="text-[11px] text-white/30">Text only layouts</p>
      </div>

      <div className="px-3 pb-3">
        <div className="grid grid-cols-3 gap-2">
          {LAYOUTS.map(layout => (
            <button
              key={layout.id}
              onClick={() => handleSelectLayout(layout)}
              className="aspect-video bg-white/[0.03] rounded-lg border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.08] transition-all group"
              title={layout.desc}
            >
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                {layout.id === 'title-center' && <><div className="w-3/4 h-1.5 bg-white/15 rounded" /><div className="w-1/2 h-0.5 bg-white/8 rounded" /></>}
                {layout.id === 'title-left' && <><div className="w-full h-1.5 bg-white/15 rounded self-start" /><div className="w-2/3 h-0.5 bg-white/8 rounded self-start" /></>}
                {layout.id === 'two-col' && <div className="flex gap-1 w-full"><div className="flex-1 h-6 bg-white/8 rounded" /><div className="flex-1 h-6 bg-white/8 rounded" /></div>}
                {layout.id === 'three-col' && <div className="flex gap-1 w-full"><div className="flex-1 h-5 bg-white/6 rounded" /><div className="flex-1 h-5 bg-white/6 rounded" /><div className="flex-1 h-5 bg-white/6 rounded" /></div>}
                {layout.id === 'hero-text' && <div className="w-full h-2 bg-white/15 rounded" />}
                {layout.id === 'quote' && <><div className="text-white/10 text-lg leading-none">"</div><div className="w-3/4 h-1 bg-white/10 rounded" /></>}
                {layout.id === 'image-text' && <div className="flex gap-1 w-full"><div className="w-1/2 h-6 bg-white/10 rounded" /><div className="w-1/2 space-y-0.5"><div className="h-1 bg-white/6 rounded" /><div className="h-0.5 bg-white/4 rounded w-3/4" /></div></div>}
                {layout.id === 'stats' && <div className="grid grid-cols-2 gap-1 w-full"><div className="h-3 bg-white/6 rounded" /><div className="h-3 bg-white/6 rounded" /><div className="h-3 bg-white/6 rounded" /><div className="h-3 bg-white/6 rounded" /></div>}
                {layout.id === 'blank' && <div className="text-white/10 text-[9px]">+</div>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pb-3 pt-1 border-t border-white/[0.06] flex items-center justify-end">
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-white/10 text-[11px] text-white/50 hover:text-white hover:bg-white/20 transition-colors">
          Remix
        </button>
      </div>
    </div>
  );
}
