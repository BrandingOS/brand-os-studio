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
import { EditorAiPromptBar } from './v2/EditorAiPromptBar';
import { EditorSaveAsTemplateButton } from './v2/EditorSaveAsTemplateButton';
import { EditorGenerateVariantsButton } from './v2/EditorGenerateVariantsButton';
import { EditorExportFamilyButton } from './v2/EditorExportFamilyButton';
import { EditorRepublishFamilyButton } from './v2/EditorRepublishFamilyButton';
import { useAiAgent } from '@/features/editor/ai/useAiAgent';
import { applyAICommandResult } from '@/features/editor/ai/applyResult';
import type {
  AIAgent,
  AICommandContext,
  AICommandResult,
} from '@/features/editor/ai/types';
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
import { EditorPresenceAvatars } from './v2/EditorPresenceAvatars';
import { EditorWelcomeTip } from './v2/EditorWelcomeTip';
import { useDesignCursors } from '@/features/editor/collab/useDesignCursors';
import { EditorCursorOverlay } from '@/features/editor/collab/EditorCursorOverlay';
import { CommentsPanel } from '@/features/comments/CommentsPanel';
import '@/shared/styles/workspace.css';

// Layout constants — kept in sync with the CSS vars defined on the
// editor body wrapper (--rail-w, --panel-w, --pagenav-w). Used by
// fit-to-container and by the canvas region's padding so the
// design centers in the VISIBLE area (between bars), not in the
// full window. The bars float on top with their own backgrounds;
// the canvas is full-window underneath, but its centering origin
// is shifted via padding so opening a panel re-centers smoothly.
const RAIL_W = 64;
const PANEL_W = 300;
const PAGENAV_W = 176;
const PAGENAV_COLLAPSED_W = 36;
const REGION_BREATHING = 16;

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
  /**
   * Phase 3.5 — AI agent override. Production omits this (the editor
   * builds an Edge Function-backed agent from the active BrandKit);
   * tests + dev harnesses can pass a stub agent that returns
   * deterministic AICommandResults without hitting any network.
   * Falls back to a no-op when brandKit isn't available (no brand).
   */
  aiAgent?: AIAgent;
  /**
   * Phase 4.5 — fired when the user clicks the topbar Share button.
   * The route owner builds the canonical URL + copies to clipboard.
   * Optional — when omitted, the Share button is hidden.
   */
  onShare?: () => void;
}

