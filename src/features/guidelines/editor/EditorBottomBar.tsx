import { Plus, Sparkles, Palette, Image, MoreHorizontal } from 'lucide-react';

interface EditorBottomBarProps {
  activePanel: string;
  onTogglePanel: (panel: 'insert' | 'theme' | 'background' | 'export') => void;
}

export function EditorBottomBar({ activePanel, onTogglePanel }: EditorBottomBarProps) {
  const items = [
    { id: 'insert' as const, icon: Plus, label: 'Insert' },
    { id: 'theme' as const, icon: Palette, label: 'Theme' },
    { id: 'background' as const, icon: Image, label: 'Background' },
  ];

  return (
    <div className="h-12 bg-[#1a1a1a] border-t border-white/[0.06] flex items-center justify-center gap-1 shrink-0 z-10">
      <div className="flex items-center bg-white/[0.06] rounded-xl px-1 py-1 gap-0.5">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onTogglePanel(item.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activePanel === item.id
                ? 'bg-white text-black'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            {activePanel === item.id ? (
              <span className="text-xs">✕</span>
            ) : (
              <item.icon className="h-3.5 w-3.5" />
            )}
            {item.label}
          </button>
        ))}
        <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
