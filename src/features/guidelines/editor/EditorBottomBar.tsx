import { Plus, Sparkles, Palette, Image, MoreHorizontal, LayoutGrid } from 'lucide-react';

interface EditorBottomBarProps {
  activePanel: string;
  onTogglePanel: (panel: 'insert' | 'theme' | 'background' | 'export' | 'remix') => void;
}

export function EditorBottomBar({ activePanel, onTogglePanel }: EditorBottomBarProps) {
  const items = [
    { id: 'insert' as const, icon: Plus, label: 'Insert' },
    { id: 'remix' as const, icon: LayoutGrid, label: 'Remix', hasArrow: true },
    { id: 'theme' as const, icon: Palette, label: 'Colouring', hasArrow: true },
    { id: 'background' as const, icon: Image, label: 'Background' },
  ];

  return (
    <div className="h-14 bg-[#141414] border-t border-white/[0.04] flex items-center justify-center shrink-0 z-10 relative pb-1">
      <div className="flex items-center bg-[#222] rounded-xl px-1 py-0.5 gap-0.5">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onTogglePanel(item.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-medium transition-all duration-150 ${
              activePanel === item.id
                ? 'bg-white text-black shadow-sm'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
            }`}
          >
            {activePanel === item.id ? (
              <span className="text-[11px]">✕</span>
            ) : (
              <item.icon className="h-3.5 w-3.5" />
            )}
            {item.label}
            {item.hasArrow && activePanel !== item.id && <span className="text-white/20 text-[10px] ml-0.5">›</span>}
          </button>
        ))}
        <button className="p-2 text-white/30 hover:text-white/60 hover:bg-white/[0.06] rounded-[10px] transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* AI Magic button — bottom right */}
      <button className="absolute right-4 bottom-1.5 w-9 h-9 rounded-xl bg-[#222] hover:bg-[#333] flex items-center justify-center transition-colors group">
        <Sparkles className="h-4 w-4 text-white/30 group-hover:text-white/60" />
      </button>
    </div>
  );
}
