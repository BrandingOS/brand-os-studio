/**
 * ShapeInspector — edits fill/stroke/radius of the selected shape element.
 */

import { useSelectionStore } from '../selection/selectionStore';

export function ShapeInspector() {
  const selected = useSelectionStore((s) => s.selected);
  if (!selected || selected.type !== 'shape' || !selected.el) return null;
  const el = selected.el;

  const apply = (style: Partial<CSSStyleDeclaration>) => {
    Object.assign(el.style, style);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Fill</label>
        <input
          type="color"
          onChange={(e) => apply({ backgroundColor: e.target.value })}
          className="w-full h-8 rounded border border-gray-200"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Border Radius</label>
        <input
          type="range"
          min="0"
          max="48"
          defaultValue="0"
          onChange={(e) => apply({ borderRadius: `${e.target.value}px` })}
          className="w-full"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Use brand color</label>
        <div className="flex gap-1">
          <button onClick={() => apply({ backgroundColor: 'var(--brand-primary)' })} className="flex-1 px-2 py-1.5 text-xs rounded border border-gray-200 hover:bg-gray-50">Primary</button>
          <button onClick={() => apply({ backgroundColor: 'var(--brand-secondary)' })} className="flex-1 px-2 py-1.5 text-xs rounded border border-gray-200 hover:bg-gray-50">Secondary</button>
          <button onClick={() => apply({ backgroundColor: 'var(--brand-accent)' })} className="flex-1 px-2 py-1.5 text-xs rounded border border-gray-200 hover:bg-gray-50">Accent</button>
        </div>
      </div>
    </div>
  );
}
