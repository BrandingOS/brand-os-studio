/**
 * useDropZone — shared drag-and-drop hook
 *
 * Replaces ad-hoc onDragOver/onDrop handlers scattered across LogoUploader,
 * LogoTool, EditorWorkspace, AssetManager, AIAssistantBox, etc.
 *
 * Supports two flows:
 *   1. File drops — `onFiles(files)` fires when the user drops one or more files
 *   2. Custom payload drops — `onPayload(data)` fires when an internal element
 *      with `dataTransfer.setData('application/x-brandos', JSON.stringify(...))`
 *      is dropped (used for in-list reordering, asset library → slide drag, etc.)
 *
 * Usage:
 * ```tsx
 * const { dropRef, isOver } = useDropZone<HTMLDivElement>({
 *   onFiles: (files) => upload(files[0]),
 *   accept: ['image/*'],
 * });
 * return <div ref={dropRef} className={isOver ? 'ring-2 ring-primary' : ''} />;
 * ```
 */

import { useCallback, useRef, useState, useEffect } from 'react';

const PAYLOAD_MIME = 'application/x-brandos';

export interface DropZoneOptions<T = unknown> {
  /** Called when files are dropped. */
  onFiles?: (files: File[]) => void;
  /** Called when an internal payload (set via setDragPayload) is dropped. */
  onPayload?: (payload: T) => void;
  /** Mime patterns to accept (e.g. ['image/*', '.svg']). Files outside this list are ignored. */
  accept?: string[];
  /** Disable the drop zone. */
  disabled?: boolean;
}

export interface DropZoneApi<E extends HTMLElement> {
  dropRef: React.RefObject<E>;
  isOver: boolean;
}

function fileMatchesAccept(file: File, accept?: string[]): boolean {
  if (!accept || accept.length === 0) return true;
  return accept.some((pat) => {
    if (pat.endsWith('/*')) return file.type.startsWith(pat.slice(0, -1));
    if (pat.startsWith('.')) return file.name.toLowerCase().endsWith(pat.toLowerCase());
    return file.type === pat;
  });
}

export function useDropZone<E extends HTMLElement = HTMLDivElement, T = unknown>(
  opts: DropZoneOptions<T>,
): DropZoneApi<E> {
  const dropRef = useRef<E>(null);
  const [isOver, setIsOver] = useState(false);
  const overCountRef = useRef(0);

  useEffect(() => {
    const el = dropRef.current;
    if (!el || opts.disabled) return;

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      overCountRef.current += 1;
      setIsOver(true);
    };
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      overCountRef.current -= 1;
      if (overCountRef.current <= 0) {
        overCountRef.current = 0;
        setIsOver(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      overCountRef.current = 0;
      setIsOver(false);
      if (!e.dataTransfer) return;

      // Internal payload?
      const raw = e.dataTransfer.getData(PAYLOAD_MIME);
      if (raw && opts.onPayload) {
        try { opts.onPayload(JSON.parse(raw) as T); } catch { /* ignore malformed */ }
        return;
      }

      // Files?
      const files = Array.from(e.dataTransfer.files ?? []).filter((f) => fileMatchesAccept(f, opts.accept));
      if (files.length > 0 && opts.onFiles) {
        opts.onFiles(files);
      }
    };

    el.addEventListener('dragenter', onDragEnter);
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragenter', onDragEnter);
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, [opts.disabled, opts.onFiles, opts.onPayload, opts.accept]);

  return { dropRef, isOver };
}

/** Helper for drag sources to attach a payload that `useDropZone` will read. */
export function setDragPayload(e: React.DragEvent, payload: unknown): void {
  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData(PAYLOAD_MIME, JSON.stringify(payload));
}

/** Convenience hook return for the consumer that wants the underlying ref typed. */
export type { DropZoneApi as UseDropZoneReturn };
