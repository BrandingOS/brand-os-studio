// <Editor> — Phase 5b unified editor shell on the Variant 4 layout.
//
// Cosmos workspace shell with three regions:
//   • Top:    EditorTopBar — brand picker (5b: real IBrandsService
//             list + Re-apply brand kit action), segmented Edit/
//             Preview/Comments pill (only Edit functional), Export
//             + theme toggle.
//   • Body:   App Rail (Generate / Templates / Insert / Brand) →
//             Secondary Panel (content per active rail entry) →
//             canvas (Fabric, unchanged) → Page Navigator (only
//             when contentType.pageModel === 'multi').
//   • Floating: contextual toolbar above the selected layer (replaces
//             Phase 1's right-side Properties panel).
//
// Brand context comes from the `brand` PROP (caller-supplied), per
// the brand-context purity rule (issue #4). The editor never reaches
// for a global store. Brand switching is fully wired in Phase 4.5
// via the canonical /b/:brandSlug/design/:designSlug route — for
// 5b the parent component handles `onBrandSwitch`. The dev harness
// reloads a fixture; route handlers will navigate.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FabricAdapter } from '@/features/editor/adapter/FabricAdapter';
import type {
  EditorAdapter,
  SelectionState,
} from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument } from '@/features/editor/schema';
import { useAutoSave } from '@/features/editor/core';
import { useEditorKeyboardShortcuts } from '@/features/editor/hooks/useEditorKeyboardShortcuts';
import { EditorCanvasMount } from './EditorCanvasMount';
import {
  getContentTypeConfig,
  type ContentTypeConfig,
} from '@/features/editor/content-types';
import type { Brand } from '@/shared/types/brand';
import { applyBrandToDocument } from '@/features/editor/brand/applyBrandToDocument';
import { useBrandKit } from '@/features/editor/brand/useBrandKit';
import { triggerCrossPagePromptIfApplicable } from '@/features/editor/brand/crossPagePropagation';
import { EditorTopBar, type EditorMode } from './v2/EditorTopBar';
import { EditorAppRail, type RailItem } from './v2/EditorAppRail';
import { EditorSecondaryPanel } from './v2/EditorSecondaryPanel';
import {
  EditorFloatingToolbar,
  type ToolbarScope,
} from './v2/EditorFloatingToolbar';
import { EditorPageNavigator } from './v2/EditorPageNavigator';
import { EditorLockBadge } from './v2/EditorLockBadge';
import { ChevronRight } from 'lucide-react';
import '@/shared/styles/cosmos-workspace.css';

interface EditorProps {
  /** Initial document to load. */
  initialDocument: BrandOSDocument;
  /**
   * Persistence target. Receives the latest document on every save.
   * Phase 1 demo uses localStorage; Phase 4 wires templates / Supabase.
   */
  save: (doc: BrandOSDocument) => Promise<void>;
  /**
   * Brand context. Optional in 5a — when undefined, the brand picker
   * shows a placeholder and the Brand panel collapses to a single
   * "no brand attached" message. 5b makes the picker functional;
   * Phase 4.5 wires real route resolution.
   */
  brand?: Brand;
  /**
   * Optional hook fired once the adapter is constructed. Used by browser
   * E2E tests to assert canvas state through the adapter API. Production
   * call sites omit this.
   */
  onAdapterReady?: (adapter: EditorAdapter) => void;
  /**
   * Fired when the user picks a different brand from the top-bar
   * dropdown.
   *
   * Brand switching is fully wired in Phase 4.5 (canonical
   * `/b/:brandSlug/design/:designSlug` route). The parent component
   * is responsible for handling brand changes via this callback —
   * route handlers will navigate to the brand-scoped URL; the dev
   * harness reloads a fixture for visual verification.
   */
  onBrandSwitch?: (brandSlug: string) => void;
}

