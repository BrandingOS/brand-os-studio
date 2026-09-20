// The workspace.
//
// The canvas element fills this region exactly and Fabric's own
// viewportTransform does zoom and pan, so there is no scaled wrapper,
// no transform on an ancestor, and nothing here that the artboard's
// scale can distort. Everything drawn on top — the empty state, the
// drop hint — lives on a screen-space overlay sibling for the same
// reason.

import { useCallback, useState, type DragEvent, type ReactNode } from 'react';
import type { DesignRenderer } from '@/features/editor/renderers/types';
import type { DocumentAdapter } from '@/features/editor/adapter/DocumentAdapter';
import type { BrandOSDocument } from '@/features/editor/schema';

interface Props {
  regionRef: React.MutableRefObject<HTMLDivElement | null>;
  renderer: DesignRenderer;
  adapter: DocumentAdapter;
  initialDocument: BrandOSDocument;
  /** Screen-space children: empty state, selection chrome, cursors. */
  overlay?: ReactNode;
  /** A payload was dropped on the workspace at this document point. */
  onDropPayload?: (payload: string, at: { x: number; y: number }) => void;
  onDropFiles?: (files: File[], at: { x: number; y: number }) => void;
  toDocument: (clientX: number, clientY: number) => { x: number; y: number };
  readOnly: boolean;
}

/** The drag type panels use to hand an insertable to the canvas. */
export const STUDIO_DRAG_TYPE = 'application/x-brandos-insert';

export function StudioCanvas({
  regionRef,
  renderer,
  adapter,
  initialDocument,
  overlay,
  onDropPayload,
  onDropFiles,
  toDocument,
  readOnly,
}: Props) {
  const [dropping, setDropping] = useState(false);

  const accepts = useCallback(
    (e: DragEvent) => {
      if (readOnly) return false;
      const types = Array.from(e.dataTransfer?.types ?? []);
      return types.includes(STUDIO_DRAG_TYPE) || types.includes('Files');
    },
    [readOnly],
  );

  return (
    <div
      ref={regionRef}
      className={`st-workspace ${dropping ? 'is-drop-target' : ''}`}
      data-studio-workspace
      onDragOver={(e) => {
        if (!accepts(e)) return;
        // Both are required: without preventDefault the browser refuses
        // the drop, and without an explicit dropEffect the cursor shows
        // "no entry" over a target that does accept it.
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (!dropping) setDropping(true);
      }}
      onDragLeave={(e) => {
        // Only when the pointer truly leaves the region — dragging over
        // a child fires dragleave on the parent.
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDropping(false);
      }}
      onDrop={(e) => {
        if (!accepts(e)) return;
        e.preventDefault();
        setDropping(false);
        const at = toDocument(e.clientX, e.clientY);
        const payload = e.dataTransfer.getData(STUDIO_DRAG_TYPE);
        if (payload) {
          onDropPayload?.(payload, at);
          return;
        }
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length > 0) onDropFiles?.(files, at);
      }}
    >
      <renderer.Canvas adapter={adapter} initialDocument={initialDocument} />
      <div className="st-overlay" data-studio-overlay>
        {overlay}
      </div>
    </div>
  );
}
