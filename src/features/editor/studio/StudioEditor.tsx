// The BrandingOS Design Studio.
//
// A full-screen creation application: top bar, creation rail, contextual
// panel, workspace, contextual toolbar, pages and zoom. This file owns
// the FRAME and the wiring, and nothing else — the regions render
// themselves, the operations live in `ops/`, the state lives in
// `state/`, and the canvas belongs to whichever renderer the document's
// content type names.
//
// It replaces `shell/Editor.tsx`, which had grown to a thousand lines of
// layout arithmetic, absolute positioning and per-frame React state. The
// behaviours that mattered there — brand kit re-apply, the AI panel,
// master pages, cross-page propagation, variants, presence — are carried
// over rather than rewritten; they were not the problem.
//
// What the shell deliberately still does NOT know: that Fabric exists.
// It asks the registry for a renderer, and a renderer that paints a
// document it does not decompose into layers (`template-instance`, every
// Brand Kit deliverable) gets its own properties surface instead of the
// layer affordances. That branch is why invoices and letterheads keep
// working.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type {
  DocumentAdapter,
  EditorAdapter,
  LayerEditingAdapter,
} from '@/features/editor/adapter/EditorAdapter';
import type { FabricAdapter } from '@/features/editor/adapter/FabricAdapter';
import type { BrandOSDocument, Layer } from '@/features/editor/schema';
import { getDesignRenderer } from '@/features/editor/renderers';
import { useAutoSave } from '@/features/editor/core';
import { getContentTypeConfig, type ContentTypeConfig } from '@/features/editor/content-types';
import type { Brand } from '@/shared/types/brand';
import { applyBrandToDocument } from '@/features/editor/brand/applyBrandToDocument';
import { useBrandKit } from '@/features/editor/brand/useBrandKit';
import { triggerCrossPagePromptIfApplicable } from '@/features/editor/brand/crossPagePropagation';
import { useAiAgent } from '@/features/editor/ai/useAiAgent';
import { applyAICommandResult } from '@/features/editor/ai/applyResult';
import type { AIAgent, AICommandContext, AICommandResult } from '@/features/editor/ai/types';
import { useWorkspaceTheme } from '@/shared/theme/useWorkspaceTheme';

import { StudioTopBar } from './regions/StudioTopBar';
import { StudioRail } from './regions/StudioRail';
import { StudioPanel } from './regions/StudioPanel';
import { StudioContextBar } from './regions/StudioContextBar';
import { StudioBottomBar } from './regions/StudioBottomBar';
import { StudioCanvas } from './regions/StudioCanvas';
import { StudioEmptyState } from './regions/StudioEmptyState';
import { StudioShortcutSheet } from './regions/StudioShortcutSheet';
import {
  createDocumentSink,
  resetStudio,
  useActivePage,
  usePageSummaries,
  useStudioStore,
  useViewport,
  type RailId,
} from './state/studioStore';
import { useStudioViewport } from './state/useStudioViewport';
import { useStudioHotkeys } from './state/useStudioHotkeys';
import { insertLayer, type InsertRequest } from './ops/insertRequest';
import { isMasterTemplate, makeThumbnail } from './ops/documentHealth';
import './studio.css';

export interface StudioEditorProps {
  initialDocument: BrandOSDocument;
  /**
   * `extras` carries what the editor can compute and the route cannot —
   * today a thumbnail rasterized from the live canvas.
   */
  save: (
    doc: BrandOSDocument,
    extras?: { thumbnailUrl?: string },
  ) => Promise<void>;
  saveEnabled?: boolean;
  brand?: Brand;
  /** Where the back arrow and the brand chip go. */
  backTo: string;
  /** No `designs.edit` capability — the canvas is a viewer. */
  readOnly?: boolean;
  onAdapterReady?: (adapter: EditorAdapter) => void;
  onShare?: () => void;
  onRename?: (name: string) => void;
  aiAgent?: AIAgent;
  initialPrompt?: string;
  initialAi?: {
    mode?: 'image' | 'editable';
    model?: string;
    formatId?: string;
    count?: number;
    autoStart?: boolean;
  };
  /** Extra items for the top bar's overflow cluster (variants, duplicate…). */
  topBarActions?: React.ReactNode;
}

