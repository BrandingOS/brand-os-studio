/**
 * SlideInspector — slide-level controls (background, layout knobs).
 *
 * Surfaces can register an extension component that's rendered below the
 * built-in controls. This is how `LogoConceptInspector` becomes pluggable —
 * the logo presentation surface registers a per-slide extension that knows
 * how to read/write the concept data for that slide id.
 */

import type { ComponentType } from 'react';
import { useSelectionStore } from '../selection/selectionStore';

export interface SlideInspectorExtensionProps {
  surface: string;
  slideId: string;
}

interface SlideInspectorProps {
  extension?: ComponentType<SlideInspectorExtensionProps>;
}

export function SlideInspector({ extension: Extension }: SlideInspectorProps) {
  const selected = useSelectionStore((s) => s.selected);
  if (!selected || selected.type !== 'slide') return null;

  const slideEl = selected.el;

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Slide Background</label>
        <input
          type="color"
          onChange={(e) => { if (slideEl) slideEl.style.background = e.target.value; }}
          className="w-full h-8 rounded border border-gray-200"
        />
        <div className="flex gap-1 mt-2">
          <button onClick={() => { if (slideEl) slideEl.style.background = 'var(--pres-bg-light)'; }} className="flex-1 px-2 py-1.5 text-xs rounded border border-gray-200 hover:bg-gray-50">Light</button>
          <button onClick={() => { if (slideEl) slideEl.style.background = 'var(--pres-bg-dark)'; }} className="flex-1 px-2 py-1.5 text-xs rounded border border-gray-200 hover:bg-gray-50">Dark</button>
          <button onClick={() => { if (slideEl) slideEl.style.background = 'var(--brand-primary)'; }} className="flex-1 px-2 py-1.5 text-xs rounded border border-gray-200 hover:bg-gray-50">Brand</button>
        </div>
      </div>

      {Extension && <Extension surface={selected.surface} slideId={selected.slideId} />}
    </div>
  );
}
