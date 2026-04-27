// Left-rail toolbar — add layer types and basic selection tools.

import { Image as ImageIcon, MousePointer2, Square, Type, Circle as CircleIcon } from 'lucide-react';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { Layer } from '@/features/editor/schema';
import { useEditorUIStore, type EditorTool } from '@/features/editor/store/editorUIStore';
import { cn } from '@/lib/utils';

interface Props {
  adapter: EditorAdapter;
  pageId: string;
}

const TOOLS: Array<{ id: EditorTool; label: string; Icon: typeof MousePointer2 }> = [
  { id: 'select', label: 'Select', Icon: MousePointer2 },
  { id: 'text', label: 'Text', Icon: Type },
  { id: 'rectangle', label: 'Rectangle', Icon: Square },
  { id: 'ellipse', label: 'Ellipse', Icon: CircleIcon },
  { id: 'image', label: 'Image', Icon: ImageIcon },
];

export function EditorToolbar({ adapter, pageId }: Props) {
  const { tool, setTool } = useEditorUIStore();

  const handleClick = (id: EditorTool) => {
    setTool(id);
    if (id === 'select' || !pageId) return;
    const layer = makeLayer(id);
    if (layer) adapter.addLayer(pageId, layer);
    setTool('select');
  };

  return (
    <aside className="flex w-14 flex-col items-center gap-1 border-r bg-background py-3">
      {TOOLS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => handleClick(id)}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            tool === id && 'bg-muted text-foreground',
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </aside>
  );
}

function makeLayer(tool: EditorTool): Layer | null {
  const id = crypto.randomUUID();
  const baseTransform = { x: 100, y: 100, width: 200, height: 100, rotation: 0, scaleX: 1, scaleY: 1 };
  const baseLayer = {
    id,
    transform: baseTransform,
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
  } as const;

  switch (tool) {
    case 'text':
      return {
        ...baseLayer,
        kind: 'text',
        name: 'Text',
        text: 'Edit me',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 32,
        fontWeight: 400,
        lineHeight: 1.2,
        letterSpacing: 0,
        textAlign: 'left',
        direction: 'auto',
        color: '#111111',
      };
    case 'rectangle':
      return {
        ...baseLayer,
        kind: 'shape',
        name: 'Rectangle',
        shape: 'rectangle',
        fill: '#6366f1',
        stroke: null,
        strokeWidth: 0,
        cornerRadius: 8,
      };
    case 'ellipse':
      return {
        ...baseLayer,
        kind: 'shape',
        name: 'Ellipse',
        shape: 'ellipse',
        fill: '#10b981',
        stroke: null,
        strokeWidth: 0,
        cornerRadius: 0,
      };
    case 'image':
      // Phase 1 stub URL — Phase 2 hooks AssetSourcePopover.
      return {
        ...baseLayer,
        kind: 'image',
        name: 'Image',
        src: 'https://placehold.co/400x300/png',
        fit: 'cover',
        transform: { ...baseTransform, width: 400, height: 300 },
      };
    default:
      return null;
  }
}
