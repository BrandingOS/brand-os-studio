/**
 * ChartToolbar — the floating toolbar for CHART blocks.
 *
 * Same visual + interaction language as FloatingToolbar (the text/image
 * bar): the dark pill bar, menus portaled to document.body 2px under the
 * bar that flip above when space runs out, DS radii, the entrance rising
 * out of the block, click-outside across bar AND menu.
 *
 * Chart-agnostic and CONTROLLED: everything the user touches arrives as a
 * Partial<ChartToolbarConfig> patch through onChange — the host owns the
 * chart data and rendering, so any charts page can mount this directly.
 * The left name comes from `label` and follows the block automatically.
 */
import { useState, useRef, useEffect, useLayoutEffect, useCallback, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ChartColumn,
  ChartBar,
  ChartLine,
  ChartPie,
  Donut,
  Gauge,
  Radar,
  Filter,
  ChartGantt,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Maximize2,
  Copy,
  Trash2,
} from 'lucide-react';
import { ColorPickerHSV } from '@/shared/components/ColorPickerHSV';
import colorCircleRgb from './color-circle-rgb.svg';
import type { InsertMenuItem } from './CanvasToolbar';
import { WIDGET_MENU_SECTION } from './insertMenu';

export type ChartKind =
  | 'column'
  | 'stacked-column'
  | 'bar'
  | 'stacked-bar'
  | 'line'
  | 'pie'
  | 'donut'
  | 'half-donut'
  | 'radar'
  | 'funnel'
  | 'waterfall';

/** Lucide's stacked variants read IDENTICAL to the plain ones at menu
 *  size (owner report 2026-08-22: "the first two are the same choice") —
 *  these draw the segmentation explicitly so the four are four. */