export function Editor({
  initialDocument,
  save,
  brand,
  onAdapterReady,
  onBrandSwitch,
}: EditorProps) {
  const adapterRef = useRef<EditorAdapter | null>(null);
  const [doc, setDoc] = useState<BrandOSDocument>(initialDocument);
  const [selection, setSelection] = useState<SelectionState>({
    layerIds: [],
    pageId: initialDocument.pages[0]?.id ?? '',
  });
  const [activePageId, setActivePageId] = useState<string>(
    initialDocument.pages[0]?.id ?? '',
  );
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);

  // Theme — driven via [data-cosmos][data-theme] on the wrapper.
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mode, setMode] = useState<EditorMode>('edit');

  // App Rail / Secondary Panel state.
  const [activeRail, setActiveRail] = useState<RailItem>('insert');
  const [secondaryOpen, setSecondaryOpen] = useState(true);
  const [navigatorOpen, setNavigatorOpen] = useState(true);

  // Floating toolbar scope (per-page vs whole-doc). Cross-page
  // mutation lands in Phase 3 step 6 — for 5a the toggle is
  // visible and stateful but doesn't yet fan out.
  const [scope, setScope] = useState<ToolbarScope>('page');

  // Resolve the content-type config. Unknown ids fall back to a
  // single-page social-post — the registry throws on truly unknown
  // ids, so this fallback only fires when a doc was created against a
  // type that's been removed from the registry since.
  const contentType = useMemo<ContentTypeConfig>(() => {
    try {
      return getContentTypeConfig(doc.contentType);
    } catch {
      return getContentTypeConfig('social-post');
    }
  }, [doc.contentType]);

  // BrandKit — derived from the brand prop. Memoized so the same
  // reference flows through to applyBrandToDocument unless the brand
  // identity (or its updatedAt) changes.
  const brandKit = useBrandKit(brand);

  // Lazy-create the adapter once; pass to <EditorCanvasMount> for mount.
  const adapter = useMemo<EditorAdapter>(() => new FabricAdapter(), []);

  // ─── Re-apply brand kit ───────────────────────────────────────────────
  //
  // Resolves every SlotRef in the current document against the
  // current brand kit. With `respectLocks: true` (default), brand-
  // locked layers' overridden properties get restored from the
  // schema's `_lockedBindings` field before resolution runs — the
  // brand-managed contract wins. The whole operation is wrapped in
  // adapter.batch so it counts as a SINGLE undo step + emits ONE
  // change event regardless of how many layers it touches.
  // Wraps adapter.updateLayer so every user-driven property edit on
  // a layer also fires the cross-page consistency prompt (Step 6).
  // Reads the pre-edit layer snapshot first so the trigger has a
  // reference SlotRef even after the patch lands.
  //
  // Recursion is avoided structurally: the trigger's "All N pages"
  // / "Similar this page" actions go through
  // adapter.applyLayerPatchAcrossPages — those bulk mutations don't
  // funnel back through this wrapper, so propagation can't loop.
  const handleLayerUpdate = useCallback(
    (targetPageId: string, layerId: string, patch: Partial<BrandOSDocument['pages'][number]['layers'][number]>) => {
      const docNow = adapter.getDocument();
      const targetPage = docNow.pages.find((p) => p.id === targetPageId);
      const prevLayer = targetPage?.layers.find((l) => l.id === layerId);
      adapter.updateLayer(targetPageId, layerId, patch);
      if (prevLayer) {
        triggerCrossPagePromptIfApplicable(
          adapter,
          targetPageId,
          prevLayer,
          patch,
        );
      }
    },
    [adapter],
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
      // replaceDocument (NOT loadDocument) so the existing history is
      // preserved — undo reverts the entire re-apply in one step.
      adapter.batch('Re-apply brand kit', () => {
        void adapter.replaceDocument(next);
      });
      toast.success('Brand kit re-applied');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to re-apply brand kit';
      toast.error(message, {
        action: {
          label: 'Retry',
          onClick: () => handleReapplyBrand(),
        },
      });
    }
  }, [adapter, brandKit]);

  // Subscribe to adapter events. Document state mirrors via setDoc;
  // selection mirrors via setSelection. The active-page + master-mode
  // markers also refresh on every change so the navigator stays in sync.
  useEffect(() => {
    adapterRef.current = adapter;
    onAdapterReady?.(adapter);
    const offChange = adapter.on('change', (next) => {
      setDoc(next);
      try {
        setActivePageId(adapter.getActivePageId());
      } catch {
        /* no active page yet — early load */
      }
      setEditingMasterId(adapter.getEditingMasterId());
    });
    const offSelection = adapter.on('selection', (sel) => setSelection(sel));
    return () => {
      offChange();
      offSelection();
    };
  }, [adapter, onAdapterReady]);

  const { saveState, markDirty, flush, retry } = useAutoSave<BrandOSDocument>({
    value: doc,
    save,
    debounceMs: 1200,
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

  // Resolve the single-selected layer for the floating toolbar. The
  // toolbar mounts only when exactly one layer is selected — multi-
  // selection or empty selection shows nothing (matches the Variant
  // 4 behavior; per-layer controls don't make sense for groups).
  const page = doc.pages.find((p) => p.id === selection.pageId) ?? doc.pages[0];
  const selectedLayer =
    page && selection.layerIds.length === 1
      ? page.layers.find((l) => l.id === selection.layerIds[0]) ?? null
      : null;

  const showPageNavigator =
    contentType.pageModel === 'multi' && navigatorOpen;

  return (
    <div data-cosmos="workspace" data-theme={theme}>
      <div
        className="min-h-screen w-full"
        style={{
          background: 'var(--background)',
          color: 'var(--text-primary)',
        }}
      >
        <EditorTopBar
          brand={brand}
          onBrandSwitch={onBrandSwitch}
          onReapplyBrand={brandKit ? handleReapplyBrand : undefined}
          mode={mode}
          onModeChange={setMode}
          saveState={saveState}
          onRetrySave={retry}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        />

        {editingMasterId ? (
          <div
            className="flex items-center justify-between border-b px-4 py-1.5 text-[11px]"
            style={{
              background: 'var(--critical-soft)',
              borderColor: 'var(--border)',
              color: 'var(--critical)',
            }}
          >
            <span>
              Editing master ·{' '}
              {doc.masterPages.find((m) => m.id === editingMasterId)?.name ??
                'unknown'}
            </span>
            <button
              type="button"
              onClick={() => adapter.exitMasterMode()}
              className="rounded px-2 py-0.5 text-[11px] underline"
            >
              Exit master
            </button>
          </div>
        ) : null}

        <div className="flex" style={{ height: 'calc(100vh - 68px)' }}>
          <EditorAppRail
            active={activeRail}
            onChange={(item) => {
              setActiveRail(item);
              setSecondaryOpen(true);
            }}
          />

          {secondaryOpen ? (
            <EditorSecondaryPanel
              active={activeRail}
              adapter={adapter}
              doc={doc}
              activePageId={activePageId}
              brand={brand}
              onCollapse={() => setSecondaryOpen(false)}
            />
          ) : null}

          <main
            className="relative flex flex-1 items-center justify-center overflow-auto"
            style={{ background: 'var(--background)' }}
            data-editor-canvas-region
          >
            {/* Canvas surface — the floating toolbar lives in the same
                positioned region so it can overlay the canvas. */}
            <div className="relative">
              {selectedLayer ? (
                <>
                  <EditorFloatingToolbar
                    adapter={adapter}
                    pageId={page!.id}
                    layer={selectedLayer}
                    scope={scope}
                    onScopeChange={setScope}
                    onUpdateLayer={handleLayerUpdate}
                  />
                  <EditorLockBadge layer={selectedLayer} />
                </>
              ) : null}
              <div
                className="overflow-hidden rounded-xl"
                data-editor-canvas-surface
                // Step 5/7 fix 4 — was --shadow-lg (24px offset, 56px
                // blur) which cast a halo on every side and made the
                // canvas look like it was floating instead of resting
                // on the workspace. Replaced with a subtle bottom-only
                // shadow: small Y-offset, narrow blur, no spread.
                style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}
              >
                <EditorCanvasMount
                  adapter={adapter}
                  initialDocument={initialDocument}
                />
              </div>
            </div>
          </main>

          {showPageNavigator ? (
            <EditorPageNavigator
              adapter={adapter}
              doc={doc}
              activePageId={activePageId}
              editingMasterId={editingMasterId}
              contentType={contentType}
              onCollapse={() => setNavigatorOpen(false)}
            />
          ) : contentType.pageModel === 'multi' ? (
            <button
              type="button"
              onClick={() => setNavigatorOpen(true)}
              aria-label="Open pages panel"
              className="my-3 mr-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-secondary)',
                boxShadow: 'var(--shadow-md)',
                alignSelf: 'flex-start',
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
