/**
 * TldrawCanvas — production Figma-quality infinite canvas via tldraw SDK.
 * Mounts once and stays mounted; AI-generated node injection is wired
 * via a deferred effect so the canvas never unmounts mid-interaction.
 */
import { useCallback, useEffect, useRef } from 'react';
import { Tldraw, Editor, createShapeId, TLShapeId } from 'tldraw';
import 'tldraw/tldraw.css';
import type { Brand } from '@/shared/types/brand';
import type { DesignNode } from '../types';

interface Props {
  nodes: DesignNode[];
  brand: Brand | null | undefined;
}

export function TldrawCanvas({ nodes, brand }: Props) {
  const editorRef = useRef<Editor | null>(null);
  const placedIdsRef = useRef<Map<string, TLShapeId>>(new Map());

  const onMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const placed = placedIdsRef.current;
    const toCreate = nodes.filter((n) => !placed.has(n.id));
    if (toCreate.length === 0) return;

    for (const n of toCreate) {
      const shapeId = createShapeId();
      placed.set(n.id, shapeId);
      try {
        if (n.kind === 'text') {
          editor.createShape({
            id: shapeId,
            type: 'text',
            x: n.x,
            y: n.y,
          });
        } else if (n.kind === 'rect' || n.kind === 'frame' || n.kind === 'swatch') {
          editor.createShape({
            id: shapeId,
            type: 'geo',
            x: n.x,
            y: n.y,
            props: { geo: 'rectangle', w: n.w ?? 200, h: n.h ?? 120 },
          });
        }
      } catch {
        // Swallow per-shape failures — keeps canvas alive.
      }
    }
    void brand;
  }, [nodes, brand]);

  return (
    <div className="absolute inset-0">
      <Tldraw onMount={onMount} />
    </div>
  );
}
