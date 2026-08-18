/**
 * useAutoSave — debounced auto-save hook for any editor.
 *
 * Tracks the dirty state of a document, debounces saves, and reports a
 * normalized save state for UI display in EditorChrome's save indicator.
 *
 * Designed to be the SINGLE save model used by every editor in BrandingOS,
 * killing the current zoo (localStorage debounce in Design Editor,
 * immediate per-change writes in Brand Edit, Supabase API in Guidelines,
 * none in Logo Maker, etc).
 *
 * Adoption is incremental — see ./README.md for the migration guide.
 *
 *   const { saveState, markDirty, flush, retry } = useAutoSave({
 *     value: doc,
 *     save: async (next) => api.update(next),
 *     debounceMs: 1200,
 *   });
 *
 *   // In your handler:
 *   setDoc(next);
 *   markDirty();
 *
 *   // In your save indicator:
 *   <EditorChrome saveState={saveState} onRetry={retry} ... />
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorSaveState } from './EditorChrome';

interface UseAutoSaveOptions<T> {
  /** Latest value to be saved (a snapshot from the editor's state). */
  value: T;
  /** Async save function. Should reject on failure to trigger 'error' state. */
  save: (value: T) => Promise<void>;
  /** Debounce window in ms. Defaults to 1200. */
  debounceMs?: number;
  /** How long to show 'saved' before fading back to 'idle'. Defaults to 1500. */
  savedFadeMs?: number;
  /** Disable saving entirely (e.g. while the doc is loading). */
  enabled?: boolean;
}

interface UseAutoSaveResult {
  saveState: EditorSaveState;
  /** Call after every change. Schedules a debounced save. */
  markDirty: () => void;
  /** Force an immediate save (e.g. on Cmd+S or before navigation). */
  flush: () => Promise<void>;
  /** Retry after a failed save. */
  retry: () => Promise<void>;
}

export function useAutoSave<T>({
  value,
  save,
  debounceMs = 1200,
  savedFadeMs = 1500,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveResult {
  const [saveState, setSaveState] = useState<EditorSaveState>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always read the LATEST value when actually firing the save, even though
  // the call was scheduled earlier. Avoids saving a stale snapshot.
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const cancelTimers = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    debounceTimer.current = null;
    fadeTimer.current = null;
  }, []);

  const performSave = useCallback(async () => {
    setSaveState('saving');
    try {
      await save(valueRef.current);
      setSaveState('saved');
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => setSaveState('idle'), savedFadeMs);
    } catch (err) {
      console.error('Auto-save failed:', err);
      setSaveState('error');
    }
  }, [save, savedFadeMs]);

  const markDirty = useCallback(() => {
    if (!enabled) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void performSave();
    }, debounceMs);
  }, [enabled, debounceMs, performSave]);

  const flush = useCallback(async () => {
    if (!enabled) return;
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    await performSave();
  }, [enabled, performSave]);

  const retry = useCallback(async () => {
    await flush();
  }, [flush]);

  useEffect(() => () => cancelTimers(), [cancelTimers]);

  return { saveState, markDirty, flush, retry };
}
