import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as RPointerEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './NotFound.css';

/**
 * 404 — a "draw your own page" surface.
 *
 * Architecture:
 *   • <canvas>      — pen / marker / pencil / highlighter / eraser strokes.
 *   • Stamps layer  — DOM <button>s positioned absolutely, draggable in
 *     the hand tool. Stamps are state objects; moving one re-renders only
 *     that element, never the canvas. Pen/marker mode disables pointer
 *     events on the layer so strokes pass through to the canvas beneath.
 *   • Chrome        — left bar (stamps), right bar (sizes), bottom bar
 *     (tools + colours). Each is a transparent container wrapped in
 *     <SketchFrame>, which renders a wobbly hand-drawn SVG outline as
 *     the only visible "edge".
 */

type Brush = 'pen' | 'marker' | 'pencil' | 'highlighter';
type Tool = Brush | 'eraser' | 'hand';

const BRUSH_LABELS: Record<Brush, string> = {
  pen: 'pen',
  marker: 'marker',
  pencil: 'pencil',
  highlighter: 'highlighter',
};
/** Hand-drawn doodle SVGs ship in /public/404-stamps/asset-N.svg.
 *  StampId is the asset number — kept as a string so React keys and
 *  drag-data stay simple. The list excludes a handful of broken /
 *  fragment-style assets that didn't render as recognisable doodles. */
type StampId = string;
const STAMP_IDS: StampId[] = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14',
  '29', '32', '33', '34', '35', '36', '37', '38', '40', '41', '42', '53', '54',
  '64', '65', '66', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80',
  '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93',
  '94', '95', '96', '97', '98', '99', '100', '101', '102', '103', '104', '105',
  '106', '107', '108',
];
const STAMP_COUNT = STAMP_IDS.length;
function stampSrc(id: StampId): string {
  return `/404-stamps/asset-${id}.svg`;
}

type StampInstance = {
  id: string;
  /** 'icon' = an SVG from /404-stamps. 'digit' = a literal character
   *  (used for the seeded "404" headline so the user can move and
   *  delete each digit individually like any other stamp). */
  kind: 'icon' | 'digit';
  /** For kind='icon': the asset id ('1'..'108'). For kind='digit': the
   *  character to render ('4', '0', '4'). */
  type: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
};

