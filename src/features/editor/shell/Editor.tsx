// <Editor> — Phase 1 unified editor shell.
//
// Top-level component that mounts the FabricAdapter, wires it to
// EditorChrome + useAutoSave, and lays out the toolbar / canvas /
// layers panel / properties panel. No fabric imports here — everything
// canvas-shaped goes through the adapter interface.

import { useEffect, useMemo, useRef, useState } from 'react';
import { FabricAdapter } from '@/features/editor/adapter/FabricAdapter';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, SelectionState } from '@/features/editor/schema';
import { EditorChrome } from '@/features/editor/core';
import { useAutoSave } from '@/features/editor/core';
import { useEditorKeyboardShortcuts } from '@/features/editor/hooks/useEditorKeyboardShortcuts';
import { EditorCanvasMount } from './EditorCanvasMount';
import { EditorToolbar } from './EditorToolbar';
import { EditorLayersPanel } from './EditorLayersPanel';
import { EditorPropertiesPanel } from './EditorPropertiesPanel';
import { useEditorUIStore } from '@/features/editor/store/editorUIStore';

interface EditorProps {
  /** Initial document to load. */
  initialDocument: BrandOSDocument;
  /**
   * Persistence target. Receives the latest document on every save.
   * Phase 1 demo uses localStorage; Phase 4 wires templates / Supabase.
   */
  save: (doc: BrandOSDocument) => Promise<void>;
  /** Path to navigate to when the back button is clicked. */
  backTo: string;
  /** Breadcrumb segments shown in the chrome top bar. */
  breadcrumb?: string[];
  /** Document title shown in the chrome top bar. */
  title: string;
}

export function Editor({ initialDocument, save, backTo, breadcrumb, title }: EditorProps) {
  const adapterRef = useRef<EditorAdapter | null>(null);
  const [doc, setDoc] = useState<BrandOSDocument>(initialDocument);
  const [selection, setSelection] = useState<SelectionState>({
    layerIds: [],
    pageId: initialDocument.pages[0]?.id ?? '',
  });

  const { showLayersPanel, showPropertiesPanel } = useEditorUIStore();

  // Lazy-create the adapter once; pass to <EditorCanvasMount> for mount.
  const adapter = useMemo<EditorAdapter>(() => new FabricAdapter(), []);

  // Subscribe to adapter events. Document state mirrors via setDoc;
  // selection mirrors via setSelection. Both feed `useAutoSave`.
  useEffect(() => {
    adapterRef.current = adapter;
    const offChange = adapter.on('change', (next) => setDoc(next));
    const offSelection = adapter.on('selection', (sel) => setSelection(sel));
    return () => {
      offChange();
      offSelection();
    };
  }, [adapter]);

  const { saveState, markDirty, flush, retry } = useAutoSave<BrandOSDocument>({
    value: doc,
    save,
    debounceMs: 1200,
    // Hold "Saved" on screen long enough to register before fading. Default
    // 1500 was indistinguishable from idle on fast saves (e.g. localStorage)
    // — the indicator looked broken in the Phase 1 review.
    savedFadeMs: 2500,
  });

  // Mark dirty whenever the adapter emits a change (drag, type, add, etc.).
  useEffect(() => {
    markDirty();
    // doc identity changes on every adapter emit — that's the dirty signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  useEditorKeyboardShortcuts({
    adapter: adapterRef.current,
    onFlushSave: flush,
  });

  return (
    <div className="flex h-screen w-screen flex-col bg-muted/30">
      <EditorChrome
        backTo={backTo}
        breadcrumb={breadcrumb}
        title={title}
        saveState={saveState}
        onRetry={retry}
      />
      <div className="flex flex-1 min-h-0">
        <EditorToolbar adapter={adapter} pageId={selection.pageId} />
        <div className="flex flex-1 min-w-0 items-center justify-center overflow-auto p-8">
          <div className="rounded-md bg-white shadow-2xl ring-1 ring-black/5">
            <EditorCanvasMount adapter={adapter} initialDocument={initialDocument} />
          </div>
        </div>
        {showLayersPanel ? (
          <EditorLayersPanel adapter={adapter} doc={doc} selection={selection} />
        ) : null}
        {showPropertiesPanel ? (
          <EditorPropertiesPanel adapter={adapter} doc={doc} selection={selection} />
        ) : null}
      </div>
    </div>
  );
}
