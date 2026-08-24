/**
 * CanvasToolbar — the canvas-level bottom toolbar + nested Insert menu.
 *
 * Chronicle-style (reference study 2026-08-22): a floating dark pill at the
 * bottom of the canvas whose Insert button opens a data-driven menu that is
 * the editor's whole vocabulary. Family rows open flyouts on HOVER (click is
 * reserved for the actual insert), up to three levels deep; resting on a
 * leaf raises a preview card to the right of the deepest open panel so a
 * widget is chosen by eye, not by name.
 *
 * This is the ENGINE only — generic and data-driven. It renders whatever
 * `InsertMenuSection[]` tree it is given and never imports a feature, so the
 * guideline builder can feed it page-library sections whose previews render
 * the user's REAL brand (our edge over the reference's canned samples).
 * The default widget vocabulary lives beside it in `insertMenu.tsx`.
 *
 * Placement contract: the parent is the CANVAS — `position: relative` with
 * a real height. The bar centers itself at the bottom; the menu layer claims
 * the space above it. Everything is absolute within the parent: no portals,
 * so the chrome scrolls/clips with its canvas and `--ds-*` tokens resolve
 * in place (same reasoning as DsMenu).
 *
 * Interaction spec (the numbers that make it feel right):
 * - 90ms hover intent before a flyout opens — scrubbing rows never strobes.
 * - 200ms before a LEAF row closes deeper flyouts — the diagonal path from
 *   a parent row into its flyout survives crossing siblings.
 * - 180ms before a preview appears, instant swap once one is up.
 * - One flyout per level; the parent row stays lit while its child is open.
 * - Escape walks back one level, then closes; click-outside closes all.
 */
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ChevronRight, MoreHorizontal, Plus, X, type LucideIcon } from 'lucide-react';

export interface InsertMenuItem {
  id: string;
  label: string;
  /** Level-0 rows carry a 1.8px-stroke line icon; flyout rows usually don't. */
  icon?: LucideIcon;
  /** Colored provider tile (Embed or link) — the one place chrome gets color. */
  swatch?: string;
  /** Canvas keyboard shortcut, printed as a keycap on the row. */
  kbd?: string;
  /** Maturity pill — "Beta". A label, not a gate. */
  badge?: string;
  /** A thin rule between groups inside one flyout. */
  divider?: boolean;
  /** Presence makes this a family row: chevron + hover flyout. */
  children?: InsertMenuItem[];
  /** Leaf rows: what the hover preview card renders. */
  preview?: () => ReactNode;
}

export interface InsertMenuSection {
  id: string;
  label: string;
  items: InsertMenuItem[];
}

export interface CanvasToolbarAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
}

interface CanvasToolbarProps {
  sections: InsertMenuSection[];
  /** A leaf row was clicked. The menu closes itself first. */
  onPick: (id: string) => void;
  /** Bar items after Insert (Media, Theme, Background, …). */
  actions?: CanvasToolbarAction[];
  /** Renders the trailing ⋯ behind a separator when set. */
  onMore?: () => void;
  /** Open the menu on mount — the component lab wants the menu visible. */
  defaultOpen?: boolean;
}

const PANEL_W = 264;
/** Column stride: panel width + the 8px gap between stacked panels. */
const COL = PANEL_W + 8;
const PREVIEW_W = 380;

/** Shared chrome: the FloatingToolbar's dark material, panel-shaped. */
const PANEL_CLASS =
  'pointer-events-auto absolute w-[264px] bg-[#242427] rounded-[14px] p-1.5 ' +
  'shadow-2xl border border-white/[0.08]';

const HOVER_INTENT_MS = 90;
const LEAF_TRIM_MS = 200;
const PREVIEW_MS = 180;
const PREVIEW_SWAP_MS = 40;