const COLORS = ['#1a1814', '#c44a26', '#3a78c2', '#3f8b4a', '#d4a72c'] as const;
const SIZES = [
  { label: 'XS', width: 2 },
  { label: 'S', width: 4 },
  { label: 'M', width: 8 },
  { label: 'L', width: 16 },
] as const;

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<Tool>('pen');
  const [currentBrush, setCurrentBrush] = useState<Brush>('pen');
  const [brushMenuOpen, setBrushMenuOpen] = useState(false);
  const [color, setColor] = useState<string>(COLORS[0]);
  const [width, setWidth] = useState<number>(SIZES[1].width);
  const [stamps, setStamps] = useState<StampInstance[]>([]);

  // Theme — seeded from the same `brandos-theme` localStorage key the
  // Setup / Brand Kit pages use, so opening the 404 in a fresh tab still
  // matches the user's last-set mode.
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const stored = window.localStorage.getItem('brandos-theme');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {
      /* noop */
    }
    return 'light';
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('brandos-theme', theme);
    } catch {
      /* noop */
    }
  }, [theme]);
  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  // Picking a brush sets BOTH the active tool and the "currently
  // remembered" brush so the picker button keeps showing it after the
  // user switches to eraser/hand and back.
  const pickBrush = useCallback((b: Brush) => {
    setCurrentBrush(b);
    setTool(b);
    setBrushMenuOpen(false);
  }, []);

  // Resize the canvas to viewport, preserving the bitmap so resizes
  // don't wipe drawings.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const snapshot = canvas.width > 0 ? canvas.toDataURL() : null;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (snapshot) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, w, h);
        img.src = snapshot;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  /** Configure the 2D context for the active brush. Each brush is a
   *  combo of composite op + alpha + width-multiplier. Pencil also uses
   *  a small jitter loop in the move handler. */
  const applyBrush = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = color;
      switch (tool) {
        case 'pen':
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
          ctx.lineWidth = width;
          break;
        case 'marker':
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 0.85;
          ctx.lineWidth = width * 1.6;
          break;
        case 'pencil':
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 0.45;
          ctx.lineWidth = Math.max(1, width * 0.55);
          break;
        case 'highlighter':
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = width * 3.2;
          break;
        case 'eraser':
          ctx.globalCompositeOperation = 'destination-out';
          ctx.globalAlpha = 1;
          ctx.lineWidth = Math.max(12, width * 3);
          break;
      }
    },
    [tool, color, width],
  );

  const pointerPos = (e: RPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (tool === 'hand') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPtRef.current = pointerPos(e);
  };
  const onPointerMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pt = pointerPos(e);
    const last = lastPtRef.current;
    if (!last) {
      lastPtRef.current = pt;
      return;
    }
    applyBrush(ctx);
    const segments = tool === 'pencil' ? 3 : 1;
    for (let i = 0; i < segments; i += 1) {
      const jx = tool === 'pencil' ? (Math.random() - 0.5) * 1.4 : 0;
      const jy = tool === 'pencil' ? (Math.random() - 0.5) * 1.4 : 0;
      ctx.beginPath();
      ctx.moveTo(last.x + jx, last.y + jy);
      const mid = { x: (last.x + pt.x) / 2, y: (last.y + pt.y) / 2 };
      ctx.quadraticCurveTo(last.x + jx, last.y + jy, mid.x + jx, mid.y + jy);
      ctx.lineTo(pt.x + jx, pt.y + jy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    lastPtRef.current = pt;
  };
  const onPointerUp = (e: RPointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    lastPtRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const clearAll = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    setStamps([]);
  }, []);

  // ── Stamps: drag from the sidebar OR click to drop near centre. ──
  const addStamp = useCallback(
    (type: StampId, x: number, y: number) => {
      setStamps((s) => [
        ...s,
        {
          id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          kind: 'icon',
          type,
          x,
          y,
          size: 180,
          rotation: (Math.random() - 0.5) * 24,
        },
      ]);
    },
    [],
  );

  // Seed the canvas with three "404" digit stamps centred horizontally.
  // They behave like any other stamp — draggable in hand mode, erasable
  // by the eraser, removable from the right-click menu.
  useEffect(() => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    // Each digit fills nearly half the viewport; spacing sits the three
    // numbers tight against each other like a single poster headline.
    // Permanent Marker glyphs occupy ~52% of their em box visually, so
    // a centre-to-centre spacing of ~52% × size makes the characters
    // sit shoulder-to-shoulder without overlap.
    const size = Math.min(window.innerWidth * 0.22, window.innerHeight * 0.5);
    const spacing = size * 0.52;
    setStamps([
      { id: 'digit-1', kind: 'digit', type: '4', x: cx - spacing, y: cy, size, rotation: -3 },
      { id: 'digit-2', kind: 'digit', type: '0', x: cx, y: cy, size, rotation: 0.5 },
      { id: 'digit-3', kind: 'digit', type: '4', x: cx + spacing, y: cy, size, rotation: 2 },
    ]);
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Delete a single stamp — used by both the eraser tool's click and
  // the right-click "Delete" menu item.
  const deleteStamp = useCallback((id: string) => {
    setStamps((s) => s.filter((x) => x.id !== id));
  }, []);

  // Right-click context menu state.
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; stampId: string } | null>(null);

  // Document-wide contextmenu listener — uses elementsFromPoint so the
  // menu fires even when stamps are pointer-events:none (e.g. while
  // drawing with the pen). The stamp under the cursor "wins" the right
  // click regardless of the layer it's hidden behind.
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const root = document.querySelector('.nf-root');
      if (!root || !root.contains(e.target as Node)) return;
      const els = document.elementsFromPoint(e.clientX, e.clientY);
      const stampEl = els.find((el) =>
        (el as HTMLElement).classList?.contains('nf-stamp-instance'),
      ) as HTMLElement | undefined;
      if (!stampEl) return;
      const stampId = stampEl.getAttribute('data-stamp-id');
      if (!stampId) return;
      e.preventDefault();
      setCtxMenu({ x: e.clientX, y: e.clientY, stampId });
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, []);

  // Close context menu on outside click or Escape.
  useEffect(() => {
    if (!ctxMenu) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest('.nf-ctx-menu')) return;
      setCtxMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCtxMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ctxMenu]);
  const onStampDragStart =
    (id: StampId) => (e: React.DragEvent<HTMLButtonElement>) => {
      e.dataTransfer.setData('application/x-stamp', id);
      e.dataTransfer.effectAllowed = 'copy';
    };
  const onStampClick = (id: StampId) => () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    addStamp(
      id,
      w / 2 + (Math.random() - 0.5) * 200,
      h / 2 + (Math.random() - 0.5) * 160,
    );
  };
  const onLayerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('application/x-stamp')) e.preventDefault();
  };
  const onLayerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const stampId = e.dataTransfer.getData('application/x-stamp') as StampId;
    if (!stampId) return;
    e.preventDefault();
    addStamp(stampId, e.clientX, e.clientY);
  };

  // Hand-tool dragging of placed stamps. Each stamp owns its own
  // pointerdown/move/up; the global tool gate is on the layer (CSS
  // pointer-events: none unless tool === 'hand').
  const dragStateRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const onStampPointerDown =
    (s: StampInstance) => (e: RPointerEvent<HTMLDivElement>) => {
      // Only react to left-click. Right-click is for the context menu.
      if (e.button !== 0) return;
      if (tool === 'eraser') {
        e.stopPropagation();
        deleteStamp(s.id);
        return;
      }
      if (tool !== 'hand') return;
      e.stopPropagation();
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      dragStateRef.current = {
        id: s.id,
        startX: e.clientX,
        startY: e.clientY,
        originX: s.x,
        originY: s.y,
      };
    };
  const onStampPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setStamps((arr) =>
      arr.map((s) =>
        s.id === drag.id ? { ...s, x: drag.originX + dx, y: drag.originY + dy } : s,
      ),
    );
  };
  const onStampPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* released */
    }
    dragStateRef.current = null;
  };

  const layerStyle = useMemo<CSSProperties>(() => ({}), []);

  return (
    <div
      className="nf-root"
      data-theme={theme}
      role="main"
      aria-label="Page not found"
      onDragOver={onLayerDragOver}
      onDrop={onLayerDrop}
    >
      {/* Floating theme toggle at the top-right corner. Same sketchy
          outline as the rest of the chrome so it reads as a tiny note
          taped to the corner of the page. */}
      <button
        type="button"
        className="nf-theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* Subtitle watermark — the "404" itself is rendered as 3
          draggable digit stamps below so the user can move/delete each
          number individually. */}
      <p className="nf-subtitle" aria-hidden="true">
        this page wandered off — draw your own
      </p>

      <canvas
        ref={canvasRef}
        className="nf-canvas"
        data-tool={tool}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {/* Stamps layer — sits above the canvas, hosts placed stamps as
          draggable DOM elements. Drop handling lives on .nf-root above
          so dragging from the sidebar works in every tool, not just
          when "hand" is the active tool. */}
      <div
        className="nf-stamps-layer"
        data-tool={tool}
        style={layerStyle}
      >
        {stamps.map((s) => (
          <div
            key={s.id}
            data-stamp-id={s.id}
            className={`nf-stamp-instance${s.kind === 'digit' ? ' is-digit' : ''}`}
            style={{
              left: s.x - s.size / 2,
              top: s.y - s.size / 2,
              width: s.size,
              height: s.size,
              transform: `rotate(${s.rotation}deg)`,
            }}
            onPointerDown={onStampPointerDown(s)}
            onPointerMove={onStampPointerMove}
            onPointerUp={onStampPointerUp}
            onPointerCancel={onStampPointerUp}
          >
            {s.kind === 'digit' ? <DigitGlyph char={s.type} size={s.size} /> : <Stamp id={s.type} />}
          </div>
        ))}
      </div>

      {/* Right-click context menu — sketchy outline, matches the rest
          of the chrome. Two actions: switch to hand tool (so any drag
          works) or delete the stamp. */}
      {ctxMenu && (
        <div
          className="nf-ctx-menu"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <SketchFrame>
            <div className="nf-ctx-menu-list" role="menu">
              <button
                type="button"
                role="menuitem"
                className="nf-ctx-menu-item"
                onClick={() => {
                  setTool('hand');
                  setCtxMenu(null);
                }}
              >
                <HandIcon /> Move
              </button>
              <button
                type="button"
                role="menuitem"
                className="nf-ctx-menu-item nf-ctx-menu-item--danger"
                onClick={() => {
                  deleteStamp(ctxMenu.stampId);
                  setCtxMenu(null);
                }}
              >
                <ClearIcon /> Delete
              </button>
            </div>
          </SketchFrame>
        </div>
      )}

      {/* LEFT — brainstorm sidebar (sized like the real one) */}
      <BrainstormSidebar
        onStampDragStart={onStampDragStart}
        onStampClick={onStampClick}
      />

      {/* RIGHT — brush sizes */}
      <SketchFrame className="nf-sizebar">
        <div className="nf-bar-title">size</div>
        {SIZES.map((s) => (
          <button
            key={s.label}
            type="button"
            className="nf-size"
            aria-pressed={width === s.width}
            aria-label={`Brush size ${s.label}`}
            onClick={() => setWidth(s.width)}
            title={`${s.label} · ${s.width}px`}
          >
            <span
              className="nf-size-dot"
              style={{
                width: Math.max(6, s.width * 1.4),
                height: Math.max(6, s.width * 1.4),
              }}
            />
          </button>
        ))}
      </SketchFrame>

      {/* "lost from /xyz — go home" */}
      <p className="nf-home-hint">
        lost from{' '}
        <code style={{ fontFamily: 'inherit', fontSize: '0.95em' }}>{location.pathname}</code>{' '}
        — <a onClick={() => navigate('/')}>back to the front page</a>
      </p>

      {/* BOTTOM — tools, colours, actions. Pill outline (sketch) with
          left-aligned tools + colours; clear / home pinned to the right. */}
      <SketchFrame className="nf-toolbar" shape="pill">
        <div className="nf-toolbar-left">
          <ToolBtn icon={<HandIcon />} label="move" pressed={tool === 'hand'} onClick={() => setTool('hand')} title="Move stamps" />

          <BrushPicker
            brush={currentBrush}
            active={tool === currentBrush}
            open={brushMenuOpen}
            onToggle={() => setBrushMenuOpen((o) => !o)}
            onClose={() => setBrushMenuOpen(false)}
            onPick={pickBrush}
          />

          <ToolBtn icon={<EraserIcon />} label="erase" pressed={tool === 'eraser'} onClick={() => setTool('eraser')} title="Eraser" />

          <div className="nf-swatches" role="radiogroup" aria-label="Colour">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="nf-swatch"
                style={{ ['--swatch' as string]: c } as CSSProperties}
                aria-pressed={color === c}
                aria-label={`Colour ${c}`}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="nf-toolbar-right">
          <ToolBtn icon={<ClearIcon />} label="clear" onClick={clearAll} title="Clear the page" />
          <ToolBtn icon={<HomeIcon />} label="home" onClick={() => navigate('/')} title="Take me home" />
        </div>
      </SketchFrame>
    </div>
  );
}

