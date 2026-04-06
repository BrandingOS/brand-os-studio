/**
 * TextInspector — edits typography of the currently selected text element.
 *
 * Reads `useSelectionStore` for the live DOM node, applies CSS changes
 * directly to the element so the user sees them instantly, and the
 * mutations are picked up by the existing useHistory MutationObserver
 * for free undo/redo.
 */

import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react';
import { useSelectionStore } from '../selection/selectionStore';

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 80];

export function TextInspector() {
  const selected = useSelectionStore((s) => s.selected);
  if (!selected || selected.type !== 'text' || !selected.el) return null;
  const el = selected.el;

  const apply = (style: Partial<CSSStyleDeclaration>) => {
    Object.assign(el.style, style);
  };

  const currentSize = parseInt(getComputedStyle(el).fontSize, 10) || 16;
  const currentColor = getComputedStyle(el).color || '#000';

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Font Size</label>
        <select
          value={currentSize}
          onChange={(e) => apply({ fontSize: `${e.target.value}px` })}
          className="w-full px-3 py-1.5 text-sm rounded border border-gray-200"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Color</label>
        <input
          type="color"
          defaultValue={rgbToHex(currentColor)}
          onChange={(e) => apply({ color: e.target.value })}
          className="w-full h-8 rounded border border-gray-200"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Style</label>
        <div className="flex items-center gap-1">
          <button
            onClick={() => apply({ fontWeight: el.style.fontWeight === '700' ? '400' : '700' })}
            className="p-2 rounded border border-gray-200 hover:bg-gray-50"
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => apply({ fontStyle: el.style.fontStyle === 'italic' ? 'normal' : 'italic' })}
            className="p-2 rounded border border-gray-200 hover:bg-gray-50"
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Alignment</label>
        <div className="flex items-center gap-1">
          {[
            { val: 'left', Icon: AlignLeft },
            { val: 'center', Icon: AlignCenter },
            { val: 'right', Icon: AlignRight },
          ].map(({ val, Icon }) => (
            <button
              key={val}
              onClick={() => apply({ textAlign: val })}
              className="p-2 rounded border border-gray-200 hover:bg-gray-50"
              aria-label={val}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
          <Type className="h-3 w-3" /> Use brand font
        </label>
        <div className="flex gap-1">
          <button
            onClick={() => apply({ fontFamily: 'var(--brand-font-heading)' })}
            className="flex-1 px-2 py-1.5 text-xs rounded border border-gray-200 hover:bg-gray-50"
          >
            Heading
          </button>
          <button
            onClick={() => apply({ fontFamily: 'var(--brand-font-body)' })}
            className="flex-1 px-2 py-1.5 text-xs rounded border border-gray-200 hover:bg-gray-50"
          >
            Body
          </button>
        </div>
      </div>
    </div>
  );
}

function rgbToHex(rgb: string): string {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return '#000000';
  return '#' + m.slice(0, 3).map((n) => parseInt(n, 10).toString(16).padStart(2, '0')).join('');
}