const StackedColumnIcon = (({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M3 21h18" />
    <rect x="6" y="9" width="5" height="9" rx="0.5" />
    <path d="M6 14h5" />
    <rect x="14" y="4" width="5" height="14" rx="0.5" />
    <path d="M14 9h5M14 14h5" />
  </svg>
)) as unknown as typeof ChartColumn;

const StackedBarIcon = (({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M4 3v18" />
    <rect x="6" y="5" width="14" height="5" rx="0.5" />
    <path d="M13 5v5" />
    <rect x="6" y="14" width="9" height="5" rx="0.5" />
    <path d="M10 14v5" />
  </svg>
)) as unknown as typeof ChartColumn;

/** The official Saudi Riyal symbol (owner-supplied artwork, 2026-08-22)
 *  — drawn inline so it inks in currentColor like every other glyph. */
const SaudiRiyalIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 1124.14 1256.39" fill="currentColor" className={className} aria-hidden>
    <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z" />
    <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z" />
  </svg>
);

export const CHART_KINDS: Array<{ kind: ChartKind; label: string; icon: typeof ChartColumn }> = [
  { kind: 'column', label: 'Column chart', icon: ChartColumn },
  { kind: 'stacked-column', label: 'Stacked column chart', icon: StackedColumnIcon },
  { kind: 'bar', label: 'Bar chart', icon: ChartBar },
  { kind: 'stacked-bar', label: 'Stacked bar chart', icon: StackedBarIcon },
  { kind: 'line', label: 'Line chart', icon: ChartLine },
  { kind: 'pie', label: 'Pie chart', icon: ChartPie },
  { kind: 'donut', label: 'Donut chart', icon: Donut },
  { kind: 'half-donut', label: 'Half donut chart', icon: Gauge },
  { kind: 'radar', label: 'Radar chart', icon: Radar },
  { kind: 'funnel', label: 'Funnel chart', icon: Filter },
  { kind: 'waterfall', label: 'Waterfall chart', icon: ChartGantt },
];

/**
 * Which settings exist per chart kind — the Settings menu shows only what
 * the VISIBLE chart actually has (owner request 2026-08-22). Radial charts
 * (pie, donut, half-donut), the radar and the funnel draw no width/length
 * axes and no grid, so those sections never appear for them; their Data
 * rows read "Categories / Values" instead of axis names.
 */
export const CHART_FEATURES: Record<ChartKind, { axes: boolean; grid: boolean }> = {
  column: { axes: true, grid: true },
  'stacked-column': { axes: true, grid: true },
  bar: { axes: true, grid: true },
  'stacked-bar': { axes: true, grid: true },
  line: { axes: true, grid: true },
  pie: { axes: false, grid: false },
  donut: { axes: false, grid: false },
  'half-donut': { axes: false, grid: false },
  radar: { axes: false, grid: false },
  funnel: { axes: false, grid: false },
  waterfall: { axes: true, grid: true },
};

export interface ChartToolbarConfig {
  kind: ChartKind;
  appearance: 'auto' | 'light' | 'dark';
  /** Per-series colors, keyed by series name. */
  seriesColors: Record<string, string>;
  dataLabels: boolean;
  legend: boolean;
  gridLines: boolean;
  hAxisVisible: boolean;
  hAxisLabel: boolean;
  vAxisVisible: boolean;
  vAxisLabels: 'auto' | 'edges';
  /** Empty string = automatic scale end. */
  vAxisEndAt: string;
  abbreviation: 'auto' | 'none';
  /** 'none' shows plain numbers; a symbol ($, €, £, ¥, ₺, ﷼) stamps
   *  every value with it. */
  currency: string;
}

export function defaultChartToolbarConfig(): ChartToolbarConfig {
  return {
    kind: 'column',
    appearance: 'auto',
    seriesColors: {},
    dataLabels: true,
    legend: true,
    gridLines: true,
    hAxisVisible: true,
    hAxisLabel: true,
    vAxisVisible: true,
    vAxisLabels: 'auto',
    vAxisEndAt: '',
    abbreviation: 'auto',
    currency: 'none',
  };
}

export interface ChartToolbarProps {
  /** The name on the far left — follows the selected block automatically. */
  label?: string;
  config: ChartToolbarConfig;
  /** Series names for the Style color rows; defaults to seriesColors keys. */
  series?: string[];
  /** What the Data section displays for each axis. */
  axes?: { horizontal?: string; vertical?: string };
  /** Makes the Data section's axis names EDITABLE in place — the host
   *  renames its label column / first series (owner request 2026-08-22).
   *  Without it the boxes stay read-only. */
  onAxesChange?: (patch: { horizontal?: string; vertical?: string }) => void;
  /** Preset swatches in the per-series color popover — pass the brand's
   *  palette; a neutral default set otherwise. */
  colorPresets?: string[];
  onChange: (patch: Partial<ChartToolbarConfig>) => void;
  /** A pick in the Turn into menu (`family:variant` leaf id) — the host
   *  owns the conversion. `chart:*` picks never arrive here: they are
   *  applied directly as a kind change. */
  onTurnInto?: (id: string) => void;
  onEditData?: () => void;
  onExpand?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  /** Anchor rect (viewport coords) — same contract as FloatingToolbar. */
  position?: { top: number; left: number; width: number; height?: number };
  /** Render in place (component lab) instead of the anchored portal. */
  inline?: boolean;
}

const MENU_GAP = 2;
const GAP = 15;
const DEFAULT_COLOR_PRESETS = ['#F5F1E8', '#B8352C', '#1F1B16', '#000000', '#FFFFFF'];

/** "Turn into" renders the editor's ONE widget vocabulary — the same tree
 *  the CanvasToolbar's Insert menu draws (insertMenu.tsx), with the same
 *  hover-flyout interaction and preview cards. Leaf ids are
 *  `family:variant`; a `chart:*` pick is applied here as a kind change,
 *  everything else goes to the host through onTurnInto. */
// Read at RENDER time, never at module eval: insertMenu ⇄ CardBlocks ⇄ this
// file form an import cycle, and an eval-time read of the not-yet-built
// tree would throw depending on which module loads first.
const turnIntoItems = () => WIDGET_MENU_SECTION.items;
const TI_PANEL_W = 264;
const TI_COL = TI_PANEL_W + 8;
const TI_PREVIEW_W = 380;
const TI_HOVER_INTENT_MS = 90;
const TI_LEAF_TRIM_MS = 200;
const TI_PREVIEW_MS = 180;
const TI_PREVIEW_SWAP_MS = 40;

type MenuId = 'block' | 'type' | 'style' | 'settings';

export function ChartToolbar({
  label = 'Chart',
  config,
  series,
  axes,
  onAxesChange,
  colorPresets = DEFAULT_COLOR_PRESETS,
  onChange,
  onTurnInto,
  onEditData,
  onExpand,
  onDuplicate,
  onDelete,
  position,
  inline,
}: ChartToolbarProps) {
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  /** Accordion: ONE settings section open at a time — opening another
   *  animates the previous one closed. */
  const [openSection, setOpenSection] = useState<string | null>(null);
  /** Series whose color POPOVER (beside the Style menu) is open. */
  const [colorFor, setColorFor] = useState<string | null>(null);
  /** The rainbow swatch expanded the HSV picker inside that popover. */
  const [subCustomOpen, setSubCustomOpen] = useState(false);
  // ── Turn into — the CanvasToolbar interaction: hover flyouts + previews
  const [turnPath, setTurnPath] = useState<string[]>([]);
  const [turnAnchors, setTurnAnchors] = useState<number[]>([]);
  const [turnPreview, setTurnPreview] = useState<{
    item: InsertMenuItem;
    level: number;
    top: number;
  } | null>(null);
  const turnLayerRef = useRef<HTMLDivElement>(null);
  const turnIntentRef = useRef<ReturnType<typeof setTimeout>>();
  const turnPreviewTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const turnPreviewShownRef = useRef(false);
  const turnPathRef = useRef(turnPath);
  turnPathRef.current = turnPath;
  const turnPreviewRef = useRef(turnPreview);
  turnPreviewRef.current = turnPreview;
  // ── Type-menu hover preview — same behavior as the CanvasToolbar:
  // rest on a kind, its artwork card raises beside the menu.
  const [typePreview, setTypePreview] = useState<{ kind: ChartKind; top: number } | null>(null);
  const typePreviewTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const typePreviewShownRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const swatchRefs = useRef<Record<string, HTMLElement | null>>({});
  const [subPos, setSubPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRefs = useRef<Record<string, HTMLElement | null>>({});
  const setAnchor = (id: MenuId) => (el: HTMLElement | null) => {
    anchorRefs.current[id] = el;
  };
  const [rootSize, setRootSize] = useState({ w: 0, h: 0 });
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const seriesNames = series ?? Object.keys(config.seriesColors);

  const toggleMenu = (id: MenuId) => setOpenMenu((prev) => (prev === id ? null : id));
  const toggleSection = (id: string) => setOpenSection((prev) => (prev === id ? null : id));

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

  // Menu placement — identical rules to FloatingToolbar: MENU_GAP below
  // the whole bar, flipped above when the space below cannot fit it,
  // anchored to the button that opened it, clamped to the viewport.
  useLayoutEffect(() => {
    if (!openMenu) {
      setMenuPos(null);
      return;
    }
    const place = () => {
      const bar = rootRef.current;
      const anchor = anchorRefs.current[openMenu];
      const menu = menuRef.current;
      if (!bar || !anchor || !menu) return;
      const barRect = bar.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const { width: mw, height: mh } = menu.getBoundingClientRect();
      const spaceBelow = window.innerHeight - barRect.bottom - MENU_GAP;
      const spaceAbove = barRect.top - MENU_GAP;
      const below = mh <= spaceBelow || spaceBelow >= spaceAbove;
      const top = below ? barRect.bottom + MENU_GAP : Math.max(8, barRect.top - MENU_GAP - mh);
      let left = anchorRect.left;
      left = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - mw - 8));
      setMenuPos({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
    // openSection/colorFor change the menu's height — re-anchor on toggle.
  }, [openMenu, openSection, colorFor, position?.top, position?.left, position?.width]);

  // The per-series color popover sits BESIDE the Style menu, its top near
  // the swatch that opened it; it slides left of the menu when the right
  // side has no room, and clamps vertically.
  useLayoutEffect(() => {
    if (!colorFor || openMenu !== 'style') {
      setSubPos(null);
      return;
    }
    const place = () => {
      const menu = menuRef.current;
      const swatch = swatchRefs.current[colorFor];
      const sub = subMenuRef.current;
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
  }, [colorFor, openMenu, subCustomOpen, menuPos]);

  // Close on outside click / Escape — the menus are body portals, so
  // containment is checked against bar, menu AND the color popover.
  useEffect(() => {
    if (!openMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      if (subMenuRef.current?.contains(t)) return;
      if (turnLayerRef.current?.contains(t)) return;
      setOpenMenu(null);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Escape walks back ONE layer, whatever the deepest one is:
      // preview → flyout → color popover → the menu itself.
      if (turnPreviewRef.current) {
        setTurnPreview(null);
        turnPreviewShownRef.current = false;
        return;
      }
      if (turnPathRef.current.length > 0) {
        setTurnPath((p) => p.slice(0, -1));
        setTurnAnchors((a) => a.slice(0, -1));
        return;
      }
      setColorFor((prev) => {
        if (prev !== null) return null;
        setOpenMenu(null);
        return prev;
      });
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openMenu]);

  // Leaving the Style menu collapses the color popover; switching series
  // (or closing it) collapses the popover's expanded picker.
  useEffect(() => {
    if (openMenu !== 'style') setColorFor(null);
  }, [openMenu]);
  useEffect(() => {
    setSubCustomOpen(false);
  }, [colorFor]);

  // Leaving the type menu clears its hover preview.
  useEffect(() => {
    if (openMenu === 'type') return;
    setTypePreview(null);
    typePreviewShownRef.current = false;
    clearTimeout(typePreviewTimerRef.current);
  }, [openMenu]);

  /** Rest on a kind row → its preview raises after the same intent delay
   *  the CanvasToolbar uses; instant swap while one is already up. */
  const typeEnterRow = (kind: ChartKind, rowEl: HTMLElement) => {
    clearTimeout(typePreviewTimerRef.current);
    const top = rowEl.getBoundingClientRect().top;
    typePreviewTimerRef.current = setTimeout(
      () => {
        setTypePreview({ kind, top });
        typePreviewShownRef.current = true;
      },
      typePreviewShownRef.current ? TI_PREVIEW_SWAP_MS : TI_PREVIEW_MS,
    );
  };

  // Leaving the block menu clears the Turn into chain and its timers.
  useEffect(() => {
    if (openMenu === 'block') return;
    setTurnPath([]);
    setTurnAnchors([]);
    setTurnPreview(null);
    turnPreviewShownRef.current = false;
    clearTimeout(turnIntentRef.current);
    clearTimeout(turnPreviewTimerRef.current);
  }, [openMenu]);
  useEffect(
    () => () => {
      clearTimeout(turnIntentRef.current);
      clearTimeout(turnPreviewTimerRef.current);
    },
    [],
  );

  /** Hover with intent — family rows open their flyout, resting on a leaf
   *  raises its preview; the same numbers as CanvasToolbar. */
  const turnEnterRow = (item: InsertMenuItem, level: number, rowEl: HTMLElement) => {
    clearTimeout(turnIntentRef.current);
    clearTimeout(turnPreviewTimerRef.current);
    const top = rowEl.getBoundingClientRect().top;
    if (item.children?.length) {
      turnIntentRef.current = setTimeout(() => {
        setTurnPreview(null);
        turnPreviewShownRef.current = false;
        setTurnPath((p) => [...p.slice(0, level), item.id]);
        setTurnAnchors((a) => [...a.slice(0, level), top]);
      }, TI_HOVER_INTENT_MS);
      return;
    }
    turnIntentRef.current = setTimeout(() => {
      setTurnPath((p) => p.slice(0, level));
      setTurnAnchors((a) => a.slice(0, level));
    }, TI_LEAF_TRIM_MS);
    if (item.preview) {
      turnPreviewTimerRef.current = setTimeout(
        () => {
          setTurnPreview({ item, level, top });
          turnPreviewShownRef.current = true;
        },
        turnPreviewShownRef.current ? TI_PREVIEW_SWAP_MS : TI_PREVIEW_MS,
      );
    } else {
      setTurnPreview(null);
      turnPreviewShownRef.current = false;
    }
  };

  const turnClickRow = (item: InsertMenuItem, level: number, rowEl: HTMLElement) => {
    if (item.children?.length) {
      clearTimeout(turnIntentRef.current);
      setTurnPreview(null);
      turnPreviewShownRef.current = false;
      setTurnPath((p) => [...p.slice(0, level), item.id]);
      setTurnAnchors((a) => [...a.slice(0, level), rowEl.getBoundingClientRect().top]);
      return;
    }
    setOpenMenu(null);
    if (item.id.startsWith('chart:')) onChange({ kind: item.id.slice(6) as ChartKind });
    else onTurnInto?.(item.id);
  };

  // The HSV picker calls onChange from an effect keyed on the callback's
  // identity — same hazard as FloatingToolbar: a fresh closure per render
  // would loop. Ref-backed stable callback.
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const colorForRef = useRef(colorFor);
  colorForRef.current = colorFor;
  const configRef = useRef(config);
  configRef.current = config;
  const handlePickerChange = useCallback((hex: string) => {
    const name = colorForRef.current;
    if (!name) return;
    changeRef.current({ seriesColors: { ...configRef.current.seriesColors, [name]: hex } });
  }, []);

  // ── Anchoring (non-inline) — same contract as FloatingToolbar ────
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

  const activeKind = CHART_KINDS.find((k) => k.kind === config.kind) ?? CHART_KINDS[0];
  const KindIcon = activeKind.icon;

  const barBtn =
    'flex items-center gap-1 px-2 py-1 rounded-[var(--ds-radius-control,8px)] text-[13px] transition-colors';

  const menuCard =
    'fixed bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] shadow-2xl z-[70]';
  const menuStyle: CSSProperties = menuPos ?? { top: 0, left: 0, visibility: 'hidden' };

  // ── Turn into rendering — same row language as CanvasToolbar ─────
  const turnFlyouts: InsertMenuItem[][] = [];
  {
    let current = turnIntoItems();
    for (const id of turnPath) {
      const found = current.find((i) => i.id === id);
      if (!found?.children?.length) break;
      turnFlyouts.push(found.children);
      current = found.children;
    }
  }
  const turnRow = (item: InsertMenuItem, level: number) => {
    if (item.divider) {
      return <div key={item.id} className="my-1.5 mx-1 border-t border-white/[0.07]" />;
    }
    const hasChildren = Boolean(item.children?.length);
    const isOpenRow = turnPath[level] === item.id;
    const Icon = item.icon;
    const isCurrent = item.id === 'chart' || item.id === `chart:${config.kind}`;
    return (
      <button
        key={item.id}
        type="button"
        role="menuitem"
        aria-haspopup={hasChildren || undefined}
        aria-expanded={hasChildren ? isOpenRow : undefined}
        onMouseEnter={(e) => turnEnterRow(item, level, e.currentTarget)}
        onClick={(e) => turnClickRow(item, level, e.currentTarget)}
        className={`w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[9px] text-[13px] transition-colors ${
          isOpenRow ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
        }`}
      >
        {/* OPAQUE stroke + element opacity: alpha strokes double up where
            a chart icon's lines cross and paint a second tone. */}
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
  // The type menu's preview card — artwork comes from the SAME widget
  // tree the Insert menu draws (chart:* leaves), so both previews are one
  // source of truth.
  const chartFamilyItems = turnIntoItems().find((i) => i.id === 'chart')?.children;
  const typePreviewRender = typePreview
    ? chartFamilyItems?.find((c) => c.id === `chart:${typePreview.kind}`)?.preview
    : undefined;
  const TYPE_MENU_W = 224; // w-56
  const TYPE_PREVIEW_W = 300; // deliberately smaller than the Insert menu's card
  const typePreviewLeft = typePreview
    ? Math.max(8, Math.min((menuPos?.left ?? 0) + TYPE_MENU_W + 8, window.innerWidth - TYPE_PREVIEW_W - 8))
    : 0;
  const typePreviewTop = typePreview
    ? Math.max(8, Math.min(typePreview.top - 60, window.innerHeight - 220))
    : 0;

  const turnLeft = menuPos?.left ?? 0;
  const turnPreviewLeft = turnPreview
    ? Math.max(8, Math.min(turnLeft + (turnPreview.level + 1) * TI_COL, window.innerWidth - TI_PREVIEW_W - 8))
    : 0;
  const turnPreviewTop = turnPreview
    ? Math.max(8, Math.min(turnPreview.top - 60, window.innerHeight - 268))
    : 0;

  const toolbar = (
    <div
      ref={rootRef}
      className={`${inline ? 'relative inline-flex w-max' : 'fixed flex'} z-[60] items-stretch gap-1.5 ${entrance}`}
      style={anchoredStyle}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* The bar */}
      <div className="flex items-center gap-0.5 bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] px-2 py-1 shadow-2xl border border-white/[0.08]">
        {/* Block name — follows the selected block */}
        <button
          ref={setAnchor('block')}
          onClick={() => toggleMenu('block')}
          className={`${barBtn} px-2.5 text-white/70 hover:text-white hover:bg-white/10`}
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5 text-white/30" />
        </button>

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        {/* Chart type */}
        <button
          ref={setAnchor('type')}
          onClick={() => toggleMenu('type')}
          aria-label="Chart type"
          className={`${barBtn} px-1.5 ${openMenu === 'type' ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
        >
          <KindIcon className={`h-4 w-4 text-white ${openMenu === 'type' ? 'opacity-100' : 'opacity-60'}`} />
          <ChevronDown className="h-3.5 w-3.5 text-white/20" />
        </button>

        {/* Style */}
        <button
          ref={setAnchor('style')}
          onClick={() => toggleMenu('style')}
          aria-label="Chart style"
          className={`${barBtn} px-1.5 ${openMenu === 'style' ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
        >
          <PaletteGlyph />
          <ChevronDown className="h-3.5 w-3.5 text-white/20" />
        </button>

        {/* Settings */}
        <button
          ref={setAnchor('settings')}
          onClick={() => toggleMenu('settings')}
          aria-label="Chart settings"
          className={`${barBtn} px-1.5 ${openMenu === 'settings' ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
        >
          <SlidersGlyph />
          <ChevronDown className="h-3.5 w-3.5 text-white/20" />
        </button>

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        {/* Edit data */}
        <button
          onClick={() => onEditData?.()}
          className={`${barBtn} px-2.5 text-white/70 hover:text-white hover:bg-white/10`}
        >
          Edit data
        </button>
      </div>

      {/* Expand — its own little card, like the reference */}
      {onExpand && (
        <button
          onClick={onExpand}
          aria-label="Expand chart"
          // w-10 ≈ the bar's own height, and the card stretches to match
          // it — an EXPLICIT width because aspect-ratio can't transfer
          // from a stretched flex cross-size, which left a tall sliver
          // (owner report 2026-08-22: "I want a square").
          className="flex w-10 items-center justify-center bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] shadow-2xl border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      )}

      {/* ── Block menu — Turn into with the CanvasToolbar interaction:
             hover a family, its flyout opens beside the panel; rest on a
             leaf, its preview card raises. One transparent layer holds
             panel + flyouts + preview so click-outside sees them all. ── */}
      {openMenu === 'block' &&
        createPortal(
          <div
            ref={turnLayerRef}
            data-editor-chrome="true"
            className="fixed inset-0 z-[70] pointer-events-none"
          >
            <div
              ref={menuRef}
              role="menu"
              aria-label="Turn into"
              style={menuStyle}
              className="pointer-events-auto absolute w-[264px] bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] p-1.5 shadow-2xl max-h-[76vh] overflow-y-auto"
            >
              <div className="px-2.5 pt-1.5 pb-1 text-[12px] text-white/35">Turn into</div>
              {turnIntoItems().map((item) => turnRow(item, 0))}
              <div className="my-1.5 mx-1 border-t border-white/[0.07]" />
              <button
                type="button"
                onClick={() => {
                  onDuplicate?.();
                  setOpenMenu(null);
                }}
                className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[9px] text-[13px] text-white/75 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Copy className="h-[17px] w-[17px] shrink-0 text-white opacity-45" strokeWidth={1.8} />
                <span className="flex-1 text-left">Duplicate</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete?.();
                  setOpenMenu(null);
                }}
                className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[9px] text-[13px] text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <Trash2 className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
                <span className="flex-1 text-left">Delete</span>
              </button>
            </div>

            {turnFlyouts.map((items, i) => (
              <TurnFlyout
                key={turnPath[i]}
                left={Math.min(turnLeft + (i + 1) * TI_COL, window.innerWidth - TI_PANEL_W - 8)}
                anchorTop={turnAnchors[i] ?? 0}
              >
                {items.map((item) => turnRow(item, i + 1))}
              </TurnFlyout>
            ))}

            {turnPreview?.item.preview && (
              <div
                data-insert-preview="true"
                className="pointer-events-none absolute z-[80] w-[380px] min-h-[240px] rounded-2xl bg-[#0F0F11] text-[#E9E9EB] border border-white/[0.06] shadow-2xl p-5 flex items-center justify-center animate-in fade-in duration-150"
                style={{ left: turnPreviewLeft, top: turnPreviewTop }}
              >
                {turnPreview.item.preview()}
              </div>
            )}
          </div>,
          document.body,
        )}

      {/* ── Chart type menu — rest on a kind, its artwork raises ────── */}
      {openMenu === 'type' &&
        createPortal(
          <>
            <div
              ref={menuRef}
              data-editor-chrome="true"
              style={menuStyle}
              className={`${menuCard} w-56 py-1 max-h-[70vh] overflow-y-auto`}
              onMouseLeave={() => {
                clearTimeout(typePreviewTimerRef.current);
                setTypePreview(null);
                typePreviewShownRef.current = false;
              }}
            >
              {CHART_KINDS.map((k) => {
                const Icon = k.icon;
                const active = k.kind === config.kind;
                return (
                  <button
                    key={k.kind}
                    role="menuitemradio"
                    aria-checked={active}
                    onMouseEnter={(e) => typeEnterRow(k.kind, e.currentTarget)}
                    onClick={() => {
                      onChange({ kind: k.kind });
                      setOpenMenu(null);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors ${active ? 'text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                  >
                    <Icon className="h-4 w-4 text-white opacity-40" />
                    <span className="flex-1 text-left">{k.label}</span>
                    {active && <span className="text-white/40 text-[10px]">✓</span>}
                  </button>
                );
              })}
            </div>
            {typePreviewRender && (
              <div
                data-insert-preview="true"
                className="pointer-events-none fixed z-[80] w-[300px] min-h-[190px] rounded-2xl bg-[#0F0F11] text-[#E9E9EB] border border-white/[0.06] shadow-2xl p-4 flex items-center justify-center overflow-hidden animate-in fade-in duration-150"
                style={{ left: typePreviewLeft, top: typePreviewTop }}
              >
                {/* The artwork is authored for the Insert menu's larger
                    card — scale it to this one instead of re-drawing it. */}
                <div style={{ transform: 'scale(0.75)' }}>{typePreviewRender()}</div>
              </div>
            )}
          </>,
          document.body,
        )}

      {/* ── Style menu ─────────────────────────────────────────────── */}
      {openMenu === 'style' &&
        createPortal(
          <div
            ref={menuRef}
            data-editor-chrome="true"
            // cp-* (color picker) + ds-* (controls) styles are scoped under
            // [data-workspace]; the menu is a body portal, so it carries the
            // scope itself, pinned dark to match the bar. The attribute
            // VALUE matters: workspace.css exempts it from min-height:100vh.
            data-workspace="floating-toolbar"
            data-theme="dark"
            style={menuStyle}
            className={`${menuCard} w-[282px] max-h-[70vh] overflow-y-auto`}
          >
            <div className="px-3 py-2.5 text-[13px] text-white/80 border-b border-white/[0.06]">Style</div>
            <div className="px-3 pt-2.5 pb-1 text-[12px] text-white/40">Chart appearance</div>
            <div className="px-3 pb-2.5 flex gap-1.5">
              {(
                [
                  { value: 'auto', node: 'Auto' },
                  { value: 'light', node: <Sun className="h-3.5 w-3.5" /> },
                  { value: 'dark', node: <Moon className="h-3.5 w-3.5" /> },
                ] as Array<{ value: ChartToolbarConfig['appearance']; node: ReactNode }>
              ).map((opt) => (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={config.appearance === opt.value}
                  aria-label={`Appearance ${opt.value}`}
                  onClick={() => onChange({ appearance: opt.value })}
                  className={`flex-1 flex items-center justify-center py-1.5 text-[13px] rounded-[var(--ds-radius-control,8px)] border transition-colors ${
                    config.appearance === opt.value
                      ? 'text-white border-white/40 bg-white/5'
                      : 'text-white/50 border-white/10 hover:text-white hover:border-white/25'
                  }`}
                >
                  {opt.node}
                </button>
              ))}
            </div>
            {seriesNames.length > 0 && <div className="border-t border-white/[0.06]" />}
            {seriesNames.map((name) => (
              <div key={name} className="px-3 py-2 flex items-center justify-between">
                <span className="text-[13px] text-white/50">{name} color</span>
                <button
                  ref={(el) => {
                    swatchRefs.current[name] = el;
                  }}
                  aria-label={`${name} color`}
                  onClick={() => setColorFor((prev) => (prev === name ? null : name))}
                  className="w-6 h-6 rounded-[calc(var(--ds-radius-control,8px)/2)] border border-white/20"
                  style={{ backgroundColor: config.seriesColors[name] || '#ffffff' }}
                />
              </div>
            ))}
          </div>,
          document.body,
        )}

      {/* ── Per-series color popover — beside the Style menu ──────── */}
      {openMenu === 'style' &&
        colorFor &&
        createPortal(
          <div
            ref={subMenuRef}
            data-editor-chrome="true"
            data-workspace="floating-toolbar"
            data-theme="dark"
            style={subPos ?? { top: 0, left: 0, visibility: 'hidden' }}
            className={`${menuCard} w-[268px]`}
          >
            <div className="px-3 py-2.5 text-[13px] text-white/80 border-b border-white/[0.06]">
              {colorFor}
            </div>
            <div className="p-3 flex items-center gap-1.5">
              {colorPresets.map((c) => {
                const active =
                  (config.seriesColors[colorFor] || '').toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    aria-label={`Color ${c}`}
                    onClick={() => {
                      onChange({ seriesColors: { ...config.seriesColors, [colorFor]: c } });
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
            {subCustomOpen && (
              <div className="cp-toolbar-host px-3 pb-3 pt-2 border-t border-white/[0.06]">
                <ColorPickerHSV
                  hex={config.seriesColors[colorFor] || '#ffffff'}
                  onChange={handlePickerChange}
                  onCommit={(hex) => {
                    onChange({ seriesColors: { ...config.seriesColors, [colorFor]: hex } });
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

      {/* ── Settings menu ──────────────────────────────────────────── */}
      {openMenu === 'settings' &&
        createPortal(
          <div
            ref={menuRef}
            data-editor-chrome="true"
            data-workspace="floating-toolbar"
            data-theme="dark"
            style={menuStyle}
            className={`${menuCard} w-[300px] max-h-[70vh] overflow-y-auto`}
          >
            <div className="px-3 py-2.5 text-[13px] text-white/80">Settings</div>

            {/* Data — a collapsible like the sections below it (owner
                request 2026-08-22); axis names only where the chart HAS
                axes. */}
            <Collapsible id="data" label="Data" open={openSection} onToggle={toggleSection}>
            <div className="px-3 pt-1 text-[12px] text-white/40">
              {CHART_FEATURES[config.kind].axes ? 'Horizontal axis' : 'Categories'}
            </div>
            {onAxesChange ? (
              <input
                aria-label="Horizontal axis name"
                value={axes?.horizontal ?? ''}
                onChange={(e) => onAxesChange({ horizontal: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                }}
                className="mx-3 mt-1 block w-[calc(100%-24px)] px-3 py-2 rounded-[var(--ds-radius-control,8px)] bg-white/[0.06] border border-transparent text-[13px] text-white/80 outline-none focus:border-white/25"
              />
            ) : (
              <div className="mx-3 mt-1 px-3 py-2 rounded-[var(--ds-radius-control,8px)] bg-white/[0.06] text-[13px] text-white/80">
                {axes?.horizontal ?? '—'}
              </div>
            )}
            <div className="px-3 pt-2.5 text-[12px] text-white/40">
              {CHART_FEATURES[config.kind].axes ? 'Vertical axis' : 'Values'}
            </div>
            {onAxesChange ? (
              <input
                aria-label="Vertical axis name"
                value={axes?.vertical ?? ''}
                onChange={(e) => onAxesChange({ vertical: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                }}
                className="mx-3 mt-1 mb-3 block w-[calc(100%-24px)] px-3 py-2 rounded-[var(--ds-radius-control,8px)] bg-white/[0.06] border border-transparent text-[13px] text-white/80 outline-none focus:border-white/25"
              />
            ) : (
              <div className="mx-3 mt-1 mb-3 px-3 py-2 rounded-[var(--ds-radius-control,8px)] bg-white/[0.06] text-[13px] text-white/80">
                {axes?.vertical ?? '—'}
              </div>
            )}
            </Collapsible>

            <Collapsible id="general" label="General" open={openSection} onToggle={toggleSection}>
              <SettingRow label="Data labels">
                <ChartSwitch checked={config.dataLabels} onChange={(v) => onChange({ dataLabels: v })} label="Data labels" />
              </SettingRow>
              <SettingRow label="Legend">
                <ChartSwitch checked={config.legend} onChange={(v) => onChange({ legend: v })} label="Legend" />
              </SettingRow>
              {CHART_FEATURES[config.kind].grid && (
                <SettingRow label="Grid lines">
                  <ChartSwitch checked={config.gridLines} onChange={(v) => onChange({ gridLines: v })} label="Grid lines" />
                </SettingRow>
              )}
            </Collapsible>

            {CHART_FEATURES[config.kind].axes && (
              <>
                <Collapsible id="h-axis" label="Horizontal axis" open={openSection} onToggle={toggleSection}>
                  <SettingRow label="Visible">
                    <ChartSwitch checked={config.hAxisVisible} onChange={(v) => onChange({ hAxisVisible: v })} label="Horizontal axis visible" />
                  </SettingRow>
                  <SettingRow label="Axis label">
                    <ChartSwitch checked={config.hAxisLabel} onChange={(v) => onChange({ hAxisLabel: v })} label="Horizontal axis label" />
                  </SettingRow>
                </Collapsible>

                <Collapsible id="v-axis" label="Vertical axis" open={openSection} onToggle={toggleSection}>
                  <SettingRow label="Visible">
                    <ChartSwitch checked={config.vAxisVisible} onChange={(v) => onChange({ vAxisVisible: v })} label="Vertical axis visible" />
                  </SettingRow>
                  <SettingRow label="Labels">
                    <PairButtons
                      value={config.vAxisLabels}
                      options={[
                        { value: 'auto', label: 'Auto' },
                        { value: 'edges', label: 'Edges' },
                      ]}
                      onChange={(v) => onChange({ vAxisLabels: v as 'auto' | 'edges' })}
                    />
                  </SettingRow>
                  <SettingRow label="End at">
                    <span className="flex items-center gap-1.5">
                      <input
                        value={config.vAxisEndAt}
                        inputMode="numeric"
                        placeholder="Auto"
                        aria-label="Vertical axis end"
                        onChange={(e) => onChange({ vAxisEndAt: e.target.value })}
                        className="w-20 px-2.5 py-1.5 rounded-[var(--ds-radius-control,8px)] bg-white/[0.06] border border-white/10 text-[13px] text-white/80 outline-none focus:border-white/30"
                      />
                      <button
                        onClick={() => onChange({ vAxisEndAt: '' })}
                        disabled={config.vAxisEndAt === ''}
                        className="px-2.5 py-1.5 text-[13px] rounded-[var(--ds-radius-control,8px)] border border-white/10 text-white/50 hover:text-white hover:border-white/25 disabled:opacity-40 disabled:hover:text-white/50 disabled:hover:border-white/10 transition-colors"
                      >
                        Reset
                      </button>
                    </span>
                  </SettingRow>
                </Collapsible>
              </>
            )}

            {/* Currency — second-to-last by owner request (2026-08-22);
                stamps every value, ✕ shows plain numbers. */}
            <Collapsible id="currency" label="Currency" open={openSection} onToggle={toggleSection}>
              <div className="mx-3 mt-1 mb-2">
                <PairButtons
                  square
                  value={config.currency}
                  options={[
                    { value: 'none', label: '✕' },
                    { value: '$', label: '$' },
                    { value: '€', label: '€' },
                    { value: '£', label: '£' },
                    { value: '¥', label: '¥' },
                    { value: '₺', label: '₺' },
                    {
                      value: '﷼',
                      label: 'Saudi riyal',
                      icon: <SaudiRiyalIcon className="h-3.5 w-3.5" />,
                    },
                  ]}
                  onChange={(v) => onChange({ currency: v })}
                />
              </div>
            </Collapsible>

            <Collapsible id="numbers" label="Numbers" open={openSection} onToggle={toggleSection}>
              <SettingRow label="Abbreviation">
                <PairButtons
                  value={config.abbreviation}
                  options={[
                    { value: 'auto', label: 'Auto' },
                    { value: 'none', label: 'None' },
                  ]}
                  onChange={(v) => onChange({ abbreviation: v as 'auto' | 'none' })}
                />
              </SettingRow>
            </Collapsible>
          </div>,
          document.body,
        )}
    </div>
  );

  return inline ? toolbar : createPortal(toolbar, document.body);
}

/* ── Menu building blocks ─────────────────────────────────────────── */

/** One Turn-into flyout: top-aligned to its trigger row, clamped to the
 *  viewport. Height is only known after render, so it places itself in a
 *  layout effect and stays invisible until it has (CanvasToolbar's rule). */
function TurnFlyout({
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

/** Accordion section. The body stays mounted and animates open/closed via
 *  the grid-template-rows 0fr→1fr trick — pure CSS, measures nothing, so
 *  opening one section while another closes runs both transitions
 *  together with no jump. DS easing, medium tier. */
function Collapsible({
  id,
  label,
  open,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  open: string | null;
  onToggle: (id: string) => void;
  children: ReactNode;
}) {
  const isOpen = open === id;
  return (
    <div className="border-t border-white/[0.06]">
      <button
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-white/80 hover:bg-white/5 transition-colors"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 text-white/30 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? 'rotate-90' : ''}`}
        />
        {label}
      </button>
      {/* Height eases over the DS large tier while the content itself
          fades and settles a couple px — the fade hides the clip line, so
          open/close reads as one soft motion instead of a shutter. */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 340ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div style={{ minHeight: 0, overflow: 'hidden' }}>
          <div
            className="pb-1.5"
            style={{
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? 'translateY(0)' : 'translateY(-4px)',
              transition:
                'opacity 260ms cubic-bezier(0.22,1,0.36,1), transform 340ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The bar's own switch — DsSwitch renders a visible label beside the
 *  control (the row already names it) and wears the DS's cream palette;
 *  this one speaks the dark bar's language: OFF a dim track with a white
 *  knob, ON a white track with a charcoal knob, knob easing across. */
function ChartSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
        checked ? 'bg-white' : 'bg-white/15 hover:bg-white/25'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          checked ? 'translate-x-4 bg-[#2a2a2a]' : 'translate-x-0 bg-white'
        }`}
      />
    </button>
  );
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-3 py-1.5 flex items-center justify-between gap-3">
      <span className="text-[13px] text-white/50">{label}</span>
      {children}
    </div>
  );
}

function PairButtons({
  value,
  options,
  onChange,
  square,
}: {
  value: string;
  options: Array<{ value: string; label: string; icon?: ReactNode }>;
  onChange: (value: string) => void;
  /** Uniform square cells (single glyphs, one row) — the currency row. */
  square?: boolean;
}) {
  return (
    <span className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((opt) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          aria-label={opt.icon ? opt.label : undefined}
          onClick={() => onChange(opt.value)}
          className={`${
            square ? 'w-8 h-8 p-0 flex items-center justify-center' : 'px-3 py-1.5'
          } text-[13px] rounded-[var(--ds-radius-control,8px)] border transition-colors ${
            value === opt.value
              ? 'text-white border-white/40 bg-white/5'
              : 'text-white/50 border-white/10 hover:text-white hover:border-white/25'
          }`}
        >
          {opt.icon ?? opt.label}
        </button>
      ))}
    </span>
  );
}

/* 1.8px-stroke line glyphs, matching the bar's icon language, for the two
   controls lucide has no close match for at this size. */
function PaletteGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a9 9 0 1 0 0 18h.8a2.2 2.2 0 0 0 1.6-3.7 2.2 2.2 0 0 1 1.6-3.7H19a2 2 0 0 0 2-2A9 9 0 0 0 12 3Z" />
      <circle cx="7.5" cy="11.5" r="0.4" />
      <circle cx="10.5" cy="7.8" r="0.4" />
      <circle cx="15" cy="7.5" r="0.4" />
    </svg>
  );
}

function SlidersGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 8h5M13 8h7M4 16h9M17 16h3" />
      <circle cx="11" cy="8" r="2" />
      <circle cx="15" cy="16" r="2" />
    </svg>
  );
}