/* ── Brainstorm sidebar — sized to match the real Brand Kit panel.
   Top half: handwritten labels + arrows + dashed placeholders, like
   we were sketching what the page would look like.
   Bottom half: a scrolling, scattered grid of all 108 doodle icons
   shipped under /public/404-stamps. Each is draggable onto the canvas
   and rendered with a per-render random rotation so the row never
   reads as a clean grid. ─────────────────────────────────────────── */

/** Cheap deterministic-ish jitter — generated once on mount per
 *  stamp so the rotations stay stable across renders (no flicker). */
function randomRotations(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) out.push((Math.random() - 0.5) * 30);
  return out;
}

function BrainstormSidebar({
  onStampDragStart,
  onStampClick,
}: {
  onStampDragStart: (id: StampId) => (e: React.DragEvent<HTMLButtonElement>) => void;
  onStampClick: (id: StampId) => () => void;
}) {
  // Stable rotations across re-renders — generate once.
  const rotations = useMemo(() => randomRotations(STAMP_COUNT), []);

  return (
    <SketchFrame className="nf-sidebar">
      <div className="nf-brainstorm-top">
        {/* Brainstorm scribbles — handwritten labels and a dashed line
            that read as "we were thinking what would go here". */}
        <span className="nf-brainstorm-label" style={{ top: 18, left: 16 }}>
          brand name
        </span>
        <div
          className="nf-brainstorm-line"
          style={{ top: 44, left: 16, width: 'calc(100% - 32px)' }}
        />

        <span
          className="nf-brainstorm-label nf-brainstorm-label-sm"
          style={{ top: 60, left: 16 }}
        >
          completion ↘
        </span>
        <div
          className="nf-brainstorm-line"
          style={{ top: 84, left: 16, width: 'calc(100% - 32px)' }}
        />

        <span className="nf-brainstorm-label" style={{ top: 116, left: 16 }}>
          stickers ↓
        </span>
      </div>

      {/* Scattered stamp grid — all 108 doodles, random rotation each.
          Wraps naturally so it adapts to the sidebar width; scrolls
          vertically inside the SketchFrame. */}
      <div className="nf-brainstorm-stamps">
        {STAMP_IDS.map((id, i) => (
          <button
            key={id}
            type="button"
            className="nf-stamp-tile"
            draggable
            onDragStart={onStampDragStart(id)}
            onClick={onStampClick(id)}
            aria-label={`Stamp ${id}`}
            title="Drag onto the page"
            style={{
              transform: `rotate(${rotations[i] ?? 0}deg)`,
              ['--scatter-rot' as string]: `${rotations[i] ?? 0}deg`,
            } as CSSProperties}
          >
            <Stamp id={id} />
          </button>
        ))}
      </div>
    </SketchFrame>
  );
}

