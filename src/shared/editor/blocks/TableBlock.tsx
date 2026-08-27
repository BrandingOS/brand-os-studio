/**
 * TableBlock — the EDITABLE table widget, plus TableToolbar, its floating
 * bar in the family language (FloatingToolbar / ChartToolbar / CardToolbar):
 * dark pill, menus portaled 2px under the bar, the rich Turn into on the
 * left name, Escape walking back one layer.
 *
 * The table edits IN PLACE: click any cell or column name and type —
 * chrome-less inputs, nothing draws a box around the words. Hovering a
 * column header reveals ✕ (drops the column), hovering a row reveals ✕ at
 * its end (drops the row); ＋ appends a column, the bottom hairline adds a
 * row. The toolbar's Add row / Add column reach the SAME grid through
 * `apiRef`, so hosts don't have to lift the grid's state.
 *
 * Inks in currentColor — drop it on any ground and it reads.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Copy, Plus, Trash2, X } from 'lucide-react';
import type { InsertMenuItem } from './CanvasToolbar';
import { WIDGET_MENU_SECTION } from './insertMenu';
import { ColorPickerHSV } from '@/shared/components/ColorPickerHSV';
import colorCircleRgb from './color-circle-rgb.svg';

/* ── The grid ─────────────────────────────────────────────────────── */

export interface TableGrid {
  columns: string[];
  rows: string[][];
}

export function defaultTableGrid(): TableGrid {
  return {
    columns: ['Month', 'Units', 'Amount'],
    rows: [
      ['Jan', '220', '$1,760'],
      ['Feb', '160', '$1,280'],
      ['Mar', '340', '$2,720'],
    ],
  };
}

export interface TableBlockApi {
  addRow: () => void;
  addColumn: () => void;
}

/** The table's COLOR settings — '' inherits the ground's own ink
 *  (currentColor), so an untouched table still reads everywhere. */
export interface TableConfig {
  headerColor: string;
  textColor: string;
  lineColor: string;
}
export function defaultTableConfig(): TableConfig {
  return { headerColor: '', textColor: '', lineColor: '' };
}

const HAIRLINE = 'color-mix(in srgb, currentColor 24%, transparent)';
const FAINT = 'color-mix(in srgb, currentColor 45%, transparent)';

