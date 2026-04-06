/**
 * DragHandle — reorderable handle for lists.
 *
 * Pairs with `useDropZone` for the drop target. Sets a payload like
 * `{ kind: 'reorder', listId, index }` so the receiving zone can compute
 * a swap/move.
 *
 * Usage:
 * ```tsx
 * <DragHandle listId="logos" index={i}>
 *   <GripVertical className="h-4 w-4" />
 * </DragHandle>
 * ```
 */

import { GripVertical } from 'lucide-react';
import { setDragPayload } from './useDropZone';

export interface ReorderPayload {
  kind: 'reorder';
  listId: string;
  index: number;
}

export interface DragHandleProps {
  listId: string;
  index: number;
  children?: React.ReactNode;
  className?: string;
  /** Additional payload merged into the reorder payload. */
  extra?: Record<string, unknown>;
}

export function DragHandle({ listId, index, children, className, extra }: DragHandleProps) {
  return (
    <div
      draggable
      onDragStart={(e) => setDragPayload(e, { kind: 'reorder', listId, index, ...extra })}
      className={className ?? 'cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700'}
      aria-label="Drag to reorder"
    >
      {children ?? <GripVertical className="h-4 w-4" />}
    </div>
  );
}
