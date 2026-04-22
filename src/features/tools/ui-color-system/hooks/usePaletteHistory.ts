/**
 * usePaletteHistory — undo/redo for palette edits.
 *
 * The palette state is a JSON tree; we snapshot it after every mutation
 * and keep a bounded ring buffer of past states plus a redo stack.
 * Snapshots are shallow-copied at the tree root; each role scale is
 * immutable at the value level so we don't need structural cloning.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import type { PaletteSystem } from '@/lib/color-engine';

const MAX_HISTORY = 50;

export interface PaletteHistory {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => PaletteSystem | null;
  redo: () => PaletteSystem | null;
}

export function usePaletteHistory(
  current: PaletteSystem,
  onRestore: (next: PaletteSystem) => void,
): PaletteHistory {
  const past = useRef<PaletteSystem[]>([]);
  const future = useRef<PaletteSystem[]>([]);
  const lastCapture = useRef<string>('');
  const [, force] = useState(0);

  // Snapshot whenever the palette signature changes.
  useEffect(() => {
    const sig = signatureOf(current);
    if (sig === lastCapture.current) return;
    // Any new change invalidates the redo stack.
    future.current = [];
    if (lastCapture.current !== '') {
      past.current.push({ ...current });
      if (past.current.length > MAX_HISTORY) past.current.shift();
    }
    lastCapture.current = sig;
    force((n) => n + 1);
  }, [current]);

  const undo = useCallback(() => {
    if (past.current.length === 0) return null;
    const prev = past.current.pop()!;
    future.current.push({ ...current });
    // Prevent the effect from re-snapshotting the restored state.
    lastCapture.current = signatureOf(prev);
    onRestore(prev);
    force((n) => n + 1);
    return prev;
  }, [current, onRestore]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return null;
    const next = future.current.pop()!;
    past.current.push({ ...current });
    lastCapture.current = signatureOf(next);
    onRestore(next);
    force((n) => n + 1);
    return next;
  }, [current, onRestore]);

  return {
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    undo,
    redo,
  };
}

function signatureOf(p: PaletteSystem): string {
  // A lightweight signature derived from seed colors + semantic tokens.
  // Covers all meaningful mutation points without serializing everything.
  const roles = [
    p.roles.primary.inputHex,
    p.roles.secondary?.inputHex ?? '',
    p.roles.tertiary?.inputHex ?? '',
    p.roles.neutral.inputHex,
    p.roles.success?.inputHex ?? '',
    p.roles.warning?.inputHex ?? '',
    p.roles.error?.inputHex ?? '',
    p.roles.info?.inputHex ?? '',
  ].join('|');
  return `${roles}::${p.semanticTokens.canvas}::${p.settings.generationMode}::${p.settings.lockedShade}`;
}
