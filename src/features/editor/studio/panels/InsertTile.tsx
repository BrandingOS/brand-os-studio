// A thing you can put on the canvas.
//
// One component for every insertable in every panel, and it is both
// clickable and draggable from the same definition — the drag payload
// IS the `InsertRequest` the click handler would have sent. That is why
// drag-and-drop cost almost nothing to add: there is no second code
// path, only a second way to trigger the same one.

import type { ReactNode } from 'react';
import { STUDIO_DRAG_TYPE } from '../regions/StudioCanvas';
import type { InsertRequest } from '../ops/insertRequest';

interface Props {
  request: InsertRequest;
  onInsert: (request: InsertRequest) => void;
  label: string;
  children: ReactNode;
  caption?: string;
  tall?: boolean;
  disabled?: boolean;
}

export function InsertTile({
  request,
  onInsert,
  label,
  children,
  caption,
  tall,
  disabled,
}: Props) {
  return (
    <div>
      <button
        type="button"
        className={`st-tile ${tall ? 'st-tile--tall' : ''}`}
        title={label}
        aria-label={label}
        disabled={disabled}
        draggable={!disabled}
        onClick={() => onInsert(request)}
        onDragStart={(e) => {
          e.dataTransfer.setData(STUDIO_DRAG_TYPE, JSON.stringify(request));
          e.dataTransfer.effectAllowed = 'copy';
        }}
      >
        {children}
      </button>
      {caption ? <p className="st-tile-caption">{caption}</p> : null}
    </div>
  );
}

/** A full-width row, for text styles where the preview needs the width. */
export function InsertRow({
  request,
  onInsert,
  children,
  label,
  disabled,
}: {
  request: InsertRequest;
  onInsert: (request: InsertRequest) => void;
  children: ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="st-tile st-tile--tall"
      style={{ width: '100%', aspectRatio: 'auto', minHeight: 52, justifyContent: 'flex-start' }}
      title={label}
      aria-label={label}
      disabled={disabled}
      draggable={!disabled}
      onClick={() => onInsert(request)}
      onDragStart={(e) => {
        e.dataTransfer.setData(STUDIO_DRAG_TYPE, JSON.stringify(request));
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      {children}
    </button>
  );
}
