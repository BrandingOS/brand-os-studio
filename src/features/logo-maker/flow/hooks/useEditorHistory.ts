import { useCallback, useEffect, useRef, useState } from 'react';
import type { Canvas } from 'fabric';

// Fabric v6 removed the built-in history plugin. Simple snapshot-based
// implementation: we store canvas JSON strings in a ring buffer. Good enough
// for a logo editor — we rarely need thousands of history steps.

const MAX_HISTORY = 50;

export interface HistoryAPI {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: () => void;
  capture: () => void;
}

export function useEditorHistory(canvas: Canvas | null): HistoryAPI {
  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  const isApplying = useRef(false);
  const [version, setVersion] = useState(0); // triggers canUndo/canRedo recompute

  const snapshot = useCallback(() => {
    if (!canvas) return null;
    return JSON.stringify(canvas.toJSON());
  }, [canvas]);

  const capture = useCallback(() => {
    if (!canvas || isApplying.current) return;
    const snap = snapshot();
    if (!snap) return;
    past.current.push(snap);
    if (past.current.length > MAX_HISTORY) past.current.shift();
    future.current = [];
    setVersion((v) => v + 1);
  }, [canvas, snapshot]);

  useEffect(() => {
    if (!canvas) return;
    // Seed with initial state
    const initial = snapshot();
    if (initial) past.current = [initial];
    future.current = [];
    setVersion((v) => v + 1);

    const onChange = () => capture();
    canvas.on('object:added', onChange);
    canvas.on('object:modified', onChange);
    canvas.on('object:removed', onChange);
    return () => {
      canvas.off('object:added', onChange);
      canvas.off('object:modified', onChange);
      canvas.off('object:removed', onChange);
    };
  }, [canvas, capture, snapshot]);

  const apply = useCallback(
    (json: string) => {
      if (!canvas) return;
      isApplying.current = true;
      canvas.loadFromJSON(JSON.parse(json)).then(() => {
        canvas.renderAll();
        isApplying.current = false;
      });
    },
    [canvas],
  );

  const undo = useCallback(() => {
    if (past.current.length <= 1) return;
    const current = past.current.pop();
    if (current) future.current.push(current);
    const prev = past.current[past.current.length - 1];
    if (prev) apply(prev);
    setVersion((v) => v + 1);
  }, [apply]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(next);
    apply(next);
    setVersion((v) => v + 1);
  }, [apply]);

  const reset = useCallback(() => {
    past.current = [];
    future.current = [];
    setVersion((v) => v + 1);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _touch = version; // keep version in deps so React re-renders consumers
  return {
    undo,
    redo,
    canUndo: past.current.length > 1,
    canRedo: future.current.length > 0,
    reset,
    capture,
  };
}
