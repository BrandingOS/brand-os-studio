/**
 * ContentInspector — generic right-rail inspector for the slide editor.
 *
 * Reads `useSelectionStore` and dispatches to the appropriate inspector
 * panel by element type. Surfaces no longer need to ship their own
 * inspector — they just register an optional `slideExtension` component
 * for surface-specific slide-level controls.
 *
 * This replaces the previous pattern where only Logo Presentation had a
 * `LogoConceptInspector` and other surfaces had no inspector at all.
 */

import type { ComponentType } from 'react';
import { useSelectionStore } from './selection/selectionStore';
import { TextInspector } from './inspectors/TextInspector';
import { ImageInspector } from './inspectors/ImageInspector';
import { ShapeInspector } from './inspectors/ShapeInspector';
import { SlideInspector, type SlideInspectorExtensionProps } from './inspectors/SlideInspector';

export interface ContentInspectorProps {
  /** Optional surface-specific slide-level extension. */
  slideExtension?: ComponentType<SlideInspectorExtensionProps>;
  className?: string;
}

export function ContentInspector({ slideExtension, className }: ContentInspectorProps) {
  const selected = useSelectionStore((s) => s.selected);

  return (
    <aside className={className ?? 'w-72 border-l border-gray-200 bg-white overflow-y-auto'}>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          {selected ? labelFor(selected.type) : 'Inspector'}
        </h3>
        {!selected && (
          <p className="text-xs text-gray-400 mt-0.5">Click an element to edit it</p>
        )}
      </div>
      {selected?.type === 'text' && <TextInspector />}
      {selected?.type === 'image' && <ImageInspector />}
      {selected?.type === 'shape' && <ShapeInspector />}
      {selected?.type === 'slide' && <SlideInspector extension={slideExtension} />}
    </aside>
  );
}

function labelFor(type: string): string {
  switch (type) {
    case 'text': return 'Text';
    case 'image': return 'Image';
    case 'shape': return 'Shape';
    case 'slide': return 'Slide';
    default: return 'Inspector';
  }
}
