import { useState } from 'react';
import { TEMPLATE_LAYOUTS } from '../pages/templates/layout-config';

interface ThemeDrawerProps {
  layoutId: string;
  onChangeLayout: (id: string) => void;
  onClose: () => void;
}

export function ThemeDrawer({ layoutId, onChangeLayout, onClose }: ThemeDrawerProps) {
  const [scope, setScope] = useState<'chapter' | 'document'>('chapter');

  return (
    <div className="absolute left-0 top-0 bottom-0 w-80 bg-white z-30 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
      {/* Scope tabs */}
      <div className="flex border-b border-gray-200">
        <button onClick={() => setScope('chapter')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${scope === 'chapter' ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-gray-600'}`}>
          This chapter
        </button>
        <button onClick={() => setScope('document')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${scope === 'document' ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-gray-600'}`}>
          Whole document
        </button>
      </div>

      {/* Current theme */}
      <div className="p-4 border-b border-gray-100">
        <p className="text-xs text-gray-400 mb-2">Current theme</p>
        <select
          value={layoutId}
          onChange={e => onChangeLayout(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          {TEMPLATE_LAYOUTS.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {/* Chapter presets */}
      <div className="p-4 flex-1 overflow-auto">
        <p className="text-xs text-gray-400 mb-3">Chapter presets</p>
        <div className="space-y-2">
          {[
            { id: 'light', label: 'Neutral light', bgPreview: '#ffffff', textPreview: '#000000' },
            { id: 'dark', label: 'Neutral dark', bgPreview: '#1a1a1a', textPreview: '#ffffff' },
            { id: 'accent', label: 'Accent', bgPreview: 'brand', textPreview: '#ffffff' },
          ].map(preset => (
            <button
              key={preset.id}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-200 hover:border-gray-400 transition-colors text-left"
            >
              <div className="w-10 h-7 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: preset.bgPreview === 'brand' ? '#EF4444' : preset.bgPreview, color: preset.textPreview }}>
                <span className="relative">● </span>Aa
              </div>
              <span className="text-sm">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Close */}
      <div className="p-4 border-t border-gray-100">
        <button onClick={onClose} className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}