export function CanvasToolbar({
  sections,
  onPick,
  actions = [],
  onMore,
  defaultOpen = false,
}: CanvasToolbarProps) {
  const [open, setOpen] = useState(defaultOpen);
  /** Open family chain — item ids, one per flyout level. */
  const [path, setPath] = useState<string[]>([]);
  /** Where each flyout anchors: its trigger row's top within the layer. */
  const [anchors, setAnchors] = useState<number[]>([]);
  const [preview, setPreview] = useState<{
    item: InsertMenuItem;
    level: number;
    top: number;
  } | null>(null);

  const barRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [layerSize, setLayerSize] = useState({ w: 0, h: 0 });
  const intentRef = useRef<ReturnType<typeof setTimeout>>();
  const previewTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const previewShownRef = useRef(false);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setPath([]);
    setPreview(null);
    previewShownRef.current = false;
  }, []);

  // ── Layer measurement — flyout/preview clamping needs the box ──────
  useLayoutEffect(() => {
    if (!open) return;
    const el = layerRef.current;
    if (!el) return;
    const measure = () => setLayerSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  // ── Escape walks back; click-outside closes all ────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (preview) {
        setPreview(null);
        previewShownRef.current = false;
      } else if (path.length > 0) {
        setPath((p) => p.slice(0, -1));
        setAnchors((a) => a.slice(0, -1));
      } else {
        closeMenu();
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (barRef.current?.contains(t)) return;
      if (layerRef.current?.contains(t)) return;
      closeMenu();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, path.length, preview, closeMenu]);

  useEffect(
    () => () => {
      clearTimeout(intentRef.current);
      clearTimeout(previewTimerRef.current);
    },
    [],
  );

  /** The trigger row's top edge within the menu layer. Offsets, never
   *  rects — layout-based, immune to any animated ancestor transform. */
  const rowTop = (rowEl: HTMLElement) => {
    const panel = rowEl.offsetParent as HTMLElement | null;
    return (panel?.offsetTop ?? 0) + rowEl.offsetTop;
  };

  const openFamily = useCallback((item: InsertMenuItem, level: number, top: number) => {
    setPreview(null);
    previewShownRef.current = false;
    setPath((p) => [...p.slice(0, level), item.id]);
    setAnchors((a) => [...a.slice(0, level), top]);
  }, []);

  const enterRow = useCallback(
    (item: InsertMenuItem, level: number, rowEl: HTMLElement) => {
      clearTimeout(intentRef.current);
      clearTimeout(previewTimerRef.current);
      const top = rowTop(rowEl);
      if (item.children?.length) {
        intentRef.current = setTimeout(() => openFamily(item, level, top), HOVER_INTENT_MS);
        return;
      }
      // A leaf: deeper flyouts close after a grace long enough to survive
      // the diagonal into an already-open sibling flyout.
      intentRef.current = setTimeout(() => {
        setPath((p) => p.slice(0, level));
        setAnchors((a) => a.slice(0, level));
      }, LEAF_TRIM_MS);
      if (item.preview) {
        previewTimerRef.current = setTimeout(
          () => {
            setPreview({ item, level, top });
            previewShownRef.current = true;
          },
          previewShownRef.current ? PREVIEW_SWAP_MS : PREVIEW_MS,
        );
      } else {
        setPreview(null);
        previewShownRef.current = false;
      }
    },
    [openFamily],
  );

  const clickRow = useCallback(
    (item: InsertMenuItem, level: number, rowEl: HTMLElement) => {
      if (item.children?.length) {
        clearTimeout(intentRef.current);
        openFamily(item, level, rowTop(rowEl));
        return;
      }
      closeMenu();
      onPick(item.id);
    },
    [openFamily, closeMenu, onPick],
  );

  // ── Resolve the open chain into flyout item lists ──────────────────
  const flyouts: InsertMenuItem[][] = [];
  {
    let current = sections.flatMap((s) => s.items);
    for (const id of path) {
      const found = current.find((i) => i.id === id);
      if (!found?.children?.length) break;
      flyouts.push(found.children);
      current = found.children;
    }
  }

  const row = (item: InsertMenuItem, level: number) => {
    if (item.divider) {
      return <div key={item.id} className="my-1.5 mx-1 border-t border-white/[0.07]" />;
    }
    const hasChildren = Boolean(item.children?.length);
    const isOpen = path[level] === item.id;
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        role="menuitem"
        aria-haspopup={hasChildren || undefined}
        aria-expanded={hasChildren ? isOpen : undefined}
        onMouseEnter={(e) => enterRow(item, level, e.currentTarget)}
        onClick={(e) => clickRow(item, level, e.currentTarget)}
        className={`w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[9px] text-[13px] transition-colors ${
          isOpen ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
        }`}
      >
        {Icon && (
          <Icon className="h-[17px] w-[17px] shrink-0 text-white/45" strokeWidth={1.8} aria-hidden />
        )}
        {item.swatch && (
          <span
            aria-hidden
            className="h-[18px] w-[18px] shrink-0 rounded-[5px] inline-flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: item.swatch }}
          >
            {item.label.charAt(0)}
          </span>
        )}
        <span className="flex-1 text-left truncate">{item.label}</span>
        {item.badge && (
          <span className="px-1.5 py-px rounded-md bg-white/10 text-[10px] text-white/50">
            {item.badge}
          </span>
        )}
        {item.kbd && (
          <span className="min-w-[20px] h-5 px-1 rounded-md bg-white/[0.07] border border-white/[0.06] inline-flex items-center justify-center text-[11px] text-white/45">
            {item.kbd}
          </span>
        )}
        {hasChildren && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden />}
      </button>
    );
  };

  const previewTop = preview
    ? Math.max(8, Math.min(preview.top - 60, layerSize.h - 268))
    : 0;
  const previewLeft = preview
    ? Math.max(0, Math.min((preview.level + 1) * COL, layerSize.w - PREVIEW_W - 8))
    : 0;

  return (
    <>
      {open && (
        <div
          ref={layerRef}
          data-editor-chrome="true"
          className="pointer-events-none absolute left-4 right-4 top-4 bottom-[72px] z-[60]"
        >
          {/* Root panel — bottom-anchored just above the bar. */}
          <div
            role="menu"
            aria-label="Insert menu"
            className={`${PANEL_CLASS} left-0 bottom-0 max-h-full overflow-y-auto animate-in fade-in slide-in-from-bottom-3 duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]`}
          >
            {sections.map((section, si) => (
              <Fragment key={section.id}>
                {si > 0 && <div className="my-1.5 mx-1 border-t border-white/[0.07]" />}
                <div className="px-2.5 pt-1.5 pb-1 text-[12px] text-white/35">{section.label}</div>
                {section.items.map((item) => row(item, 0))}
              </Fragment>
            ))}
          </div>

          {flyouts.map((items, i) => (
            <Flyout
              key={path[i]}
              left={(i + 1) * COL}
              anchorTop={anchors[i] ?? 0}
              layerH={layerSize.h}
            >
              {items.map((item) => row(item, i + 1))}
            </Flyout>
          ))}

          {preview?.item.preview && (
            <div
              data-insert-preview="true"
              className="pointer-events-none absolute z-[70] w-[380px] min-h-[240px] rounded-2xl bg-[#0F0F11] text-[#E9E9EB] border border-white/[0.06] shadow-2xl p-5 flex items-center justify-center animate-in fade-in duration-150"
              style={{ left: previewLeft, top: previewTop }}
            >
              {preview.item.preview()}
            </div>
          )}
        </div>
      )}

      <div
        ref={barRef}
        data-editor-chrome="true"
        className="absolute left-1/2 -translate-x-1/2 bottom-4 z-[60] flex items-center gap-0.5 bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] px-1.5 py-1 shadow-2xl border border-white/[0.08]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-expanded={open}
          onClick={() => (open ? closeMenu() : setOpen(true))}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--ds-radius-control,8px)] text-[13px] transition-colors ${
            open ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          {open ? (
            <X className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          )}
          Insert
        </button>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--ds-radius-control,8px)] text-[13px] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              {Icon && <Icon className="h-4 w-4 text-white/50" strokeWidth={1.8} aria-hidden />}
              {action.label}
            </button>
          );
        })}
        {onMore && (
          <>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <button
              type="button"
              aria-label="More"
              onClick={onMore}
              className="px-2 py-1.5 rounded-[var(--ds-radius-control,8px)] text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
          </>
        )}
      </div>
    </>
  );
}

/** One flyout panel: top-aligned to its trigger row, clamped to the layer.
 *  Height is only known after render, so it places itself in a layout
 *  effect and stays invisible until it has. */
function Flyout({
  left,
  anchorTop,
  layerH,
  children,
}: {
  left: number;
  anchorTop: number;
  layerH: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setTop(Math.max(8, Math.min(anchorTop - 6, layerH - el.offsetHeight - 4)));
  }, [anchorTop, layerH, children]);
  return (
    <div
      ref={ref}
      role="menu"
      className={`${PANEL_CLASS} max-h-full overflow-y-auto animate-in fade-in duration-150`}
      style={{ left, top: top ?? anchorTop, visibility: top === null ? 'hidden' : undefined }}
    >
      {children}
    </div>
  );
}
