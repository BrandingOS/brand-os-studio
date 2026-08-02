/* ChronicleShell — the composed Chronicle-style editor chrome.
 *
 * Layout:
 *   ┌──────────┬─────────────────────────────────────────────┐
 *   │          │           [project pill]   [actions pill]   │
 *   │ Sidebar  │                                             │
 *   │          │              FREE CANVAS (pan + zoom)       │
 *   │          │                                             │
 *   │          │   [ Insert │ Remix │ Theme │ Bg │ ⋯ ] [%]   │
 *   └──────────┴─────────────────────────────────────────────┘
 *
 * The canvas slot is caller-provided. The shell wraps it in a
 * pan-and-zoom "world" so the user can navigate around artboards the
 * way they would in Relume / Figma / Miro:
 *   • Trackpad pinch (Ctrl/Meta + wheel) zooms toward the cursor.
 *   • Two-finger trackpad swipe pans.
 *   • Space-bar + drag pans.
 *   • Middle-mouse drag pans.
 *   • Cmd/Ctrl + 0 fits to view; Cmd/Ctrl + 1 resets to 100%.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { ActionBar } from "./ActionBar";
import { TopBar } from "./TopBar";
import {
  WorkspaceSidebar,
  type SidebarBrand,
  type SidebarSection,
} from "./WorkspaceSidebar";
import "./chronicle.css";

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;

export interface ChronicleShellProps {
  workspaceName: string;
  workspacePlan?: string;
  workspaceAvatar?: string;
  brandSections: SidebarSection[];
  activeSectionId: string;
  onSectionClick: (id: string) => void;
  currentBrandName?: string;
  otherBrands: SidebarBrand[];
  onBrandClick: (b: SidebarBrand) => void;
  onNewDesign: () => void;

  projectName: string;
  topAvatar?: ReactNode;
  onShare?: () => void;
  onExport?: () => void;
  onPresent?: () => void;

  insertPopover?: ReactNode;
  remixPopover?: ReactNode;
  themePopover?: ReactNode;
  backgroundPopover?: ReactNode;

  children: ReactNode;
  initialMode?: "light" | "dark";
}

export function ChronicleShell({
  workspaceName,
  workspacePlan,
  workspaceAvatar,
  brandSections,
  activeSectionId,
  onSectionClick,
  currentBrandName,
  otherBrands,
  onBrandClick,
  onNewDesign,
  projectName,
  topAvatar,
  onShare,
  onExport,
  onPresent,
  insertPopover,
  remixPopover,
  themePopover,
  backgroundPopover,
  children,
  initialMode = "dark",
}: ChronicleShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mode, setMode] = useState<"light" | "dark">(initialMode);

  useEffect(() => {
    const stored = window.localStorage.getItem("chronicle:mode");
    if (stored === "light" || stored === "dark") setMode(stored);
  }, []);
  useEffect(() => {
    window.localStorage.setItem("chronicle:mode", mode);
  }, [mode]);

  // Tag the document body so portaled chrome (notably the shared
  // FloatingToolbar from the case-study editor) picks up the Chronicle
  // surface + text tokens. Cleared on unmount so navigating off this
  // page restores the toolbar's default dark look on case-study pages.
  useEffect(() => {
    document.body.setAttribute("data-chronicle-active", "true");
    document.body.setAttribute("data-chronicle-mode", mode);
    return () => {
      document.body.removeAttribute("data-chronicle-active");
      document.body.removeAttribute("data-chronicle-mode");
    };
  }, [mode]);

  /* ─── Pan + Zoom ─────────────────────────────────────────────────────── */

  const stageRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const spaceHeldRef = useRef(false);
  const dragOriginRef = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);
  /* Last known cursor position over the stage (stage-relative coords).
   * Used as the zoom origin for the +/- buttons and ⌘+/⌘- shortcuts so
   * those zoom toward wherever the user was looking — same UX as Figma
   * / Relume / Miro — instead of always toward the geometric center. */
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

  // Track Space key globally so the user can grab-pan from anywhere over
  // the canvas. We swallow the keydown's default to keep the page from
  // scrolling.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTypingTarget(e.target)) {
        spaceHeldRef.current = true;
        document.body.style.cursor = "grab";
        e.preventDefault();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        fitToView();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "1") {
        e.preventDefault();
        animateTo({ zoom: 1, pan: { x: 0, y: 0 } });
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        stepZoom(1.2);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        stepZoom(1 / 1.2);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeldRef.current = false;
        document.body.style.cursor = "";
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      document.body.style.cursor = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wheel handler. Browsers fire `wheel` with `ctrlKey: true` for
  // trackpad pinch gestures — that's the canonical way to detect a
  // pinch on macOS / Windows. Cmd+scroll on a mouse also lands here.
  // Plain two-finger swipe → pan.
  //
  // Mounted via a non-passive native listener (not React's synthetic)
  // because we MUST call preventDefault to stop the browser's default
  // zoom (cmd+wheel → page zoom) and scroll. React adds wheel handlers
  // as passive by default — which makes preventDefault a no-op.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Pinch zoom toward the cursor.
        const rect = stage.getBoundingClientRect();
        const factor = Math.exp(-e.deltaY * 0.01);
        zoomToward(e.clientX - rect.left, e.clientY - rect.top, factor);
      } else {
        // Two-finger pan.
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomToward = useCallback(
    (mx: number, my: number, factor: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      // The world is centered in the stage by flex (transform-origin
      // is 50% 50% of the world). So the stage center is the visual
      // origin for the world's translate, and we measure cursor
      // position relative to that center — not the stage's top-left.
      // Without this offset, the +/- buttons appear to zoom toward
      // a fixed point because mx,my grow linearly from the wrong
      // origin.
      const dx = mx - rect.width / 2;
      const dy = my - rect.height / 2;
      setZoom((z) => {
        const next = clamp(z * factor, MIN_ZOOM, MAX_ZOOM);
        const dz = next / z;
        if (dz === 1) return z;
        setPan((p) => ({
          x: dx * (1 - dz) + p.x * dz,
          y: dy * (1 - dz) + p.y * dz,
        }));
        return next;
      });
    },
    [],
  );

  const stepZoom = useCallback(
    (factor: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const m = mouseRef.current;
      // If the cursor was last seen over the stage, zoom toward that
      // point. Otherwise fall back to the stage center (e.g. first
      // load before the user has moved).
      if (m && m.x >= 0 && m.x <= rect.width && m.y >= 0 && m.y <= rect.height) {
        zoomToward(m.x, m.y, factor);
      } else {
        zoomToward(rect.width / 2, rect.height / 2, factor);
      }
    },
    [zoomToward],
  );

  const animateTo = useCallback(
    (target: { zoom: number; pan: { x: number; y: number } }) => {
      const world = worldRef.current;
      if (world) world.setAttribute("data-animating", "true");
      setZoom(target.zoom);
      setPan(target.pan);
      window.setTimeout(() => {
        if (world) world.removeAttribute("data-animating");
      }, 260);
    },
    [],
  );

  const fitToView = useCallback(() => {
    const stage = stageRef.current;
    const world = worldRef.current;
    if (!stage || !world) return;
    // Measure the world's unscaled content rect.
    const sr = stage.getBoundingClientRect();
    // The world includes its 80px padding. Use the inner content size if
    // we can — fall back to the world itself.
    const inner = world.firstElementChild as HTMLElement | null;
    const targetW = (inner?.offsetWidth ?? world.offsetWidth) || 1;
    const targetH = (inner?.offsetHeight ?? world.offsetHeight) || 1;
    const margin = 80;
    const scale = clamp(
      Math.min(
        (sr.width - margin * 2) / targetW,
        (sr.height - margin * 2) / targetH,
      ),
      MIN_ZOOM,
      MAX_ZOOM,
    );
    animateTo({ zoom: scale, pan: { x: 0, y: 0 } });
  }, [animateTo]);

  // Center the world on first mount (no animation).
  useLayoutEffect(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  /* ─── Drag-to-pan (space-bar or middle-mouse) ───────────────────────── */

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const isMiddle = e.button === 1;
    const isSpaceDrag = e.button === 0 && spaceHeldRef.current;
    if (!isMiddle && !isSpaceDrag) return;
    e.preventDefault();
    setPanning(true);
    dragOriginRef.current = { x: e.clientX, y: e.clientY, pan };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, [pan]);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    // Track stage-relative cursor position so the +/- buttons can zoom
    // toward where the user was looking. Tracked even when not dragging.
    const stage = stageRef.current;
    if (stage) {
      const rect = stage.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    const origin = dragOriginRef.current;
    if (!origin) return;
    setPan({
      x: origin.pan.x + (e.clientX - origin.x),
      y: origin.pan.y + (e.clientY - origin.y),
    });
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragOriginRef.current = null;
    setPanning(false);
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div
      className="ch-shell"
      data-chronicle="true"
      data-mode={mode}
      data-sidebar-collapsed={collapsed ? "true" : "false"}
    >
      <WorkspaceSidebar
        workspaceName={workspaceName}
        workspacePlan={workspacePlan}
        avatar={workspaceAvatar}
        brandSections={brandSections}
        activeSectionId={activeSectionId}
        onSectionClick={onSectionClick}
        currentBrandName={currentBrandName}
        otherBrands={otherBrands}
        onBrandClick={onBrandClick}
        onNewDesign={onNewDesign}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
      />

      <div className="ch-canvas-region">
        <TopBar
          projectName={projectName}
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          mode={mode}
          onToggleMode={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
          onShare={onShare}
          onExport={onExport}
          onPresent={onPresent}
          avatar={topAvatar}
        />

        <div
          ref={stageRef}
          className="ch-canvas-stage"
          data-panning={panning ? "true" : "false"}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            ref={worldRef}
            className="ch-canvas-world"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {children}
          </div>
        </div>

        <ActionBar
          mode={mode}
          insert={insertPopover}
          remix={remixPopover}
          theme={themePopover}
          background={backgroundPopover}
        />

        <ZoomControls
          zoom={zoom}
          onZoomIn={() => stepZoom(1.2)}
          onZoomOut={() => stepZoom(1 / 1.2)}
          onFit={fitToView}
          onReset={() => animateTo({ zoom: 1, pan: { x: 0, y: 0 } })}
        />
      </div>
    </div>
  );
}

/* ─── Zoom controls (bottom-right) ───────────────────────────────────── */

function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
}) {
  const pct = Math.round(zoom * 100);
  return (
    <div className="ch-zoom-controls" role="toolbar" aria-label="Zoom">
      <button
        className="ch-zoom-btn"
        onClick={onFit}
        aria-label="Fit to view"
        title="Fit to view (⌘0)"
        type="button"
      >
        <Maximize2 size={14} />
      </button>
      <span style={{ width: 1, height: 18, background: "var(--ch-divider)" }} />
      <button
        className="ch-zoom-btn"
        onClick={onZoomOut}
        aria-label="Zoom out"
        title="Zoom out (⌘-)"
        type="button"
      >
        <Minus size={14} />
      </button>
      <button
        className="ch-zoom-percent"
        onClick={onReset}
        title="Reset to 100% (⌘1)"
        type="button"
      >
        {pct}%
      </button>
      <button
        className="ch-zoom-btn"
        onClick={onZoomIn}
        aria-label="Zoom in"
        title="Zoom in (⌘+)"
        type="button"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

/* ─── helpers ────────────────────────────────────────────────────────── */

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const t = target.tagName;
  return (
    t === "INPUT" ||
    t === "TEXTAREA" ||
    target.isContentEditable
  );
}
