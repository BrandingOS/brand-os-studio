import { useState } from 'react';
import { TEMPLATE_LAYOUTS } from '../pages/templates/layout-config';

interface ThemeDrawerProps {
  layoutId: string;
  onChangeLayout: (id: string) => void;
  onClose: () => void;
}

const THEME_PRESETS = [
  { id: 'hyperhyve', name: 'Chronicle' },
  { id: 'identity', name: 'Minimal' },
  { id: 'noteform', name: 'New classic' },
  { id: 'signal', name: 'Retro tech' },
];

export function ThemeDrawer({ layoutId, onChangeLayout, onClose }: ThemeDrawerProps) {
  const [scope, setScope] = useState<'chapter' | 'document'>('chapter');

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 w-72 bg-[#222] rounded-2xl shadow-2xl border border-white/[0.06] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
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
              onClick={() => onChangeLayout(t.id)}
              className={`w-full px-3 py-2.5 rounded-lg text-left text-[13px] transition-colors ${
                layoutId === t.id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Create theme */}
      <div className="px-3 pb-3 pt-1 border-t border-white/[0.06]">
        <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] text-white/30 hover:text-white/50 hover:bg-white/5 transition-colors">
          <span>✦ Create theme</span>
          <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/40">Pro</span>
        </button>
      </div>
    </div>
  );
}
