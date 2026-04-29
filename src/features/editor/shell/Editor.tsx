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
import { EditorTopBar } from './v2/EditorTopBar';
import { EditorAppRail, type RailItem } from './v2/EditorAppRail';
import { EditorSecondaryPanel } from './v2/EditorSecondaryPanel';
import {
  EditorFloatingToolbar,
  type ToolbarScope,
} from './v2/EditorFloatingToolbar';
import { EditorPageNavigator } from './v2/EditorPageNavigator';
import { EditorPageNavigatorCollapsed } from './v2/EditorPageNavigatorCollapsed';
import { EditorLockBadge } from './v2/EditorLockBadge';
import { EditorZoomControls } from './v2/EditorZoomControls';
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
   * When false, the editor skips auto-save entirely and surfaces a
   * "Dev — saves disabled" badge instead of the save indicator.
   * Used by /_dev/editor where we don't want stale localStorage
   * state across sessions (and don't want quota errors masquerading
   * as application failures). Defaults to true.
   */
  saveEnabled?: boolean;
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
  saveEnabled = true,
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

  // App Rail / Secondary Panel state.
  const [activeRail, setActiveRail] = useState<RailItem>('insert');
  const [secondaryOpen, setSecondaryOpen] = useState(true);
  const [navigatorOpen, setNavigatorOpen] = useState(true);

  // Floating toolbar scope (per-page vs whole-doc). Cross-page
  // mutation lands in Phase 3 step 6 — for 5a the toggle is
  // visible and stateful but doesn't yet fan out.
  const [scope, setScope] = useState<ToolbarScope>('page');

  // Step 5/7 fix 6 — viewport zoom. CSS `transform: scale()` on a
  // wrapper around the canvas keeps Fabric's coords intact while
  // fitting the page to the available canvas region. The container
  // ref lets us measure when computing fit-to-screen.
  const canvasRegionRef = useRef<HTMLElement | null>(null);
  const [zoom, setZoom] = useState(1);

  const fitToContainer = useCallback(() => {
    const region = canvasRegionRef.current;
    if (!region || !doc.pages[0]) return;
    const active = doc.pages.find((p) => p.id === activePageId) ?? doc.pages[0];
    // Subtract padding so the canvas doesn't kiss the toolbar / zoom
    // controls / page navigator. Same numbers used in the layout.
    // Padding that the canvas region carries: zoom controls
    // (~80px reserve), top breathing room, plus a touch on the
    // sides. The Secondary Panel + App Rail + Page Navigator are
    // siblings in the parent flex row — they don't count against
    // this region's available width.
    const margin = { x: 96, y: 96 };
    const availW = Math.max(100, region.clientWidth - margin.x);
    const availH = Math.max(100, region.clientHeight - margin.y);
    const next = Math.min(availW / active.width, availH / active.height, 1);
    setZoom(Number.isFinite(next) && next > 0 ? next : 1);
  }, [doc, activePageId]);

  // Zoom helpers shared between the keyboard shortcuts, the on-canvas
  // wheel-zoom (Cmd/Ctrl + wheel), and the floating EditorZoomControls.
  const zoomIn = useCallback(
    () => setZoom((z) => Math.min(z + 0.1, 4)),
    [],
  );
  const zoomOut = useCallback(
    () => setZoom((z) => Math.max(z - 0.1, 0.1)),
    [],
  );

  // Recompute fit on first mount + on page-dimension change. Resize
  // is wired separately so window-resize doesn't invalidate the
  // user's manual zoom — only Fit is automatic.
  useEffect(() => {
    fitToContainer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId]);

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
    enabled: saveEnabled,
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
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onZoomFit: fitToContainer,
  });

  // Cmd/Ctrl + wheel = pinch-style canvas zoom (Figma / Sketch
  // pattern). We listen on window because passive: false has to be
  // set explicitly — which `onWheel` JSX props can't do — and we
  // want to swallow the browser's page-zoom even when the wheel
  // event fires outside the canvas region (e.g. on the page nav).
  // Only zoom when the cursor is over the editor body so scroll
  // events on inputs / the secondary panel still work normally.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const region = canvasRegionRef.current;
      if (!region) return;
      const rect = region.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return;
      }
      e.preventDefault();
      // deltaY > 0 = wheel down = zoom out (matches macOS / Figma).
      // Step by 4% per tick so trackpad pinches feel natural.
      const factor = e.deltaY > 0 ? 0.96 : 1.04;
      setZoom((z) => Math.min(4, Math.max(0.1, z * factor)));
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

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
          saveState={saveState}
          onRetrySave={retry}
          saveEnabled={saveEnabled}
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

        {/* Round 3 layout — rail + panel + canvas + page nav are
            ABSOLUTE siblings of the body container. The rail anchors
            to left: 0 and never shifts; the panel slides in/out via
            translateX so its open/close transition is GPU-friendly
            and the rail icons stay rooted in place. The canvas's
            left offset animates between rail-only and rail+panel. */}
        <div
          className="relative"
          style={{
            height: 'calc(100vh - 68px)',
            // CSS vars centralize the animated dimensions so the
            // canvas's left offset stays in sync with the panel's
            // visual width during the open/close transition.
            ['--rail-w' as string]: '64px',
            ['--panel-w' as string]: '300px',
            ['--pagenav-w' as string]: '176px',
          }}
        >
          {/* Rail — anchored to the left edge. Always rendered. */}
          <div
            data-editor-rail-slot
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 'var(--rail-w)',
              zIndex: 10,
            }}
          >
            <EditorAppRail
              active={activeRail}
              onChange={(item) => {
                setActiveRail(item);
                setSecondaryOpen(true);
              }}
            />
          </div>

          {/* Panel — slides in/out via translateX from BEHIND the
              rail. Stays mounted (with pointer-events off when
              closed) so the transition runs smoothly. */}
          <div
            data-editor-panel-slot
            data-panel-open={secondaryOpen ? 'true' : 'false'}
            aria-hidden={!secondaryOpen}
            style={{
              position: 'absolute',
              left: 'var(--rail-w)',
              top: 0,
              bottom: 0,
              width: 'var(--panel-w)',
              zIndex: 5,
              // Closed state: translate left by the panel's own width
              // so the panel's right edge ends at the rail's left
              // edge — i.e. it tucks BEHIND the rail (rail z-index
              // is higher). When opening, the panel slides right
              // and emerges from the rail's right side. Per spec:
              // "panel should appear to slide OUT from behind the
              // rail icons, not push them".
              transform: secondaryOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 200ms ease-out',
              willChange: 'transform',
              pointerEvents: secondaryOpen ? 'auto' : 'none',
            }}
          >
            <EditorSecondaryPanel
              active={activeRail}
              adapter={adapter}
              doc={doc}
              activePageId={activePageId}
              brand={brand}
              onCollapse={() => setSecondaryOpen(false)}
            />
          </div>

          {/* Canvas region — spans the FULL editor body so the
              design extends behind the rail / secondary panel /
              page navigator. The bars float on top with their own
              backgrounds; the canvas underneath is just centered
              in the window. (Earlier this region was insetted to
              live BETWEEN the bars, which left the design cropped
              into a thin strip whenever the panels were open.) */}
          <main
            ref={canvasRegionRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: 'var(--background)',
              overflow: 'hidden',
            }}
            data-editor-canvas-region
          >
            {/* Canvas surface — the inner wrapper applies the
                user's zoom via CSS scale, which keeps Fabric's
                internal coords intact. The floating toolbar +
                lock badge USED to live inside this wrapper but
                shrank along with the canvas at low zoom; they're
                now lifted out into a screen-space overlay sibling. */}
            <div
              className="relative"
              data-editor-canvas-zoom-wrap
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            >
              <div
                className="overflow-hidden rounded-xl"
                data-editor-canvas-surface
                style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}
              >
                <EditorCanvasMount
                  adapter={adapter}
                  initialDocument={initialDocument}
                />
              </div>
            </div>

            {/* Screen-space overlay for selection chrome (floating
                toolbar, lock badge). Sized to match the VISUAL
                canvas (page dims × zoom) and centered on the same
                slot as the zoom-wrap, so document-space coords
                multiplied by zoom land at the right pixel — but
                the chrome itself stays at screen pixel size. */}
            {selectedLayer && page ? (
              <div
                data-editor-canvas-overlay
                className="pointer-events-none absolute"
                style={{
                  width: page.width * zoom,
                  height: page.height * zoom,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 20,
                }}
              >
                <div className="pointer-events-auto">
                  <EditorFloatingToolbar
                    adapter={adapter}
                    pageId={page.id}
                    layer={selectedLayer}
                    scope={scope}
                    onScopeChange={setScope}
                    onUpdateLayer={handleLayerUpdate}
                    zoom={zoom}
                  />
                  <EditorLockBadge layer={selectedLayer} zoom={zoom} />
                </div>
              </div>
            ) : null}
          </main>

          {/* Zoom controls — Round 3 fix 5: lifted OUT of the
              canvas region so they're anchored to the editor body's
              bottom-right and don't translate with canvas content. */}
          <EditorZoomControls
            zoom={zoom}
            onFit={fitToContainer}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onZoomReset={() => setZoom(1)}
          />

          {/* Page navigator — anchored to the right edge of the
              body wrapper. Open state renders the full strip; closed
              state renders the thin collapsed strip with a chevron
              + rotated PAGES · N label. */}
          {contentType.pageModel === 'multi' ? (
            <div
              data-page-nav-slot
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                width: navigatorOpen ? 'var(--pagenav-w)' : 36,
                transition: 'width 200ms ease-out',
                zIndex: 8,
              }}
            >
              {navigatorOpen ? (
                <EditorPageNavigator
                  adapter={adapter}
                  doc={doc}
                  activePageId={activePageId}
                  editingMasterId={editingMasterId}
                  contentType={contentType}
                  onCollapse={() => setNavigatorOpen(false)}
                />
              ) : (
                <EditorPageNavigatorCollapsed
                  pageCount={doc.pages.length}
                  onExpand={() => setNavigatorOpen(true)}
                />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