export function Editor({
  initialDocument,
  save,
  saveEnabled = true,
  brand,
  onAdapterReady,
  onBrandSwitch,
  aiAgent,
  onShare,
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

  // Theme — driven via [data-workspace][data-theme] on the wrapper.
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // App Rail / Secondary Panel state.
  const [activeRail, setActiveRail] = useState<RailItem>('insert');
  const [secondaryOpen, setSecondaryOpen] = useState(true);
  const [navigatorOpen, setNavigatorOpen] = useState(true);

  // Floating toolbar scope (per-page vs whole-doc). Cross-page
  // mutation lands in Phase 3 step 6 — for 5a the toggle is
  // visible and stateful but doesn't yet fan out.
  const [scope, setScope] = useState<ToolbarScope>('page');

  // Resolve the content-type config FIRST — fitToContainer below
  // reads contentType.pageModel from its dep array, so it has to be
  // initialized by the time the useCallback factory runs. Unknown
  // ids fall back to a single-page social-post; the registry throws
  // on truly unknown ids, so this fallback only fires when a doc
  // was created against a type that's been removed from the
  // registry since.
  const contentType = useMemo<ContentTypeConfig>(() => {
    try {
      return getContentTypeConfig(doc.contentType);
    } catch {
      return getContentTypeConfig('social-post');
    }
  }, [doc.contentType]);

  // Step 5/7 fix 6 — viewport zoom. CSS `transform: scale()` on a
  // wrapper around the canvas keeps Fabric's coords intact while
  // fitting the page to the available canvas region. The container
  // ref lets us measure when computing fit-to-screen.
  const canvasRegionRef = useRef<HTMLElement | null>(null);
  const canvasSurfaceRef = useRef<HTMLDivElement | null>(null);
  const [pageRect, setPageRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  // 'animated' = brief 140ms ease on each transform change (good
  // for discrete keyboard / button taps). 'instant' = no
  // transition (mandatory for the continuous wheel zoom — without
  // it each tick restarts the previous transition mid-flight and
  // visibly stair-steps). Mode flips on the kind of input.
  const [zoomMode, setZoomMode] = useState<'animated' | 'instant'>('animated');

  const fitToContainer = useCallback(() => {
    const region = canvasRegionRef.current;
    if (!region || !doc.pages[0]) return;
    const active = doc.pages.find((p) => p.id === activePageId) ?? doc.pages[0];
    // Subtract the bars' widths so fit lands the design in the
    // VISIBLE area (between rail/panel/page-nav), not centered
    // across the full window. Match the padding values applied
    // to <main> below — both pieces have to agree for the
    // "magnetized to the visible center" feel to hold.
    const padLeft =
      RAIL_W + (secondaryOpen ? PANEL_W : 0) + REGION_BREATHING;
    const padRight =
      (contentType.pageModel === 'multi'
        ? navigatorOpen
          ? PAGENAV_W
          : PAGENAV_COLLAPSED_W
        : 0) + REGION_BREATHING;
    const padY = REGION_BREATHING * 2;
    const availW = Math.max(100, region.clientWidth - padLeft - padRight);
    const availH = Math.max(100, region.clientHeight - padY);
    const next = Math.min(availW / active.width, availH / active.height, 1);
    setZoom(Number.isFinite(next) && next > 0 ? next : 1);
  }, [doc, activePageId, secondaryOpen, navigatorOpen, contentType.pageModel]);

  // Zoom helpers — MULTIPLICATIVE steps, so each press feels the
  // same regardless of current zoom level (going 100→125 reads the
  // same amount of "bigger" as 800→1000). Additive +0.1 felt
  // jumpy at low zoom and barely moved at high zoom.
  const ZOOM_STEP = 1.15;
  const zoomIn = useCallback(() => {
    setZoomMode('animated');
    setZoom((z) => Math.min(z * ZOOM_STEP, 4));
  }, []);
  const zoomOut = useCallback(() => {
    setZoomMode('animated');
    setZoom((z) => Math.max(z / ZOOM_STEP, 0.05));
  }, []);
  const zoomReset = useCallback(() => {
    setZoomMode('animated');
    setZoom(1);
  }, []);

  // Recompute fit on first mount + on page-dimension change. Resize
  // is wired separately so window-resize doesn't invalidate the
  // user's manual zoom — only Fit is automatic.
  useEffect(() => {
    fitToContainer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId]);

  // BrandKit — derived from the brand prop. Memoized so the same
  // reference flows through to applyBrandToDocument unless the brand
  // identity (or its updatedAt) changes.
  const brandKit = useBrandKit(brand);

  // Lazy-create the adapter once; pass to <EditorCanvasMount> for mount.
  const adapter = useMemo<EditorAdapter>(() => new FabricAdapter(), []);

  // Phase 3.5 — AI agent. The `useAiAgent` hook picks DI override
  // first (test stub), then falls back to a production
  // EdgeFunctionAgent built from the brandKit. The `aiAgent` prop
  // remains as a final override for direct callers (E2E tests that
  // bypass DI).
  const sharedAgent = useAiAgent(brandKit);
  const effectiveAgent = aiAgent ?? sharedAgent;

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
  // pattern). Two anti-glitch tactics:
  //   1) rAF-coalesce: trackpads fire wheel events much faster
  //      than the screen refreshes. Accumulate deltaY into a ref
  //      and apply ONE setZoom per animation frame, so React
  //      doesn't re-render N times per frame.
  //   2) Force `zoomMode = 'instant'` so the 140ms transition on
  //      the zoom-wrap doesn't fight each new wheel tick (which
  //      was the visible stair-stepping the user reported).
  // Listener is on window with passive: false so we can
  // preventDefault the browser's page-zoom; cursor-in-region
  // gate keeps wheel events on inputs / panels working normally.
  const wheelDeltaRef = useRef(0);
  const wheelRafRef = useRef<number | null>(null);
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
      wheelDeltaRef.current += e.deltaY;
      if (wheelRafRef.current !== null) return;
      wheelRafRef.current = requestAnimationFrame(() => {
        wheelRafRef.current = null;
        const dy = wheelDeltaRef.current;
        wheelDeltaRef.current = 0;
        // exp(-dy * k) keeps the step proportional to wheel
        // velocity AND multiplicative (so a pinch feels even
        // across zoom levels). k tuned so a typical trackpad
        // tick lands at ~3-5%.
        const factor = Math.exp(-dy * 0.0025);
        setZoomMode('instant');
        setZoom((z) => Math.min(4, Math.max(0.05, z * factor)));
      });
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      if (wheelRafRef.current !== null) {
        cancelAnimationFrame(wheelRafRef.current);
        wheelRafRef.current = null;
      }
    };
  }, []);

  // Phase 7.3 — Multiplayer cursors. Subscribe to the design's cursor
  // channel; broadcast local mouse on the canvas surface in page-
  // relative coords so peers at different zoom/pan levels still see
  // each other accurately. Hook is no-op when unauthenticated.
  const { others: cursorPeers, sendCursor } = useDesignCursors(
    brand?.id ?? null,
    doc.id,
  );

  // Track local cursor on the canvas surface and broadcast.
  useEffect(() => {
    const surface = canvasSurfaceRef.current;
    if (!surface) return;
    const onMove = (e: MouseEvent) => {
      const rect = surface.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      sendCursor(activePageId, x, y);
    };
    surface.addEventListener('mousemove', onMove);
    return () => surface.removeEventListener('mousemove', onMove);
  }, [sendCursor, activePageId]);

  // Keep pageRect in sync with the canvas surface so the cursor
  // overlay positions peer pointers in screen coords. Re-measure on
  // zoom + window resize so cursors stay aligned during interaction.
  useEffect(() => {
    const surface = canvasSurfaceRef.current;
    if (!surface) return;
    const measure = () => {
      const r = surface.getBoundingClientRect();
      setPageRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [zoom, secondaryOpen, navigatorOpen]);

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
    <div data-workspace data-theme={theme}>
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
          onShare={onShare}
          saveAsTemplateSlot={
            brandKit ? (
              <EditorSaveAsTemplateButton
                getDoc={() => adapter.getDocument()}
                brandKit={brandKit}
              />
            ) : undefined
          }
          generateVariantsSlot={
            brand ? (
              <EditorGenerateVariantsButton
                getDoc={() => adapter.getDocument()}
                brandId={brand.id}
                brandSlug={brand.slug}
                sourceName={doc.metadata?.name as string | undefined}
              />
            ) : undefined
          }
          exportFamilySlot={
            brand && doc.familyId ? (
              <EditorExportFamilyButton
                getDoc={() => adapter.getDocument()}
                brandId={brand.id}
                sourceName={doc.metadata?.name as string | undefined}
              />
            ) : undefined
          }
          presenceSlot={
            brand ? (
              <EditorPresenceAvatars
                brandId={brand.id}
                designId={doc.id}
              />
            ) : undefined
          }
          republishFamilySlot={
            brand && doc.familyId && !doc.sourceDesignId ? (
              <EditorRepublishFamilyButton
                getDoc={() => adapter.getDocument()}
                brandId={brand.id}
                sourceName={doc.metadata?.name as string | undefined}
              />
            ) : undefined
          }
          aiPromptSlot={
            effectiveAgent && brand ? (
              <EditorAiPromptBar
                agent={effectiveAgent}
                getDoc={() => adapter.getDocument()}
                getContext={(): AICommandContext => ({
                  activePageId,
                  selection: selection.layerIds,
                  brand,
                })}
                onApply={(result: AICommandResult) => {
                  // Phase 3.5 commit 6 — Mode 2/3/4 dispatcher.
                  // Mode 5 (validateAICommandResult) has already
                  // run inside applyCommand; we hand the validated
                  // result to applyAICommandResult which wraps
                  // every op in adapter.batch(label, fn) so the
                  // entire AI mutation lands as a single labeled
                  // undo entry. 'rejected' is a no-op here — the
                  // prompt bar surfaces the message inline.
                  applyAICommandResult(adapter, result);
                }}
              />
            ) : undefined
          }
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

          {/* Panel — toggle controlled by the App Rail. When closed,
              the slot is UNMOUNTED entirely (not just slid off-screen).
              The earlier slide-out variant left the panel visible
              behind the transparent rail. */}
          {secondaryOpen ? (
            <div
              data-editor-panel-slot
              data-panel-open="true"
              style={{
                position: 'absolute',
                left: 'var(--rail-w)',
                top: 0,
                bottom: 0,
                width: 'var(--panel-w)',
                zIndex: 5,
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
          ) : null}

          {/* Canvas region — spans the FULL editor body so the
              design extends behind the rail / secondary panel /
              page navigator at high zoom (the bars float on top
              with their own backgrounds and clip what shows).
              Padding shifts the flex centering origin so the
              design lands in the VISIBLE area between the bars
              by default — and "magnetizes" back to that center
              on every zoom step + on every panel open/close. */}
          <main
            ref={canvasRegionRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: 'var(--background)',
              overflow: 'hidden',
              paddingLeft:
                RAIL_W +
                (secondaryOpen ? PANEL_W : 0) +
                REGION_BREATHING,
              paddingRight:
                (contentType.pageModel === 'multi'
                  ? navigatorOpen
                    ? PAGENAV_W
                    : PAGENAV_COLLAPSED_W
                  : 0) + REGION_BREATHING,
              paddingTop: REGION_BREATHING,
              paddingBottom: REGION_BREATHING,
              transition: 'padding 200ms ease-out',
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
                // 140ms ease for discrete taps (cmd ±, fit, 100%);
                // none for continuous wheel zoom — see zoomMode
                // declaration above for the why.
                transition:
                  zoomMode === 'animated'
                    ? 'transform 140ms ease-out'
                    : 'none',
                willChange: 'transform',
              }}
            >
              <div
                ref={canvasSurfaceRef}
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
                    brand={brand}
                    pageCount={doc.pages.length}
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
            onZoomReset={zoomReset}
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

        {/* Phase 11.1 — First-visit welcome tip pointing at the
            new AI prompt + comments + presence affordances.
            Self-dismissing; only ever shows once per browser. */}
        <EditorWelcomeTip />

        {/* Phase 7.3 — Multiplayer cursor overlay. Sits at the
            top-most fixed layer; renders nothing for solo work
            (cursorPeers is empty). */}
        {brand ? (
          <EditorCursorOverlay
            others={cursorPeers}
            activePageId={activePageId}
            pageRect={pageRect}
          />
        ) : null}

        {/* Phase 7.1 — Collaboration: comments scoped to the active
            design. Floating bottom-right; trigger button hides while
            the drawer is open. Shows nothing when there's no brand
            (standalone editor mode). */}
        {brand ? (
          <CommentsPanel
            brandId={brand.id}
            pageKey={`design:${doc.id}`}
            pageLabel={(doc.metadata?.name as string | undefined) ?? 'Design'}
          />
        ) : null}
      </div>
    </div>
  );
}
