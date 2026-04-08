/**
 * BlockEditor — wraps a single block with edit/move/delete affordances and
 * a per-type inline editor.
 *
 * Inline editors keep the surface small (mostly textareas + simple inputs).
 * Power editing is queued for a follow-up.
 */
import * as React from 'react';
import { ChevronUp, ChevronDown, Trash2, GripVertical } from 'lucide-react';
import type { Block } from './types';
import { BlockRenderer } from './BlockRenderer';
import { cn } from '@/lib/utils';

interface BlockEditorProps {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function BlockEditor({ block, onUpdate, onMoveUp, onMoveDown, onDelete, isFirst, isLast }: BlockEditorProps) {
  const [editing, setEditing] = React.useState(false);

  return (
    <div className="group relative">
      {/* Side rail with controls */}
      <div className="absolute -left-12 top-0 hidden flex-col items-center gap-1 opacity-0 transition group-hover:opacity-100 md:flex">
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          aria-label="Drag handle"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          className="rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground disabled:opacity-30"
          aria-label="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className="rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground disabled:opacity-30"
          aria-label="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        onDoubleClick={() => setEditing(true)}
        className={cn(
          'relative rounded-xl border border-transparent transition',
          editing && 'border-primary/40 bg-primary/5 p-4',
          !editing && 'hover:border-border hover:bg-card/30 hover:p-4',
        )}
      >
        {editing ? (
          <InlineEditor block={block} onUpdate={onUpdate} onDone={() => setEditing(false)} />
        ) : (
          <BlockRenderer block={block} />
        )}
      </div>
    </div>
  );
}

function InlineEditor({
  block,
  onUpdate,
  onDone,
}: {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
  onDone: () => void;
}) {
  const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

  const Done = () => (
    <button
      type="button"
      onClick={onDone}
      className="ml-auto inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:border-primary/40"
    >
      Done
    </button>
  );

  switch (block.type) {
    case 'heading':
      return (
        <div className="flex items-start gap-3" onClick={stop}>
          <select
            value={block.level}
            onChange={(e) => onUpdate({ level: Number(e.target.value) as 1 | 2 | 3 })}
            className="rounded border border-border bg-background px-2 py-1 text-xs"
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            type="text"
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm focus:border-primary/50 focus:outline-none"
            autoFocus
          />
          <Done />
        </div>
      );
    case 'paragraph':
      return (
        <div className="space-y-2" onClick={stop}>
          <textarea
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={4}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-primary/50 focus:outline-none"
            autoFocus
          />
          <div className="flex justify-end">
            <Done />
          </div>
        </div>
      );
    case 'quote':
      return (
        <div className="space-y-2" onClick={stop}>
          <textarea
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={3}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-primary/50 focus:outline-none"
            autoFocus
          />
          <input
            type="text"
            value={block.author ?? ''}
            onChange={(e) => onUpdate({ author: e.target.value })}
            placeholder="Author"
            className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:border-primary/50 focus:outline-none"
          />
          <div className="flex justify-end">
            <Done />
          </div>
        </div>
      );
    case 'image':
      return (
        <div className="space-y-2" onClick={stop}>
          <input
            type="text"
            value={block.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="Image URL"
            className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:border-primary/50 focus:outline-none"
            autoFocus
          />
          <input
            type="text"
            value={block.caption ?? ''}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            placeholder="Caption (optional)"
            className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:border-primary/50 focus:outline-none"
          />
          <div className="flex justify-end">
            <Done />
          </div>
        </div>
      );
    case 'color-swatch':
      return (
        <div className="space-y-2" onClick={stop}>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={block.hex}
              onChange={(e) => onUpdate({ hex: e.target.value })}
              className="h-8 w-12 cursor-pointer rounded border border-border bg-background"
            />
            <input
              type="text"
              value={block.hex}
              onChange={(e) => onUpdate({ hex: e.target.value })}
              className="flex-1 rounded border border-border bg-background px-3 py-1.5 font-mono text-xs"
            />
          </div>
          <input
            type="text"
            value={block.name ?? ''}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Name (e.g. Primary)"
            className="w-full rounded border border-border bg-background px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={block.usage ?? ''}
            onChange={(e) => onUpdate({ usage: e.target.value })}
            placeholder="Usage notes"
            className="w-full rounded border border-border bg-background px-3 py-2 text-xs"
          />
          <div className="flex justify-end">
            <Done />
          </div>
        </div>
      );
    case 'callout':
      return (
        <div className="space-y-2" onClick={stop}>
          <select
            value={block.variant}
            onChange={(e) => onUpdate({ variant: e.target.value as 'info' | 'success' | 'warning' | 'danger' })}
            className="rounded border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="danger">Danger</option>
          </select>
          <input
            type="text"
            value={block.title ?? ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Title (optional)"
            className="w-full rounded border border-border bg-background px-3 py-2 text-xs"
            autoFocus
          />
          <textarea
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={3}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <Done />
          </div>
        </div>
      );
    case 'code':
      return (
        <div className="space-y-2" onClick={stop}>
          <input
            type="text"
            value={block.language ?? ''}
            onChange={(e) => onUpdate({ language: e.target.value })}
            placeholder="Language (e.g. typescript)"
            className="w-full rounded border border-border bg-background px-3 py-2 text-xs"
          />
          <textarea
            value={block.code}
            onChange={(e) => onUpdate({ code: e.target.value })}
            rows={8}
            className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-xs"
            autoFocus
          />
          <div className="flex justify-end">
            <Done />
          </div>
        </div>
      );
    case 'download':
      return (
        <div className="space-y-2" onClick={stop}>
          <input
            type="text"
            value={block.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Label"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            autoFocus
          />
          <input
            type="text"
            value={block.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="URL"
            className="w-full rounded border border-border bg-background px-3 py-2 text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={block.format ?? ''}
              onChange={(e) => onUpdate({ format: e.target.value })}
              placeholder="Format"
              className="rounded border border-border bg-background px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={block.fileSize ?? ''}
              onChange={(e) => onUpdate({ fileSize: e.target.value })}
              placeholder="File size"
              className="rounded border border-border bg-background px-3 py-2 text-xs"
            />
          </div>
          <div className="flex justify-end">
            <Done />
          </div>
        </div>
      );
    case 'do-dont':
      return (
        <div className="space-y-3" onClick={stop}>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Do</label>
            <textarea
              value={block.do.text}
              onChange={(e) => onUpdate({ do: { ...block.do, text: e.target.value } })}
              rows={2}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-red-400">Don't</label>
            <textarea
              value={block.dont.text}
              onChange={(e) => onUpdate({ dont: { ...block.dont, text: e.target.value } })}
              rows={2}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <Done />
          </div>
        </div>
      );
    default:
      return (
        <div className="space-y-2" onClick={stop}>
          <p className="text-xs text-muted-foreground">No inline editor for this block type yet — use the next sprint's properties panel.</p>
          <div className="flex justify-end">
            <Done />
          </div>
        </div>
      );
  }
}
