import { type FabricObject } from 'fabric';
import type { Brand } from '@/shared/types/brand';

interface EditorPropertiesPanelProps {
  selectedObject: FabricObject | null;
  onUpdate: (prop: string, value: unknown) => void;
  brand: Brand;
}

export function EditorPropertiesPanel({ selectedObject, onUpdate, brand }: EditorPropertiesPanelProps) {
  if (!selectedObject) {
    return (
      <div className="w-56 bg-[#2a2a3e] border-l border-[#3a3a4e] shrink-0 flex items-center justify-center p-4">
        <p className="text-gray-500 text-xs text-center">Select an element to edit its properties</p>
      </div>
    );
  }

  const isText = selectedObject.type === 'textbox' || selectedObject.type === 'i-text' || selectedObject.type === 'text';
  const fill = (selectedObject.fill as string) || '#000000';

  return (
    <div className="w-56 bg-[#2a2a3e] border-l border-[#3a3a4e] shrink-0 overflow-auto">
      {/* Position & Size */}
      <div className="p-3 border-b border-[#3a3a4e]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Position</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'X', prop: 'left', value: Math.round(selectedObject.left || 0) },
            { label: 'Y', prop: 'top', value: Math.round(selectedObject.top || 0) },
            { label: 'W', prop: 'width', value: Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1)) },
            { label: 'H', prop: 'height', value: Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1)) },
          ].map(({ label, prop, value }) => (
            <div key={label}>
              <label className="text-[10px] text-gray-500">{label}</label>
              <input
                type="number"
                value={value}
                onChange={e => onUpdate(prop, Number(e.target.value))}
                className="w-full px-2 py-1 text-xs bg-[#1e1e2e] text-white border border-[#3a3a4e] rounded focus:outline-none focus:border-primary"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Rotation & Opacity */}
      <div className="p-3 border-b border-[#3a3a4e]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Transform</p>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500">Rotation</label>
            <input
              type="range"
              min="0"
              max="360"
              value={Math.round(selectedObject.angle || 0)}
              onChange={e => onUpdate('angle', Number(e.target.value))}
              className="w-full h-1 accent-primary"
            />
            <span className="text-[10px] text-gray-400">{Math.round(selectedObject.angle || 0)}°</span>
          </div>
          <div>
            <label className="text-[10px] text-gray-500">Opacity</label>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round((selectedObject.opacity || 1) * 100)}
              onChange={e => onUpdate('opacity', Number(e.target.value) / 100)}
              className="w-full h-1 accent-primary"
            />
            <span className="text-[10px] text-gray-400">{Math.round((selectedObject.opacity || 1) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Fill Color */}
      <div className="p-3 border-b border-[#3a3a4e]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Fill</p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={typeof fill === 'string' ? fill : '#000000'}
            onChange={e => onUpdate('fill', e.target.value)}
            className="w-8 h-8 rounded border border-[#3a3a4e] cursor-pointer p-0"
          />
          <span className="text-xs text-gray-400 font-mono">{typeof fill === 'string' ? fill : 'mixed'}</span>
        </div>
        {/* Quick brand colors */}
        <div className="flex gap-1 mt-2">
          {[brand.primaryColor, brand.secondaryColor, '#ffffff', '#000000', '#f5f5f5'].filter(Boolean).map(c => (
            <button
              key={c}
              onClick={() => onUpdate('fill', c)}
              className="w-5 h-5 rounded border border-white/20 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Text Properties */}
      {isText && (
        <div className="p-3 border-b border-[#3a3a4e]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Typography</p>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-gray-500">Font Family</label>
              <select
                value={(selectedObject as any).fontFamily || 'Inter'}
                onChange={e => onUpdate('fontFamily', e.target.value)}
                className="w-full px-2 py-1 text-xs bg-[#1e1e2e] text-white border border-[#3a3a4e] rounded focus:outline-none"
              >
                <option value="Inter">Inter</option>
                <option value="DM Sans">DM Sans</option>
                <option value="Poppins">Poppins</option>
                <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500">Font Size</label>
              <input
                type="number"
                value={Math.round((selectedObject as any).fontSize || 16)}
                onChange={e => onUpdate('fontSize', Number(e.target.value))}
                className="w-full px-2 py-1 text-xs bg-[#1e1e2e] text-white border border-[#3a3a4e] rounded focus:outline-none"
              />
            </div>
            <div className="flex gap-1">
              {[
                { label: 'B', prop: 'fontWeight', val: 'bold', current: (selectedObject as any).fontWeight },
                { label: 'I', prop: 'fontStyle', val: 'italic', current: (selectedObject as any).fontStyle },
                { label: 'U', prop: 'underline', val: true, current: (selectedObject as any).underline },
              ].map(b => (
                <button
                  key={b.label}
                  onClick={() => onUpdate(b.prop, b.current === b.val ? (b.prop === 'fontWeight' ? 'normal' : b.prop === 'fontStyle' ? 'normal' : false) : b.val)}
                  className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
                    b.current === b.val
                      ? 'bg-primary text-white'
                      : 'bg-[#1e1e2e] text-gray-400 hover:bg-white/10'
                  }`}
                  style={b.label === 'I' ? { fontStyle: 'italic' } : b.label === 'U' ? { textDecoration: 'underline' } : {}}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <div>
              <label className="text-[10px] text-gray-500">Alignment</label>
              <div className="flex gap-1">
                {['left', 'center', 'right'].map(align => (
                  <button
                    key={align}
                    onClick={() => onUpdate('textAlign', align)}
                    className={`flex-1 py-1 text-[10px] rounded transition-colors ${
                      (selectedObject as any).textAlign === align
                        ? 'bg-primary text-white'
                        : 'bg-[#1e1e2e] text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Border/Stroke */}
      <div className="p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Stroke</p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={(selectedObject.stroke as string) || '#000000'}
            onChange={e => onUpdate('stroke', e.target.value)}
            className="w-6 h-6 rounded border border-[#3a3a4e] cursor-pointer p-0"
          />
          <input
            type="number"
            min="0"
            max="20"
            value={selectedObject.strokeWidth || 0}
            onChange={e => onUpdate('strokeWidth', Number(e.target.value))}
            className="w-16 px-2 py-1 text-xs bg-[#1e1e2e] text-white border border-[#3a3a4e] rounded focus:outline-none"
            placeholder="Width"
          />
        </div>
      </div>
    </div>
  );
}