export function TableBlock({
  value,
  defaultValue,
  onChange,
  apiRef,
  config,
  width = 420,
}: {
  /** Controlled grid; omit to let the block own it (the lab's mode). */
  value?: TableGrid;
  defaultValue?: TableGrid;
  onChange?: (grid: TableGrid) => void;
  /** The toolbar's Add row / Add column reach the grid through this. */
  apiRef?: (api: TableBlockApi | null) => void;
  /** The toolbar's color settings; omitted fields inherit currentColor. */
  config?: TableConfig;
  width?: number;
}) {
  const headerInk = config?.headerColor || FAINT;
  const textInk = config?.textColor || 'inherit';
  const lineInk = config?.lineColor || 'currentColor';
  const hairline = config?.lineColor
    ? `color-mix(in srgb, ${config.lineColor} 55%, transparent)`
    : HAIRLINE;
  const faint = config?.headerColor || FAINT;
  const [inner, setInner] = useState<TableGrid>(
    () => value ?? defaultValue ?? defaultTableGrid(),
  );
  const grid = value ?? inner;
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const commit = (next: TableGrid) => {
    setInner(next);
    onChange?.(next);
  };

  const setCell = (r: number, c: number, v: string) =>
    commit({
      ...gridRef.current,
      rows: gridRef.current.rows.map((row, ri) =>
        ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row,
      ),
    });
  const setColumn = (c: number, v: string) =>
    commit({
      ...gridRef.current,
      columns: gridRef.current.columns.map((col, ci) => (ci === c ? v : col)),
    });
  const addRow = () =>
    commit({
      ...gridRef.current,
      rows: [...gridRef.current.rows, Array(gridRef.current.columns.length).fill('')],
    });
  const addColumn = () =>
    commit({
      columns: [...gridRef.current.columns, `Column ${gridRef.current.columns.length + 1}`],
      rows: gridRef.current.rows.map((row) => [...row, '']),
    });
  const removeRow = (r: number) => {
    if (gridRef.current.rows.length <= 1) return;
    commit({ ...gridRef.current, rows: gridRef.current.rows.filter((_, ri) => ri !== r) });
  };
  const removeColumn = (c: number) => {
    if (gridRef.current.columns.length <= 1) return;
    commit({
      columns: gridRef.current.columns.filter((_, ci) => ci !== c),
      rows: gridRef.current.rows.map((row) => row.filter((_, ci) => ci !== c)),
    });
  };

  useEffect(() => {
    apiRef?.({ addRow, addColumn });
    return () => apiRef?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cellInput: CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 0,
    outline: 'none',
    color: 'inherit',
    font: 'inherit',
    padding: '7px 10px',
  };

  return (
    <div
      data-element="table-block"
      style={{ width, fontSize: 13, color: 'inherit' }}
      // Typing is the point — clicks land in the cells, never start a
      // block drag underneath.
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${grid.columns.length}, minmax(80px, 1fr)) 26px`,
        }}
      >
        {/* Header row — muted names, hover ✕ drops the column */}
        {grid.columns.map((name, c) => (
          <div
            key={`h-${c}`}
            className="tb-head"
            style={{ position: 'relative', borderBottom: `1px solid ${lineInk}` }}
          >
            <input
              value={name}
              aria-label={`Table column ${c + 1} name`}
              onChange={(e) => setColumn(c, e.target.value)}
              style={{ ...cellInput, color: faint, fontWeight: 500 }}
            />
            {grid.columns.length > 1 && (
              <button
                type="button"
                aria-label={`Remove column ${name || c + 1}`}
                onClick={() => removeColumn(c)}
                className="tb-x"
                style={{
                  position: 'absolute',
                  right: 2,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: 3,
                  border: 0,
                  background: 'transparent',
                  color: faint,
                  cursor: 'pointer',
                  opacity: 0,
                  transition: 'opacity 150ms',
                }}
              >
                <X size={12} strokeWidth={2} aria-hidden />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          aria-label="Add column"
          onClick={addColumn}
          style={{
            border: 0,
            borderBottom: `1px solid ${lineInk}`,
            background: 'transparent',
            color: faint,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={13} strokeWidth={2} aria-hidden />
        </button>

        {/* Body — every cell types in place; hover a row for its ✕ */}
        {grid.rows.map((row, r) => (
          <div key={`r-${r}`} className="tb-row" style={{ display: 'contents' }}>
            {row.map((cell, c) => (
              <div key={`c-${r}-${c}`} style={{ borderBottom: `1px solid ${hairline}` }}>
                <input
                  value={cell}
                  aria-label={`Table row ${r + 1} ${grid.columns[c] || `column ${c + 1}`}`}
                  onChange={(e) => setCell(r, c, e.target.value)}
                  style={{ ...cellInput, color: textInk }}
                />
              </div>
            ))}
            <div
              style={{
                borderBottom: `1px solid ${hairline}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {grid.rows.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove row ${r + 1}`}
                  onClick={() => removeRow(r)}
                  className="tb-x"
                  style={{
                    padding: 3,
                    border: 0,
                    background: 'transparent',
                    color: faint,
                    cursor: 'pointer',
                    opacity: 0,
                    transition: 'opacity 150ms',
                  }}
                >
                  <X size={12} strokeWidth={2} aria-hidden />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* The bottom hairline adds a row — always reachable, quiet. */}
      <button
        type="button"
        aria-label="Add row"
        onClick={addRow}
        style={{
          width: '100%',
          border: 0,
          background: 'transparent',
          color: faint,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '6px 0 2px',
          fontSize: 11.5,
          opacity: 0.75,
        }}
      >
        <Plus size={12} strokeWidth={2} aria-hidden /> Add row
      </button>

      {/* Hover reveals the ✕s — plain CSS, scoped by the data marker. */}
      <style>{`
        [data-element="table-block"] .tb-head:hover .tb-x,
        [data-element="table-block"] .tb-row:hover .tb-x { opacity: 1 !important; }
      `}</style>
    </div>
  );
}

/* ── TableToolbar — the family bar for table blocks ───────────────── */

const turnIntoItems = () => WIDGET_MENU_SECTION.items;
const TI_PANEL_W = 264;
const TI_COL = TI_PANEL_W + 8;
const TI_PREVIEW_W = 380;
const TI_HOVER_INTENT_MS = 90;
const TI_LEAF_TRIM_MS = 200;
const TI_PREVIEW_MS = 180;
const TI_PREVIEW_SWAP_MS = 40;
const MENU_GAP = 2;
const GAP = 15;

const DEFAULT_TABLE_PRESETS = ['#F5F1E8', '#B8352C', '#1F1B16', '#000000', '#FFFFFF'];

/** The three color TARGETS the Style menu edits. */
const TABLE_COLOR_TARGETS: Array<{ key: keyof TableConfig; label: string }> = [
  { key: 'headerColor', label: 'Header color' },
  { key: 'textColor', label: 'Text color' },
  { key: 'lineColor', label: 'Lines color' },
];

export interface TableToolbarProps {
  label?: string;
  /** The table's colors. Omit both config and onChange and the bar keeps
   *  its own (the component-lab mode). */
  config?: TableConfig;
  onChange?: (patch: Partial<TableConfig>) => void;
  colorPresets?: string[];
  onTurnInto?: (id: string) => void;
  onAddRow?: () => void;
  onAddColumn?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  /** Anchor rect (viewport coords) — same contract as FloatingToolbar. */
  position?: { top: number; left: number; width: number; height?: number };
  /** Render in place (component lab) instead of the anchored portal. */
  inline?: boolean;
}

export function TableToolbar({
  label = 'Table',
  config,
  onChange,
  colorPresets = DEFAULT_TABLE_PRESETS,
  onTurnInto,
  onAddRow,
  onAddColumn,
  onDuplicate,
  onDelete,
  position,
  inline,
}: TableToolbarProps) {
  const [open, setOpen] = useState(false);
  // ── Colors — controlled when the host passes config/onChange, else
  // self-owned so the bar works standalone in the lab.
  const [innerCfg, setInnerCfg] = useState<TableConfig>(() => defaultTableConfig());
  const cfg = config ?? innerCfg;
  const patchCfg = (patch: Partial<TableConfig>) => {
    if (onChange) onChange(patch);
    else setInnerCfg((c) => ({ ...c, ...patch }));
  };
  const [styleOpen, setStyleOpen] = useState(false);
  /** Which target's color popover is open beside the Style menu. */
  const [colorFor, setColorFor] = useState<keyof TableConfig | null>(null);
  const [subCustomOpen, setSubCustomOpen] = useState(false);
  const styleAnchorRef = useRef<HTMLButtonElement>(null);
  const styleMenuRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const swatchRefs = useRef<Record<string, HTMLElement | null>>({});
  const [stylePos, setStylePos] = useState<{ top: number; left: number } | null>(null);
  const [subPos, setSubPos] = useState<{ top: number; left: number } | null>(null);
  // The HSV picker fires onChange from an effect keyed on the callback's
  // identity — the usual ref-stabilised bridge.
  const patchRef = useRef(patchCfg);
  patchRef.current = patchCfg;
  const colorForRef = useRef(colorFor);
  colorForRef.current = colorFor;
  const pickerChange = useRef((hex: string) => {
    const key = colorForRef.current;
    if (key) patchRef.current({ [key]: hex });
  }).current;
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [rootSize, setRootSize] = useState({ w: 0, h: 0 });
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  // Turn into chain + hover preview — the shared interaction numbers.
  const [turnPath, setTurnPath] = useState<string[]>([]);
  const [turnAnchors, setTurnAnchors] = useState<number[]>([]);
  const [turnPreview, setTurnPreview] = useState<{
    item: InsertMenuItem;
    level: number;
    top: number;
  } | null>(null);
  const intentRef = useRef<ReturnType<typeof setTimeout>>();
  const previewTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const previewShownRef = useRef(false);
  const pathRef = useRef(turnPath);
  pathRef.current = turnPath;
  const previewRef = useRef(turnPreview);
  previewRef.current = turnPreview;

  useLayoutEffect(() => {
    if (inline) return;
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setRootSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [inline]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const place = () => {
      const bar = rootRef.current;
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      if (!bar || !anchor || !menu) return;
      const barRect = bar.getBoundingClientRect();
      const { width: mw, height: mh } = menu.getBoundingClientRect();
      const spaceBelow = window.innerHeight - barRect.bottom - MENU_GAP;
      const spaceAbove = barRect.top - MENU_GAP;
      const below = mh <= spaceBelow || spaceBelow >= spaceAbove;
      const top = below ? barRect.bottom + MENU_GAP : Math.max(8, barRect.top - MENU_GAP - mh);
      const left = Math.min(
        Math.max(8, anchor.getBoundingClientRect().left),
        Math.max(8, window.innerWidth - mw - 8),
      );
      setMenuPos({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, position?.top, position?.left]);

  useEffect(() => {
    if (open) return;
    setTurnPath([]);
    setTurnAnchors([]);
    setTurnPreview(null);
    previewShownRef.current = false;
    clearTimeout(intentRef.current);
    clearTimeout(previewTimerRef.current);
  }, [open]);
  useEffect(
    () => () => {
      clearTimeout(intentRef.current);
      clearTimeout(previewTimerRef.current);
    },
    [],
  );

  // ── Style menu placement — MENU_GAP under the bar, anchored to the
  // palette button, flipping above when the space below runs out.
  useLayoutEffect(() => {
    if (!styleOpen) {
      setStylePos(null);
      return;
    }
    const place = () => {
      const bar = rootRef.current;
      const anchor = styleAnchorRef.current;
      const menu = styleMenuRef.current;
      if (!bar || !anchor || !menu) return;
      const barRect = bar.getBoundingClientRect();
      const { width: mw, height: mh } = menu.getBoundingClientRect();
      const spaceBelow = window.innerHeight - barRect.bottom - MENU_GAP;
      const spaceAbove = barRect.top - MENU_GAP;
      const below = mh <= spaceBelow || spaceBelow >= spaceAbove;
      const top = below ? barRect.bottom + MENU_GAP : Math.max(8, barRect.top - MENU_GAP - mh);
      const left = Math.min(
        Math.max(8, anchor.getBoundingClientRect().left),
        Math.max(8, window.innerWidth - mw - 8),
      );
      setStylePos({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [styleOpen, position?.top, position?.left]);

  // The per-target color popover sits BESIDE the Style menu.
  useLayoutEffect(() => {
    if (!colorFor || !styleOpen) {
      setSubPos(null);
      return;
    }
    const place = () => {
      const menu = styleMenuRef.current;
      const swatch = swatchRefs.current[colorFor];
      const sub = subRef.current;
      if (!menu || !swatch || !sub) return;
      const menuRect = menu.getBoundingClientRect();
      const swatchRect = swatch.getBoundingClientRect();
      const { width: sw, height: sh } = sub.getBoundingClientRect();
      let left = menuRect.right + 4;
      if (left + sw > window.innerWidth - 8) left = Math.max(8, menuRect.left - sw - 4);
      const top = Math.min(
        Math.max(8, swatchRect.top - 12),
        Math.max(8, window.innerHeight - sh - 8),
      );
      setSubPos({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [colorFor, styleOpen, subCustomOpen, stylePos]);

  useEffect(() => {
    if (!styleOpen) setColorFor(null);
  }, [styleOpen]);
  useEffect(() => {
    setSubCustomOpen(false);
  }, [colorFor]);

  useEffect(() => {
    if (!open && !styleOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (layerRef.current?.contains(t)) return;
      if (styleMenuRef.current?.contains(t)) return;
      if (subRef.current?.contains(t)) return;
      setOpen(false);
      setStyleOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Walk back ONE layer, whichever menu is deepest.
      if (previewRef.current) {
        setTurnPreview(null);
        previewShownRef.current = false;
        return;
      }
      if (pathRef.current.length > 0) {
        setTurnPath((p) => p.slice(0, -1));
        setTurnAnchors((a) => a.slice(0, -1));
        return;
      }
      if (colorForRef.current) {
        setColorFor(null);
        return;
      }
      setOpen(false);
      setStyleOpen(false);
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', onDown);
      document.addEventListener('keydown', onKey);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, styleOpen]);

  const enterRow = (item: InsertMenuItem, level: number, rowEl: HTMLElement) => {
    clearTimeout(intentRef.current);
    clearTimeout(previewTimerRef.current);
    const top = rowEl.getBoundingClientRect().top;
    if (item.children?.length) {
      intentRef.current = setTimeout(() => {
        setTurnPreview(null);
        previewShownRef.current = false;
        setTurnPath((p) => [...p.slice(0, level), item.id]);
        setTurnAnchors((a) => [...a.slice(0, level), top]);
      }, TI_HOVER_INTENT_MS);
      return;
    }
    intentRef.current = setTimeout(() => {
      setTurnPath((p) => p.slice(0, level));
      setTurnAnchors((a) => a.slice(0, level));
    }, TI_LEAF_TRIM_MS);
    if (item.preview) {
      previewTimerRef.current = setTimeout(
        () => {
          setTurnPreview({ item, level, top });
          previewShownRef.current = true;
        },
        previewShownRef.current ? TI_PREVIEW_SWAP_MS : TI_PREVIEW_MS,
      );
    } else {
      setTurnPreview(null);
      previewShownRef.current = false;
    }
  };
  const clickRow = (item: InsertMenuItem, level: number, rowEl: HTMLElement) => {
    if (item.children?.length) {
      clearTimeout(intentRef.current);
      setTurnPreview(null);
      previewShownRef.current = false;
      setTurnPath((p) => [...p.slice(0, level), item.id]);
      setTurnAnchors((a) => [...a.slice(0, level), rowEl.getBoundingClientRect().top]);
      return;
    }
    setOpen(false);
    if (item.id !== 'table') onTurnInto?.(item.id);
  };

  const flyouts: InsertMenuItem[][] = [];
  {
    let current = turnIntoItems();
    for (const id of turnPath) {
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
    const isOpenRow = turnPath[level] === item.id;
    const Icon = item.icon;
    const isCurrent = item.id === 'table';
    return (
      <button
        key={item.id}
        type="button"
        role="menuitem"
        aria-haspopup={hasChildren || undefined}
        aria-expanded={hasChildren ? isOpenRow : undefined}
        onMouseEnter={(e) => enterRow(item, level, e.currentTarget)}
        onClick={(e) => clickRow(item, level, e.currentTarget)}
        className={`w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[9px] text-[13px] transition-colors ${
          isOpenRow ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
        }`}
      >
        {Icon && (
          <Icon className="h-[17px] w-[17px] shrink-0 text-white opacity-45" strokeWidth={1.8} aria-hidden />
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
        {isCurrent && <span className="text-white/40 text-[10px]">✓</span>}
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
  const menuStyle: CSSProperties = menuPos ?? { top: 0, left: 0, visibility: 'hidden' };
  const turnLeft = menuPos?.left ?? 0;
  const previewLeft = turnPreview
    ? Math.max(8, Math.min(turnLeft + (turnPreview.level + 1) * TI_COL, window.innerWidth - TI_PREVIEW_W - 8))
    : 0;
  const previewTop = turnPreview
    ? Math.max(8, Math.min(turnPreview.top - 60, window.innerHeight - 268))
    : 0;

  // Anchoring — the FloatingToolbar contract.
  let anchoredStyle: CSSProperties | undefined;
  let flippedBelow = false;
  if (!inline && position) {
    const centerX = position.left + position.width / 2;
    const left = Math.min(
      Math.max(centerX - rootSize.w / 2, 8),
      Math.max(8, window.innerWidth - rootSize.w - 8),
    );
    const above = position.top - GAP - rootSize.h;
    flippedBelow = above < 8;
    const top = flippedBelow ? position.top + (position.height ?? 0) + GAP : above;
    anchoredStyle = { top, left, visibility: rootSize.w ? 'visible' : 'hidden' };
  }
  const entrance = `animate-in fade-in ${flippedBelow ? 'slide-in-from-top-3' : 'slide-in-from-bottom-3'} duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]`;

  const barBtn =
    'flex items-center gap-1 px-2.5 py-1 rounded-[var(--ds-radius-control,8px)] text-[13px] transition-colors';

  const toolbar = (
    <div
      ref={rootRef}
      className={`${inline ? 'relative inline-flex w-max' : 'fixed flex'} z-[60] items-center gap-0.5 bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] px-2 py-1 shadow-2xl border border-white/[0.08] ${entrance}`}
      style={anchoredStyle}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* FAMILY — the rich Turn into, like every toolbar's left name */}
      <button
        ref={anchorRef}
        onClick={() => {
          setStyleOpen(false);
          setOpen((v) => !v);
        }}
        className={`${barBtn} text-white/70 hover:text-white hover:bg-white/10`}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 text-white/30" />
      </button>

      <div className="w-px h-4 bg-white/10 mx-0.5" />

      {/* Colors — header / text / lines */}
      <button
        ref={styleAnchorRef}
        aria-label="Table colors"
        onClick={() => {
          setOpen(false);
          setStyleOpen((v) => !v);
        }}
        className={`${barBtn} px-1.5 ${styleOpen ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
      >
        <TablePaletteGlyph />
        <ChevronDown className="h-3.5 w-3.5 text-white/20" />
      </button>

      <div className="w-px h-4 bg-white/10 mx-0.5" />

      <button onClick={() => onAddRow?.()} className={`${barBtn} px-2 text-white/60 hover:text-white hover:bg-white/10`}>
        <Plus className="h-3.5 w-3.5" /> Row
      </button>
      <button onClick={() => onAddColumn?.()} className={`${barBtn} px-2 text-white/60 hover:text-white hover:bg-white/10`}>
        <Plus className="h-3.5 w-3.5" /> Column
      </button>

      <div className="w-px h-4 bg-white/10 mx-0.5" />

      <button onClick={() => onDuplicate?.()} aria-label="Duplicate table" className="px-1 py-1 rounded-[var(--ds-radius-control,8px)] text-white/25 hover:text-white hover:bg-white/10 transition-colors">
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => onDelete?.()} aria-label="Delete table" className="px-1 py-1 rounded-[var(--ds-radius-control,8px)] text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-colors">
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* ── Turn into layer ─────────────────────────────────────────── */}
      {open &&
        createPortal(
          <div ref={layerRef} data-editor-chrome="true" className="fixed inset-0 z-[70] pointer-events-none">
            <div
              ref={menuRef}
              role="menu"
              aria-label="Turn into"
              style={menuStyle}
              className="pointer-events-auto absolute w-[264px] bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] p-1.5 shadow-2xl max-h-[76vh] overflow-y-auto"
            >
              <div className="px-2.5 pt-1.5 pb-1 text-[12px] text-white/35">Turn into</div>
              {turnIntoItems().map((item) => row(item, 0))}
            </div>
            {flyouts.map((items, i) => (
              <TableTurnFlyout
                key={turnPath[i]}
                left={Math.min(turnLeft + (i + 1) * TI_COL, window.innerWidth - TI_PANEL_W - 8)}
                anchorTop={turnAnchors[i] ?? 0}
              >
                {items.map((item) => row(item, i + 1))}
              </TableTurnFlyout>
            ))}
            {turnPreview?.item.preview && (
              <div
                data-insert-preview="true"
                className="pointer-events-none absolute z-[80] w-[380px] min-h-[240px] rounded-2xl bg-[#0F0F11] text-[#E9E9EB] border border-white/[0.06] shadow-2xl p-5 flex items-center justify-center animate-in fade-in duration-150"
                style={{ left: previewLeft, top: previewTop }}
              >
                {turnPreview.item.preview()}
              </div>
            )}
          </div>,
          document.body,
        )}

      {/* ── Style menu — the table's three inks ───────────────────── */}
      {styleOpen &&
        createPortal(
          <div
            ref={styleMenuRef}
            data-editor-chrome="true"
            style={stylePos ?? { top: 0, left: 0, visibility: 'hidden' }}
            className="fixed w-[240px] bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] shadow-2xl z-[70]"
          >
            <div className="px-3 py-2.5 text-[13px] text-white/80 border-b border-white/[0.06]">
              Colors
            </div>
            {TABLE_COLOR_TARGETS.map(({ key, label: rowLabel }) => (
              <div key={key} className="px-3 py-2 flex items-center justify-between">
                <span className="text-[13px] text-white/50">{rowLabel}</span>
                <button
                  ref={(el) => {
                    swatchRefs.current[key] = el;
                  }}
                  aria-label={rowLabel}
                  onClick={() => setColorFor((prev) => (prev === key ? null : key))}
                  className="w-6 h-6 rounded-[calc(var(--ds-radius-control,8px)/2)] border border-white/20"
                  style={
                    cfg[key]
                      ? { backgroundColor: cfg[key] }
                      : {
                          // '' = inherit — shown as the auto swatch.
                          background:
                            'linear-gradient(135deg, #F5F1E8 0 50%, #1F1B16 50% 100%)',
                        }
                  }
                />
              </div>
            ))}
          </div>,
          document.body,
        )}

      {/* Per-target color popover — presets + the custom wheel */}
      {styleOpen &&
        colorFor &&
        createPortal(
          <div
            ref={subRef}
            data-editor-chrome="true"
            data-workspace="floating-toolbar"
            data-theme="dark"
            style={subPos ?? { top: 0, left: 0, visibility: 'hidden' }}
            className="fixed w-[268px] bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] shadow-2xl z-[70]"
          >
            <div className="px-3 py-2.5 text-[13px] text-white/80 border-b border-white/[0.06]">
              {TABLE_COLOR_TARGETS.find((t) => t.key === colorFor)?.label}
            </div>
            <div className="p-3 flex items-center gap-1.5">
              {colorPresets.map((c) => {
                const active = (cfg[colorFor] || '').toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    aria-label={`Color ${c}`}
                    onClick={() => {
                      patchCfg({ [colorFor]: c });
                      setColorFor(null);
                    }}
                    className={`w-6 h-6 rounded-[calc(var(--ds-radius-control,8px)/2)] border-2 transition-all ${
                      active ? 'border-white scale-110' : 'border-white/10 hover:border-white/30'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
              <span className="flex-1" />
              <button
                aria-label="Custom color"
                onClick={() => setSubCustomOpen((v) => !v)}
                className="w-6 h-6"
              >
                <img src={colorCircleRgb} alt="" className="w-6 h-6" draggable={false} />
              </button>
            </div>
            {/* Auto — back to inheriting the ground's own ink */}
            <button
              onClick={() => {
                patchCfg({ [colorFor]: '' });
                setColorFor(null);
              }}
              className="w-full px-3 py-2 text-left text-[13px] text-white/50 hover:text-white hover:bg-white/5 border-t border-white/[0.06] transition-colors"
            >
              Auto — match the ground
            </button>
            {subCustomOpen && (
              <div className="cp-toolbar-host px-3 pb-3 pt-2 border-t border-white/[0.06]">
                <ColorPickerHSV
                  hex={cfg[colorFor] || '#ffffff'}
                  onChange={pickerChange}
                  onCommit={(hex) => {
                    patchCfg({ [colorFor]: hex });
                    setColorFor(null);
                  }}
                  onCancel={() => setSubCustomOpen(false)}
                  compact
                  commitLabel="Apply"
                />
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );

  return inline ? toolbar : createPortal(toolbar, document.body);
}

/** 1.8px-stroke palette glyph, matching the bar's icon language. */
function TablePaletteGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a9 9 0 1 0 0 18h.8a2.2 2.2 0 0 0 1.6-3.7 2.2 2.2 0 0 1 1.6-3.7H19a2 2 0 0 0 2-2A9 9 0 0 0 12 3Z" />
      <circle cx="7.5" cy="11.5" r="0.4" />
      <circle cx="10.5" cy="7.8" r="0.4" />
      <circle cx="15" cy="7.5" r="0.4" />
    </svg>
  );
}

function TableTurnFlyout({
  left,
  anchorTop,
  children,
}: {
  left: number;
  anchorTop: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setTop(Math.max(8, Math.min(anchorTop - 6, window.innerHeight - el.offsetHeight - 8)));
  }, [anchorTop, children]);
  return (
    <div
      ref={ref}
      role="menu"
      className="pointer-events-auto absolute w-[264px] bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] p-1.5 shadow-2xl max-h-[80vh] overflow-y-auto animate-in fade-in duration-150"
      style={{ left, top: top ?? anchorTop, visibility: top === null ? 'hidden' : undefined }}
    >
      {children}
    </div>
  );
}
