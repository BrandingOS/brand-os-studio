// Right-side layers panel — list, eye, lock, reorder, delete.
//
// Reads the live document via props (parent <Editor> mirrors the
// adapter's `change` event into state). Mutations go through the
// adapter; the next change event flows back and re-renders.

import { Eye, EyeOff, Lock, LockOpen, Trash2, MoveUp, MoveDown } from 'lucide-react';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, Layer, SelectionState } from '@/features/editor/schema';
import { cn } from '@/lib/utils';

interface Props {
  adapter: EditorAdapter;
  doc: BrandOSDocument;
  selection: SelectionState;
}

export function EditorLayersPanel({ adapter, doc, selection }: Props) {
  const page = doc.pages.find((p) => p.id === selection.pageId) ?? doc.pages[0];
  if (!page) return null;
  const layers = [...page.layers].reverse(); // top-most first in UI

  const toggleVisible = (l: Layer) => adapter.updateLayer(page.id, l.id, { visible: !l.visible });
  const toggleLocked = (l: Layer) => adapter.updateLayer(page.id, l.id, { locked: !l.locked });
  const remove = (l: Layer) => adapter.removeLayer(page.id, l.id);
  const moveUp = (l: Layer) => {
    const idx = page.layers.findIndex((x) => x.id === l.id);
    if (idx < page.layers.length - 1) adapter.reorderLayer(page.id, l.id, idx + 1);
  };
  const moveDown = (l: Layer) => {
    const idx = page.layers.findIndex((x) => x.id === l.id);
    if (idx > 0) adapter.reorderLayer(page.id, l.id, idx - 1);
  };

  return (
    <aside className="flex w-64 flex-col border-l bg-background">
      <header className="flex items-center justify-between border-b px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Layers
        <span className="text-[10px] normal-case">{layers.length}</span>
      </header>
      <ul className="flex-1 overflow-auto p-1">
        {layers.map((l) => {
          const selected = selection.layerIds.includes(l.id);
          return (
            <li
              key={l.id}
              className={cn(
                'group flex items-center gap-1 rounded px-2 py-1.5 text-xs',
                selected ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
              onClick={() => adapter.setSelection([l.id])}
            >
              <span className="flex-1 truncate">
                <span className="text-[10px] uppercase tracking-wider opacity-50 mr-2">
                  {l.kind}
                </span>
                {l.name}
              </span>
              <IconButton title="Move up" onClick={(e) => stop(e, () => moveUp(l))}>
                <MoveUp className="h-3 w-3" />
              </IconButton>
              <IconButton title="Move down" onClick={(e) => stop(e, () => moveDown(l))}>
                <MoveDown className="h-3 w-3" />
              </IconButton>
              <IconButton
                title={l.visible ? 'Hide' : 'Show'}
                onClick={(e) => stop(e, () => toggleVisible(l))}
              >
                {l.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </IconButton>
              <IconButton
                title={l.locked ? 'Unlock' : 'Lock'}
                onClick={(e) => stop(e, () => toggleLocked(l))}
              >
                {l.locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
              </IconButton>
              <IconButton title="Delete" onClick={(e) => stop(e, () => remove(l))}>
                <Trash2 className="h-3 w-3" />
              </IconButton>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function IconButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
    >
      {children}
    </button>
  );
}

function stop(e: React.MouseEvent, fn: () => void) {
  e.stopPropagation();
  fn();
}