export function StudioEditor({
  initialDocument,
  save,
  saveEnabled = true,
  brand,
  backTo,
  readOnly = false,
  onAdapterReady,
  onShare,
  onRename,
  aiAgent,
  initialPrompt,
  initialAi,
  topBarActions,
}: StudioEditorProps) {
  // ─── Renderer + adapter ───────────────────────────────────────────────
  const renderer = useMemo(
    () => getDesignRenderer(initialDocument.contentType),
    [initialDocument.contentType],
  );
  const adapter = useMemo(() => renderer.createAdapter(), [renderer]);
  const layerAdapter = useMemo<LayerEditingAdapter | null>(
    () => (renderer.supportsLayerEditing ? (adapter as LayerEditingAdapter) : null),
    [renderer, adapter],
  );
  // Viewport is a Fabric capability, asked for by shape rather than by
  // name so a future renderer can offer it without the shell changing.
  const viewportAdapter = useMemo<FabricAdapter | null>(
    () =>
      typeof (adapter as Partial<FabricAdapter>).enableViewport === 'function'
        ? (adapter as FabricAdapter)
        : null,
    [adapter],
  );

  const contentType = useMemo<ContentTypeConfig>(() => {
    try {
      return getContentTypeConfig(initialDocument.contentType);
    } catch {
      return getContentTypeConfig('social-post');
    }
  }, [initialDocument.contentType]);

  const brandKit = useBrandKit(brand);
  const sharedAgent = useAiAgent(brandKit);
  const agent = aiAgent ?? sharedAgent;
  const { theme, toggleTheme } = useWorkspaceTheme();

  // ─── Store wiring ─────────────────────────────────────────────────────
  //
  // One subscription, rAF-coalesced. The adapter emits `change` on every
  // pointer frame of a drag; without the sink that is a full React
  // render of the editor per pointer event.
  const [docVersion, setDocVersion] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    resetStudio();
    const store = useStudioStore.getState();
    store.setDoc(initialDocument);
    store.setActivePageId(initialDocument.pages[0]?.id ?? '');
    store.setRail(initialPrompt || initialAi?.autoStart ? 'ai' : 'brand');
    return () => resetStudio();
  }, [initialDocument, initialPrompt, initialAi?.autoStart]);

  useEffect(() => {
    useStudioStore.getState().setReadOnly(readOnly);
  }, [readOnly]);

  useEffect(() => {
    if (layerAdapter) onAdapterReady?.(layerAdapter);
    const sink = createDocumentSink((next) => {
      const store = useStudioStore.getState();
      store.setDoc(next);
      try {
        store.setActivePageId(adapter.getActivePageId());
      } catch {
        /* no active page yet — early load */
      }
      store.setEditingMasterId(layerAdapter ? layerAdapter.getEditingMasterId() : null);
      // Undo/redo availability is not on the document, so it needs its
      // own tick. It is cheap and only the two buttons read it.
      setDocVersion((v) => v + 1);
    });
    const offChange = adapter.on('change', (next) => sink.push(next));
    const offSelection = adapter.on('selection', (sel) =>
      useStudioStore.getState().setSelection(sel.layerIds),
    );
    return () => {
      offChange();
      offSelection();
      sink.dispose();
    };
  }, [adapter, layerAdapter, onAdapterReady]);

  useEffect(() => {
    adapter.setBrand(brand);
  }, [adapter, brand]);

  const doc = useStudioStore((s) => s.doc) ?? initialDocument;
  const activePage = useActivePage();
  const pages = usePageSummaries();
  const activePageId = useStudioStore((s) => s.activePageId);
  const editingMasterId = useStudioStore((s) => s.editingMasterId);
  const rail = useStudioStore((s) => s.rail);
  const setRail = useStudioStore((s) => s.setRail);
  const { zoom } = useViewport();

  // ─── Autosave ─────────────────────────────────────────────────────────
  //
  // Every save carries a fresh thumbnail. Nothing in the product has
  // ever produced one, so every design anyone made showed a grey
  // placeholder in the grid for ever — while the column and the
  // storage contract to hold it have existed since migration 015.
  const saveWithThumbnail = useCallback(
    async (next: BrandOSDocument) => {
      const thumbnailUrl = await makeThumbnail(adapter, next);
      await save(next, thumbnailUrl ? { thumbnailUrl } : undefined);
    },
    [adapter, save],
  );

  const { saveState, markDirty, flush, retry } = useAutoSave<BrandOSDocument>({
    value: doc,
    save: saveWithThumbnail,
    debounceMs: 1200,
    savedFadeMs: 2500,
    enabled: saveEnabled && !readOnly,
  });

  // Mark dirty only once the document has actually CHANGED.
  //
  // Merely opening a design used to write it back a second later: the
  // adapter emits on load and again when the brand is applied, and any
  // emit was taken as an edit. That is a version bump, an `updated_by`
  // rewrite and a re-persisted document for a design nobody touched.
  //
  // The comparison runs only until the first real edit, so it costs a
  // couple of serializations per session rather than one per change.
  const baselineRef = useRef<string | null>(null);
  const everEditedRef = useRef(false);
  useEffect(() => {
    if (everEditedRef.current) {
      markDirty();
      return;
    }
    if (baselineRef.current === null) {
      baselineRef.current = JSON.stringify(initialDocument);
      return;
    }
    if (JSON.stringify(doc) === baselineRef.current) return;
    everEditedRef.current = true;
    markDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  // A debounced save is 1.2s of work that has not left the browser yet.
  // Closing the tab or navigating away inside that window used to lose
  // it silently, with nothing on screen to say so.
  //
  // The listeners are registered ONCE. Listing `saveState` as a
  // dependency made the effect re-run on every save-state change, and
  // its cleanup — which exists to flush on unmount — then fired on each
  // one: flush → saving → re-run → cleanup → flush, an autosave loop
  // that never settled. Live values come through refs instead.
  const saveStateRef = useRef(saveState);
  saveStateRef.current = saveState;
  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => {
    if (!saveEnabled || readOnly) return;
    const onLeave = () => {
      const state = saveStateRef.current;
      if (state === 'idle' || state === 'saved') return;
      void flushRef.current();
    };
    window.addEventListener('pagehide', onLeave);
    document.addEventListener('visibilitychange', onLeave);
    return () => {
      window.removeEventListener('pagehide', onLeave);
      document.removeEventListener('visibilitychange', onLeave);
      onLeave();
    };
  }, [saveEnabled, readOnly]);

  // ─── Viewport ─────────────────────────────────────────────────────────
  const pageSize = activePage
    ? { width: activePage.width, height: activePage.height }
    : null;
  const viewport = useStudioViewport(viewportAdapter, pageSize);

  useStudioHotkeys({
    adapter: layerAdapter,
    viewport,
    onFlushSave: flush,
    onToggleShortcuts: () => setShortcutsOpen((v) => !v),
  });

  // ─── Editing ──────────────────────────────────────────────────────────

  /**
   * Every user-driven property edit goes through here so the cross-page
   * consistency prompt fires. The bulk propagation the prompt offers
   * does NOT funnel back through this wrapper, so it cannot loop.
   */
  const updateLayer = useCallback(
    (pageId: string, layerId: string, patch: Partial<Layer>) => {
      if (!layerAdapter || readOnly) return;
      const page = layerAdapter.getDocument().pages.find((p) => p.id === pageId);
      const before = page?.layers.find((l) => l.id === layerId);
      layerAdapter.updateLayer(pageId, layerId, patch);
      if (before) {
        triggerCrossPagePromptIfApplicable(layerAdapter, pageId, before, patch);
      }
    },
    [layerAdapter, readOnly],
  );

  const insert = useCallback(
    (request: InsertRequest, at?: { x: number; y: number }) => {
      if (!layerAdapter || !activePage || readOnly) return;
      insertLayer({
        adapter: layerAdapter,
        page: activePage,
        kit: brandKit,
        request,
        centre: at ?? viewport.visibleCentre(),
      });
    },
    [layerAdapter, activePage, brandKit, viewport, readOnly],
  );

  const handleReapplyBrand = useCallback(() => {
    if (!brandKit) {
      toast.error('Brand kit unavailable. Open this design from inside a brand.');
      return;
    }
    try {
      const next = applyBrandToDocument(adapter.getDocument(), brandKit, {
        respectLocks: true,
      });
      // replaceDocument, not loadDocument, so history survives and the
      // whole re-apply reverts in one press of ⌘Z.
      adapter.batch('Re-apply brand kit', () => {
        void (adapter as DocumentAdapter).replaceDocument(next);
      });
      toast.success('Brand kit re-applied');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to re-apply brand kit');
    }
  }, [adapter, brandKit]);

  const handleExport = useCallback(async () => {
    try {
      const blob = await adapter.exportAs({
        format: contentType.defaultExportFormat,
        scale: 2,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docName(doc)}.${contentType.defaultExportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    }
  }, [adapter, contentType.defaultExportFormat, doc]);

  const handleRename = useCallback(
    (name: string) => {
      onRename?.(name);
      const current = adapter.getDocument();
      adapter.batch('Rename', () => {
        void (adapter as DocumentAdapter).replaceDocument({
          ...current,
          metadata: { ...current.metadata, name },
        });
      });
    },
    [adapter, onRename],
  );

  // ─── Pages ────────────────────────────────────────────────────────────

  const addPage = useCallback(() => {
    if (!layerAdapter || !activePage) return;
    const id = layerAdapter.duplicatePageEmpty(activePage.id);
    layerAdapter.setActivePage(id);
  }, [layerAdapter, activePage]);

  const duplicatePage = useCallback(
    (pageId: string) => {
      if (!layerAdapter) return;
      const id = layerAdapter.duplicatePage(pageId);
      layerAdapter.setActivePage(id);
    },
    [layerAdapter],
  );

  const deletePage = useCallback(
    (pageId: string) => {
      if (!layerAdapter) return;
      layerAdapter.removePage(pageId);
    },
    [layerAdapter],
  );

  // ─── Render ───────────────────────────────────────────────────────────

  // Read every render rather than memoized on `docVersion`: history
  // availability is not on the document, so there is nothing to derive
  // it from, and both are a length check on an array. `docVersion` is
  // what causes the render; it is not an input to the answer.
  void docVersion;
  const canUndo = adapter.canUndo();
  const canRedo = adapter.canRedo();
  // "This page is empty" is a LAYER statement. A template-instance page
  // carries zero layers by design — its content lives in the document's
  // body and is edited in the properties panel — so the prompt would be
  // both wrong and unusable there ("Add a heading" has nowhere to go).
  const isEmpty =
    renderer.supportsLayerEditing && (activePage?.layers.length ?? 0) === 0;

  return (
    <div data-workspace data-theme={theme} data-studio-editor>
      <div className="st-shell">
        <StudioTopBar
          brand={brand}
          backTo={backTo}
          name={docName(doc)}
          onRename={handleRename}
          contentTypeLabel={contentType.label}
          pageCount={doc.pages.length}
          saveState={saveState}
          saveEnabled={saveEnabled}
          onRetrySave={retry}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={() => adapter.undo()}
          onRedo={() => adapter.redo()}
          theme={theme}
          onToggleTheme={toggleTheme}
          onExport={handleExport}
          onShare={onShare}
          readOnly={readOnly}
          moreActions={topBarActions}
        />

        {isMasterTemplate(doc) ? (
          <TemplateBanner
            onDuplicate={() => {
              // Not a guard — the owner may genuinely be here to edit
              // the master. It just has to be impossible to do so by
              // accident, which means saying which one you are in.
              toast.message(
                'Use “Duplicate” in the design’s menu to work on a copy instead.',
              );
            }}
          />
        ) : null}

        {editingMasterId ? (
          <MasterBanner
            name={
              doc.masterPages.find((m) => m.id === editingMasterId)?.name ?? 'master'
            }
            onExit={() => layerAdapter?.exitMasterMode()}
          />
        ) : null}

        <div className="st-body" data-layerless={renderer.supportsLayerEditing ? undefined : ''}>
          {/* A layerless renderer has one editing surface and it is
              always open, so every rail entry would be a control that
              does nothing. The way out is the top bar's back arrow. */}
          {renderer.supportsLayerEditing ? (
            <StudioRail active={rail} onChange={setRail} supportsLayerEditing />
          ) : null}

          <StudioPanel
            rail={rail}
            onClose={() => setRail(null)}
            adapter={layerAdapter}
            documentAdapter={adapter}
            renderer={renderer}
            initialDocument={initialDocument}
            doc={doc}
            page={activePage}
            activePageId={activePageId}
            brand={brand}
            brandKit={brandKit}
            agent={agent}
            readOnly={readOnly}
            insert={insert}
            updateLayer={updateLayer}
            onReapplyBrand={handleReapplyBrand}
            initialPrompt={initialPrompt}
            initialAi={initialAi}
            getAiContext={(): AICommandContext => ({
              activePageId,
              selection: useStudioStore.getState().selection,
              brand: brand as Brand,
            })}
            onAiApply={(result: AICommandResult) => {
              if (layerAdapter) applyAICommandResult(layerAdapter, result);
            }}
          />

          <div className="st-canvas-col">
            <StudioContextBar
              adapter={layerAdapter}
              page={activePage}
              brandKit={brandKit}
              readOnly={readOnly}
              updateLayer={updateLayer}
              onOpenLayers={() => setRail('layers')}
            />
            <StudioCanvas
              regionRef={viewport.regionRef}
              renderer={renderer}
              adapter={adapter}
              initialDocument={initialDocument}
              toDocument={viewport.toDocument}
              readOnly={readOnly}
              onDropPayload={(payload, at) => {
                try {
                  insert(JSON.parse(payload) as InsertRequest, at);
                } catch {
                  /* a drag from elsewhere — ignore rather than crash */
                }
              }}
              onDropFiles={(files, at) => {
                const image = files.find((f) => f.type.startsWith('image/'));
                if (!image) {
                  toast.error('Only images can be dropped on the canvas.');
                  return;
                }
                const reader = new FileReader();
                reader.onload = () =>
                  insert({ kind: 'image', src: String(reader.result) }, at);
                reader.readAsDataURL(image);
              }}
              overlay={
                isEmpty && !readOnly ? (
                  <StudioEmptyState
                    onInsert={insert}
                    onOpenRail={setRail}
                    hasBrand={!!brandKit}
                  />
                ) : null
              }
            />
          </div>
        </div>

        <StudioBottomBar
          pages={pages}
          activePageId={activePageId}
          multiPage={contentType.pageModel === 'multi'}
          readOnly={readOnly}
          onSelectPage={(id) => adapter.setActivePage(id)}
          onAddPage={addPage}
          onDuplicatePage={duplicatePage}
          onDeletePage={deletePage}
          zoom={zoom}
          onZoomIn={viewport.zoomIn}
          onZoomOut={viewport.zoomOut}
          onFit={viewport.fit}
          onZoomTo={viewport.zoomTo}
        />
      </div>

      <StudioShortcutSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

export function docName(doc: BrandOSDocument): string {
  const raw = doc.metadata?.name;
  return typeof raw === 'string' && raw.trim() ? raw : 'Untitled design';
}

/**
 * This document IS a master template.
 *
 * The editor autosaves whatever it loaded with no `isTemplate` branch,
 * so typing here rewrites the master for every design made from it.
 * That is correct when you arrived via "Edit template" and alarming
 * when you arrived from a bookmark, the back button or a shared link —
 * so the editor says which one you are in.
 */
function TemplateBanner({ onDuplicate }: { onDuplicate: () => void }) {
  return (
    <div
      data-studio-template-banner
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '5px 14px',
        fontSize: 11.5,
        background: 'var(--ds-warning-bg)',
        color: 'var(--ds-warning-fg)',
        borderBottom: '1px solid var(--ds-warning-border)',
      }}
    >
      <span>
        This is a master template — edits here change every design made from
        it.
      </span>
      <button type="button" className="st-icon-btn st-icon-btn--label" onClick={onDuplicate}>
        Work on a copy instead
      </button>
    </div>
  );
}

function MasterBanner({ name, onExit }: { name: string; onExit: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 14px',
        fontSize: 11.5,
        background: 'var(--ds-warning-bg)',
        color: 'var(--ds-warning-fg)',
        borderBottom: '1px solid var(--ds-warning-border)',
      }}
    >
      <span>Editing master · {name}</span>
      <button type="button" className="st-icon-btn st-icon-btn--label" onClick={onExit}>
        Exit master
      </button>
    </div>
  );
}
