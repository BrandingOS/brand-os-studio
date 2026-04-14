/**
 * TldrawCanvas — production Figma-quality infinite canvas via tldraw SDK.
 *
 * Replaces the custom CSS-transform canvas with tldraw's battle-tested
 * renderer (powers ClickUp, Padlet, etc.). We still drive *content* from
 * our `DesignNode[]` model — when new nodes come in from the AI agent we
 * translate them into tldraw shapes on the editor.
 *
 * The editor is completely freeform (pan, zoom, select, move, resize,
 * rotate, draw, text, shapes) — no custom gestures required.
 */
import { useCallback, useEffect, useRef } from 'react';
import { Tldraw, Editor, createShapeId, TLShapeId, AssetRecordType } from 'tldraw';
import 'tldraw/tldraw.css';
import type { Brand } from '@/shared/types/brand';
import type { DesignNode } from '../types';

interface Props {
  nodes: DesignNode[];
  brand: Brand | null | undefined;
}

// Resolve a brand color handle like `@slug.colors.primary` to a hex.
function resolveColor(brand: Brand | null | undefined, value: string | undefined, fallback = '#111111'): string {
  if (!value) return fallback;
  if (!value.startsWith('@')) return value;
  if (!brand) return fallback;
  if (value.includes('primary')) return brand.primaryColor ?? fallback;
  if (value.includes('secondary')) return (brand as Brand & { secondaryColor?: string }).secondaryColor ?? fallback;
  const palette = (brand as Brand & { palette?: Array<{ hex?: string }> }).palette;
  if (palette?.length && value.includes('.colors.')) {
    const idx = parseInt(value.split('[')[1]?.replace(']', '') ?? '0', 10) || 0;
    return palette[idx]?.hex ?? fallback;
  }
  return fallback;
}

export function TldrawCanvas({ nodes, brand }: Props) {
  const editorRef = useRef<Editor | null>(null);
  const placedIdsRef = useRef<Map<string, TLShapeId>>(new Map());

  const onMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    // Start slightly zoomed-out so brand-new content sits visible.
    editor.setCamera({ x: 0, y: 0, z: 0.6 });
  }, []);

  // Sync DesignNode[] → tldraw shapes (incremental: only create new ones).
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const placed = placedIdsRef.current;

    const toCreate = nodes.filter((n) => !placed.has(n.id));
    if (toCreate.length === 0) return;

    for (const n of toCreate) {
      const shapeId = createShapeId();
      placed.set(n.id, shapeId);

      if (n.kind === 'text') {
        editor.createShape({
          id: shapeId,
          type: 'text',
          x: n.x,
          y: n.y,
          props: {
            richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: n.text ?? 'Text' }] }] } as never,
            color: 'black',
            size: (n.fontSize ?? 32) > 48 ? 'xl' : (n.fontSize ?? 32) > 28 ? 'l' : 'm',
            font: 'sans',
            textAlign: 'start',
            autoSize: true,
          },
        });
      } else if (n.kind === 'rect' || n.kind === 'frame') {
        editor.createShape({
          id: shapeId,
          type: 'geo',
          x: n.x,
          y: n.y,
          props: {
            geo: 'rectangle',
            w: n.w ?? 320,
            h: n.h ?? 200,
            color: 'black',
            fill: n.kind === 'frame' ? 'none' : 'solid',
            dash: 'draw',
            size: 'm',
          },
        });
      } else if (n.kind === 'swatch') {
        editor.createShape({
          id: shapeId,
          type: 'geo',
          x: n.x,
          y: n.y,
          props: {
            geo: 'rectangle',
            w: n.w ?? 120,
            h: n.h ?? 120,
            color: 'black',
            fill: 'solid',
            dash: 'draw',
            size: 'm',
          },
        });
      } else if (n.kind === 'logo') {
        const logo = brand?.logoAssets?.icon ?? brand?.logoAssets?.full ?? brand?.logo;
        if (logo) {
          const assetId = AssetRecordType.createId();
          editor.createAssets([
            {
              id: assetId,
              type: 'image',
              typeName: 'asset',
              meta: {},
              props: {
                w: n.w ?? 160,
                h: n.h ?? 160,
                mimeType: 'image/png',
                src: logo,
                name: 'logo',
                isAnimated: false,
              },
            },
          ]);
          editor.createShape({
            id: shapeId,
            type: 'image',
            x: n.x,
            y: n.y,
            props: { w: n.w ?? 160, h: n.h ?? 160, assetId },
          });
        }
      }
    }

    // Softly zoom to fit the newly added shapes.
    if (toCreate.length) {
      const ids = toCreate.map((n) => placed.get(n.id)!).filter(Boolean);
      queueMicrotask(() => editor.zoomToBounds(editor.getSelectionPageBounds() ?? editor.getViewportPageBounds(), { animation: { duration: 300 } }));
      editor.select(...ids);
    }
    // Color handling uses tldraw's named palette; brand hex injection is a
    // follow-up (requires custom shape utils to bypass the palette).
    void resolveColor;
    void brand;
  }, [nodes, brand]);

  return (
    <div className="absolute inset-0">
      <Tldraw onMount={onMount} />
    </div>
  );
}
