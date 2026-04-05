import { useState } from 'react';
import { toast } from 'sonner';

interface ThemeDrawerProps {
  layoutId: string;
  onChangeLayout: (id: string) => void;
  onClose: () => void;
}

const THEME_PRESETS = [
  { id: 'hyperhyve', name: 'Chronicle', description: 'Modern editorial feel' },
  { id: 'identity', name: 'Minimal', description: 'Clean and focused' },
  { id: 'noteform', name: 'New classic', description: 'Timeless elegance' },
  { id: 'signal', name: 'Retro tech', description: 'Bold technical aesthetic' },
];

export function ThemeDrawer({ layoutId, onChangeLayout, onClose }: ThemeDrawerProps) {
  const [scope, setScope] = useState<'chapter' | 'document'>('chapter');

  const handleChangeLayout = (id: string) => {
    onChangeLayout(id);
    const preset = THEME_PRESETS.find(t => t.id === id);
    toast.success(`Theme changed to ${preset?.name || id}${scope === 'document' ? ' (all slides)' : ''}`);
  };

  return (
    <div className="w-72 bg-[#222] rounded-2xl shadow-2xl border border-white/[0.06] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Scope tabs */}
      <div className="flex border-b border-white/[0.06]">
        <button onClick={() => setScope('chapter')} className={`flex-1 px-4 py-2.5 text-[12px] font-medium transition-colors ${scope === 'chapter' ? 'text-white bg-white/5' : 'text-white/30 hover:text-white/50'}`}>
          This chapter
        </button>
        <button onClick={() => setScope('document')} className={`flex-1 px-4 py-2.5 text-[12px] font-medium transition-colors ${scope === 'document' ? 'text-white bg-white/5' : 'text-white/30 hover:text-white/50'}`}>
          Whole document
        </button>
      </div>

      {/* Preset themes */}
      <div className="p-3">
        <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-2 px-1">Preset themes</p>
        <div className="space-y-0.5">
          {THEME_PRESETS.map(t => (
            <button
              key={t.id}
              onClick={() => handleChangeLayout(t.id)}
              className={`w-full px-3 py-2.5 rounded-lg text-left transition-colors ${
                layoutId === t.id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <div className="text-[13px]">{t.name}</div>
              <div className="text-[10px] text-white/25 mt-0.5">{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Create theme */}
      <div className="px-3 pb-3 pt-1 border-t border-white/[0.06]">
        <button
          onClick={() => toast('Custom themes coming in Pro', { icon: '✦' })}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] text-white/30 hover:text-white/50 hover:bg-white/5 transition-colors"
        >
          <span>✦ Create theme</span>
          <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/40">Pro</span>
        </button>
      </div>
    </div>
  );
}