/* ── Brush picker — single button + chevron that opens a popover
   above the toolbar with the four brush options stacked vertically.
   Closes on outside-click or Escape. ───────────────────────────── */
const BRUSH_OPTIONS: { id: Brush; label: string; icon: React.ReactNode }[] = [
  { id: 'pen', label: 'pen', icon: <PenIcon /> },
  { id: 'marker', label: 'marker', icon: <MarkerIcon /> },
  { id: 'pencil', label: 'pencil', icon: <PencilIcon /> },
  { id: 'highlighter', label: 'highlighter', icon: <HighlighterIcon /> },
];

function BrushPicker({
  brush,
  active,
  open,
  onToggle,
  onClose,
  onPick,
}: {
  brush: Brush;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPick: (b: Brush) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const current = BRUSH_OPTIONS.find((b) => b.id === brush) ?? BRUSH_OPTIONS[0];

  return (
    <div className="nf-brush-picker" ref={wrapRef}>
      <button
        type="button"
        className="nf-tool"
        aria-pressed={active}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={onToggle}
        title={`Brush — ${BRUSH_LABELS[brush]} · click to switch`}
      >
        {current.icon}
        <span>{BRUSH_LABELS[brush]}</span>
        <span className="nf-tool-chevron" aria-hidden="true">›</span>
      </button>

      {open && (
        <SketchFrame className="nf-brush-popover">
          <div className="nf-brush-popover-list" role="menu">
            {BRUSH_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="menuitem"
                className="nf-brush-option"
                aria-pressed={opt.id === brush}
                onClick={() => onPick(opt.id)}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </SketchFrame>
      )}
    </div>
  );
}

/* ── Toolbar button ─────────────────────────────────────────────── */
function ToolBtn({
  icon,
  label,
  pressed,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  pressed?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={`nf-tool${label ? '' : ' nf-tool-icononly'}`}
      aria-pressed={pressed}
      onClick={onClick}
      title={title ?? label}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}

/* ── SketchFrame ──────────────────────────────────────────────────
   Wraps any chrome container in a transparent panel with a wobbly
   hand-drawn SVG outline. Two paths overlap at slight offsets with
   strokeDasharray gaps so the line looks "drawn twice and missed
   here and there".
   `shape='pill'` swaps the rectangle path for a rounded stadium —
   used by the bottom toolbar so it matches the reference's pill bar.
   ──────────────────────────────────────────────────────────────────── */
function SketchFrame({
  className,
  shape = 'rect',
  children,
}: {
  className?: string;
  shape?: 'rect' | 'pill';
  children: React.ReactNode;
}) {
  const paths =
    shape === 'pill'
      ? {
          // Stadium / pill — full half-circles at each end, wobbly long
          // edges. Designed at viewBox 200×100 then stretched, so the
          // ends squash slightly when the bar is much wider — fine for
          // a hand-drawn aesthetic.
          main:
            'M 50 5 ' +
            'L 110 4 Q 140 3 150 5 ' +
            'Q 196 6 196 30 Q 197 60 195 76 ' +
            'Q 195 96 150 96 L 110 97 Q 70 95 50 96 ' +
            'Q 5 95 4 70 Q 3 30 5 24 Q 6 5 50 5 Z',
          mainDash: '60 0 50 3 80 0 60 2 70 0 40 1.5',
          ghost:
            'M 52 6 ' +
            'L 112 5 Q 142 4 152 6 ' +
            'Q 195 7 195 31 Q 196 61 194 75 ' +
            'Q 194 95 150 95 L 110 96 Q 70 94 50 95 ' +
            'Q 5 94 5 70 Q 4 30 6 25 Q 7 6 52 6',
          ghostDash: '50 4 70 0 90 3 40 0',
        }
      : {
          main:
            'M5 8 Q3 4 9 4 ' +
            'L60 3 Q90 5 130 4 L194 6 ' +
            'Q199 4 196 11 ' +
            'L197 50 Q196 78 197 92 ' +
            'Q199 97 193 95 ' +
            'L150 97 Q100 94 50 96 L7 95 ' +
            'Q2 98 4 91 ' +
            'L5 50 Q4 30 5 8 Z',
          mainDash: '80 0 60 2.5 70 0 50 1.5 90 0 40 2',
          ghost:
            'M7 9 Q5 6 11 6 ' +
            'L62 5 Q92 7 132 6 L193 8 ' +
            'Q197 6 195 12 ' +
            'L196 51 Q195 79 196 91 ' +
            'Q197 95 192 94 ' +
            'L148 96 Q98 92 48 95 L8 94 ' +
            'Q4 96 6 90 ' +
            'L7 51 Q6 31 7 9',
          ghostDash: '60 4 40 0 100 3 30 0',
        };

  return (
    <div className={`nf-frame ${className ?? ''}`}>
      <svg
        className="nf-frame-outline"
        preserveAspectRatio="none"
        viewBox="0 0 200 100"
        aria-hidden="true"
      >
        <path
          d={paths.main}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          strokeDasharray={paths.mainDash}
        />
        <path
          d={paths.ghost}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.42"
          vectorEffect="non-scaling-stroke"
          strokeDasharray={paths.ghostDash}
        />
      </svg>
      <div className="nf-frame-content">{children}</div>
    </div>
  );
}

/* ────────────────────────── Hand-drawn icons ────────────────────── */

function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19c1-1 2.5-1.5 4-2 .5-1.5 1-3 2-4l9-9 3 3-9 9c-1 1-2.5 1.5-4 2-.5 1.5-1 3-2 4z" />
      <path d="M14 5l3 3" />
    </svg>
  );
}
function MarkerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 17l-2 4 4-2 11-11-2-2z" />
      <path d="M14 6l4 4" />
      <path d="M5 21h14" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21l4-1 13-13-3-3L4 17z" />
      <path d="M14 6l3 3" />
      <path d="M3 21l4-1" />
    </svg>
  );
}
function HighlighterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l-3 7-3-1 2-7 7-7 5 5-7 7z" />
      <path d="M14 4l5 5" />
      <path d="M3 21h7" />
    </svg>
  );
}
function EraserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 8 8H8z" />
      <path d="M9 11l8-8 4 4-8 8" />
    </svg>
  );
}
function HandIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 13V5a1.5 1.5 0 013 0v6" />
      <path d="M11 11V4a1.5 1.5 0 013 0v7" />
      <path d="M14 11V5a1.5 1.5 0 013 0v8" />
      <path d="M17 11a1.5 1.5 0 013 0v5c0 3-2 6-6 6h-1c-3 0-5-2-6-4l-3-6a1.5 1.5 0 012-2l2 2" />
    </svg>
  );
}
function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 6h14" />
      <path d="M9 6V4h6v2" />
      <path d="M7 6l1 14h8l1-14" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z" />
    </svg>
  );
}

/** A single big handwritten digit, used to render the seeded "404"
 *  characters as movable / deletable stamps. Permanent Marker font
 *  with a marker-bleed text-shadow. The font-size is forced from the
 *  stamp's container size so each digit visibly fills its box no
 *  matter how big the user has scaled it. */
function DigitGlyph({ char, size }: { char: string; size: number }) {
  return (
    <span className="nf-digit-glyph" style={{ fontSize: `${size}px` }}>
      {char}
    </span>
  );
}

/** A stamp = the matching SVG file in /public/404-stamps used as a CSS
 *  mask. The actual pixel colour comes from `currentColor` (which inherits
 *  from the page's --ink theme token), so a stamp tile is dark on light
 *  paper and flips to light on dark paper without any per-asset work. */
function Stamp({ id }: { id: StampId }) {
  const url = stampSrc(id);
  return (
    <span
      className="nf-stamp-mask"
      role="img"
      aria-label=""
      style={{
        WebkitMaskImage: `url("${url}")`,
        maskImage: `url("${url}")`,
      }}
    />
  );
}
