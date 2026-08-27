/**
 * CardToolbar — the floating toolbar for CARD blocks, plus the icon
 * library popover a card's icon adornment opens.
 *
 * Same visual + interaction language as ChartToolbar / FloatingToolbar:
 * the dark pill bar, menus portaled to document.body 2px under the bar
 * that flip above when space runs out, DS radii, click-outside across
 * bar AND menu, Escape walks back one layer.
 *
 * Card-agnostic and CONTROLLED: everything arrives as a
 * Partial<CardToolbarConfig> patch through onChange — the host owns the
 * card content and rendering (CardBlocks.tsx in the lab).
 */
import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Ban,
  ChevronDown,
  ChevronRight,
  Copy,
  Gauge,
  Highlighter,
  Image as ImageGlyph,
  Maximize2,
  MoreHorizontal,
  RectangleHorizontal,
  RectangleVertical,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ColorPickerHSV } from '@/shared/components/ColorPickerHSV';
import { GOOGLE_FONTS } from '@/shared/design-system/googleFonts';
import { loadFontFamily } from '@/shared/design-system/fonts';
import colorCircleRgb from './color-circle-rgb.svg';
import { ICON_LIBRARY, EMOJI_SET, iconByName } from './iconLibrary';
import type { InsertMenuItem } from './CanvasToolbar';
import { WIDGET_MENU_SECTION } from './insertMenu';

/** Turn into is the SAME rich widget menu every toolbar opens (the
 *  CanvasToolbar interaction) — one vocabulary tree, hover flyouts,
 *  preview cards, same timing numbers. A `card:*` pick is applied here
 *  as a kind change; everything else goes to the host via onTurnInto. */
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

export type CardKind = 'vertical' | 'image' | 'metric' | 'horizontal';
export type CardAdornment = 'none' | 'icon' | 'number';
export type CardCorners = 'none' | 'sm' | 'md' | 'lg';

/** What each corner choice means in px (at scale 1). */
export const CARD_CORNER_RADIUS: Record<CardCorners, number> = {
  none: 0,
  sm: 6,
  md: 14,
  lg: 26,
};

export const CARD_KINDS: Array<{ kind: CardKind; label: string; icon: typeof RectangleVertical }> = [
  { kind: 'vertical', label: 'Vertical card', icon: RectangleVertical },
  { kind: 'image', label: 'Image card', icon: ImageGlyph },
  { kind: 'metric', label: 'Metric card', icon: Gauge },
  { kind: 'horizontal', label: 'Horizontal card', icon: RectangleHorizontal },
];

/** The reference's size ladder (owner screenshot 2026-08-22) — presets
 *  named like type tiers, plus a free number typed at the bottom for
 *  anything between them. */
export const CARD_SIZE_PRESETS = [
  { id: 'xs', label: 'Extra small', px: 12 },
  { id: 'sm', label: 'Small', px: 14 },
  { id: 'md', label: 'Medium', px: 16 },
  { id: 'lg', label: 'Large', px: 20 },
  { id: 'xl', label: 'Extra large', px: 24 },
  { id: 'display', label: 'Display', px: 32 },
  { id: 'huge', label: 'Huge', px: 44 },
] as const;

/** The weights a hovered font offers (reference flyout). */
export const CARD_FONT_WEIGHTS = [
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
] as const;

export interface CardToolbarConfig {
  kind: CardKind;
  /** Base text size in px — presets map onto it, custom numbers allowed. */
  fontSize: number;
  /** The style menu's SECOND option (the first, Orientation, was cut by
   *  owner decision 2026-08-22): nothing, a fitting icon, or a number
   *  label pill. */
  adornment: CardAdornment;
  /** The number pill's text — freely editable (owner request). */
  numberLabel: string;
  /** Lucide icon name, or `emoji:<char>` from the Emoji tab. */
  iconName: string;
  iconColor: string;
  /** Extra size 0–100% from the library's slider. */
  iconScale: number;
  /** '' inherits the surface's own face. */
  fontFamily: string;
  fontWeight: string;
  textColor: string;
  align: 'left' | 'center' | 'right';
  /** '' = no highlight. */
  highlight: string;
  background: string;
  corners: CardCorners;
}

export function defaultCardToolbarConfig(): CardToolbarConfig {
  return {
    kind: 'vertical',
    fontSize: 16,
    adornment: 'none',
    numberLabel: '01',
    iconName: 'Sparkles',
    iconColor: '#FFFFFF',
    iconScale: 0,
    fontFamily: '',
    fontWeight: '400',
    textColor: '#E9E9EB',
    align: 'left',
    highlight: '',
    background: '#20241F',
    corners: 'md',
  };
}

export interface CardToolbarProps {
  label?: string;
  config: CardToolbarConfig;
  colorPresets?: string[];
  onChange: (patch: Partial<CardToolbarConfig>) => void;
  onTurnInto?: (id: string) => void;
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
const DEFAULT_COLOR_PRESETS = ['#F5F1E8', '#B8352C', '#20241F', '#000000', '#FFFFFF'];
const HIGHLIGHT_PRESETS = ['#FDF3B4', '#FFD9C7', '#D8F0D3', '#D6E6FA', '#F3D9F5'];
/** How many fonts the list shows for one query — the search narrows it. */
const FONT_LIST_CAP = 60;
const FONT_HOVER_INTENT_MS = 120;

type MenuId =
  | 'block'
  | 'size'
  | 'style'
  | 'fonts'
  | 'color'
  | 'align'
  | 'highlight'
  | 'background'
  | 'more';

const ALIGN_ICONS = { left: AlignLeft, center: AlignCenter, right: AlignRight } as const;

export function CardToolbar({
  label = 'Card',
  config,
  colorPresets = DEFAULT_COLOR_PRESETS,
  onChange,
  onTurnInto,
  onExpand,
  onDuplicate,
  onDelete,
  position,
  inline,
}: CardToolbarProps) {
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [sizeDraft, setSizeDraft] = useState<string | null>(null);
  const [fontQuery, setFontQuery] = useState('');
  /** The font whose weights flyout is open (hover intent). */
  const [weightsFor, setWeightsFor] = useState<string | null>(null);
  const [weightsTop, setWeightsTop] = useState(0);
  const weightsIntentRef = useRef<ReturnType<typeof setTimeout>>();

  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const anchorRefs = useRef<Record<string, HTMLElement | null>>({});
  const setAnchor = (id: MenuId) => (el: HTMLElement | null) => {
    anchorRefs.current[id] = el;
  };
  const [rootSize, setRootSize] = useState({ w: 0, h: 0 });
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [subPos, setSubPos] = useState<{ top: number; left: number } | null>(null);

  const toggleMenu = (id: MenuId) => setOpenMenu((prev) => (prev === id ? null : id));

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

  // Menu placement — ChartToolbar's rules verbatim.
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
  }, [openMenu, customOpen, position?.top, position?.left, position?.width]);

  // The weights flyout sits BESIDE the fonts menu, top near its row.
  useLayoutEffect(() => {
    if (!weightsFor || openMenu !== 'fonts') {
      setSubPos(null);
      return;
    }
    const place = () => {
      const menu = menuRef.current;
      const sub = subMenuRef.current;
      if (!menu || !sub) return;
      const menuRect = menu.getBoundingClientRect();
      const { width: sw, height: sh } = sub.getBoundingClientRect();
      let left = menuRect.right + 4;
      if (left + sw > window.innerWidth - 8) left = Math.max(8, menuRect.left - sw - 4);
      const top = Math.min(Math.max(8, weightsTop - 6), Math.max(8, window.innerHeight - sh - 8));
      setSubPos({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [weightsFor, weightsTop, openMenu]);

  // ── Turn into — flyout chain, anchors, hover preview ─────────────
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
    if (item.id.startsWith('card:')) {
      onChange({ kind: item.id.slice(5) as CardToolbarConfig['kind'] });
    } else {
      onTurnInto?.(item.id);
    }
  };

  // Close on outside click / Escape — one layer at a time.
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
      // Walk back ONE layer, whatever the deepest one is.
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
      if (weightsFor) {
        setWeightsFor(null);
        return;
      }
      if (customOpen) {
        setCustomOpen(false);
        return;
      }
      setOpenMenu(null);
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
  }, [openMenu, weightsFor, customOpen]);

  useEffect(() => {
    setCustomOpen(false);
    setWeightsFor(null);
    setSizeDraft(null);
    clearTimeout(weightsIntentRef.current);
  }, [openMenu]);
  useEffect(() => () => clearTimeout(weightsIntentRef.current), []);

  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const customTargetRef = useRef<'color' | 'background' | 'highlight'>('color');
  const handlePickerChange = useCallback((hex: string) => {
    const key =
      customTargetRef.current === 'color'
        ? 'textColor'
        : customTargetRef.current === 'background'
          ? 'background'
          : 'highlight';
    changeRef.current({ [key]: hex } as Partial<CardToolbarConfig>);
  }, []);

  // ── Anchoring (non-inline) — FloatingToolbar's contract ──────────
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

  const sizePreset = CARD_SIZE_PRESETS.find((p) => p.px === config.fontSize);
  const sizeLabel = sizePreset ? sizePreset.label : `${config.fontSize}px`;
  const AlignIcon = ALIGN_ICONS[config.align] ?? AlignLeft;

  const barBtn =
    'flex items-center gap-1 px-2 py-1 rounded-[var(--ds-radius-control,8px)] text-[13px] transition-colors';
  const menuCard =
    'fixed bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] shadow-2xl z-[70]';
  const menuStyle: CSSProperties = menuPos ?? { top: 0, left: 0, visibility: 'hidden' };

  // ── Turn into rendering — the CanvasToolbar row language ──────────
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
    const isCurrent = item.id === 'card' || item.id === `card:${config.kind}`;
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
  const turnLeft = menuPos?.left ?? 0;
  const turnPreviewLeft = turnPreview
    ? Math.max(8, Math.min(turnLeft + (turnPreview.level + 1) * TI_COL, window.innerWidth - TI_PREVIEW_W - 8))
    : 0;
  const turnPreviewTop = turnPreview
    ? Math.max(8, Math.min(turnPreview.top - 60, window.innerHeight - 268))
    : 0;

  const fontMatches = (() => {
    const q = fontQuery.trim().toLowerCase();
    const all = q ? GOOGLE_FONTS.filter((f) => f.toLowerCase().includes(q)) : GOOGLE_FONTS;
    return { list: all.slice(0, FONT_LIST_CAP), total: all.length };
  })();

  const applyFont = (family: string, weight?: string) => {
    if (family) loadFontFamily(family, [400, 500, 600, 700]);
    onChange(weight ? { fontFamily: family, fontWeight: weight } : { fontFamily: family });
  };

  const commitCustomSize = () => {
    const n = Math.round(Number(sizeDraft));
    if (Number.isFinite(n) && n >= 6 && n <= 400) onChange({ fontSize: n });
    setSizeDraft(null);
    setOpenMenu(null);
  };

  const swatchBtn = (
    id: 'color' | 'highlight' | 'background',
    value: string,
    presets: string[],
    title: string,
    allowNone?: boolean,
  ) =>
    openMenu === id &&
    createPortal(
      <div
        ref={menuRef}
        data-editor-chrome="true"
        data-workspace="floating-toolbar"
        data-theme="dark"
        style={menuStyle}
        className={`${menuCard} w-[282px] p-2`}
      >
        <div className="px-1 pb-1.5 text-[12px] text-white/40">{title}</div>
        <div className="flex gap-1.5 mb-1.5 flex-wrap">
          {allowNone && (
            <button
              aria-label={`${title} none`}
              onClick={() => {
                onChange({ [id === 'color' ? 'textColor' : id]: '' } as Partial<CardToolbarConfig>);
                setOpenMenu(null);
              }}
              className={`w-6 h-6 rounded-[calc(var(--ds-radius-control,8px)/2)] border-2 flex items-center justify-center transition-all ${
                value === '' ? 'border-white scale-110' : 'border-white/10 hover:border-white/30'
              }`}
            >
              <Ban className="h-3.5 w-3.5 text-white/50" />
            </button>
          )}
          {presets.map((c) => (
            <button
              key={c}
              aria-label={`${title} ${c}`}
              onClick={() => {
                onChange({ [id === 'color' ? 'textColor' : id]: c } as Partial<CardToolbarConfig>);
                setOpenMenu(null);
              }}
              className={`w-6 h-6 rounded-[calc(var(--ds-radius-control,8px)/2)] border-2 transition-all ${
                value.toLowerCase() === c.toLowerCase()
                  ? 'border-white scale-110'
                  : 'border-white/10 hover:border-white/30'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        {customOpen ? (
          <div className="cp-toolbar-host pt-1.5 border-t border-white/[0.06]">
            <ColorPickerHSV
              hex={value || '#ffffff'}
              onChange={handlePickerChange}
              onCommit={(hex) => {
                onChange({ [id === 'color' ? 'textColor' : id]: hex } as Partial<CardToolbarConfig>);
                setOpenMenu(null);
              }}
              onCancel={() => setCustomOpen(false)}
              compact
              commitLabel="Apply"
            />
          </div>
        ) : (
          <button
            onClick={() => {
              customTargetRef.current = id;
              setCustomOpen(true);
            }}
            className="w-full flex items-center gap-1.5 pt-1 border-t border-white/[0.06] text-[10px] text-white/30 hover:text-white/70 transition-colors"
          >
            <img src={colorCircleRgb} alt="" className="w-6 h-6" draggable={false} />
            Custom
          </button>
        )}
      </div>,
      document.body,
    );

  const toolbar = (
    <div
      ref={rootRef}
      className={`${inline ? 'relative inline-flex w-max' : 'fixed flex'} z-[60] items-stretch gap-1.5 ${entrance}`}
      style={anchoredStyle}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5 bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] px-2 py-1 shadow-2xl border border-white/[0.08]">
        {/* Block name */}
        <button
          ref={setAnchor('block')}
          onClick={() => toggleMenu('block')}
          className={`${barBtn} px-2.5 text-white/70 hover:text-white hover:bg-white/10`}
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5 text-white/30" />
        </button>

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        {/* Size */}
        <button
          ref={setAnchor('size')}
          onClick={() => toggleMenu('size')}
          aria-label="Card size"
          className={`${barBtn} px-2 ${openMenu === 'size' ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
        >
          {sizeLabel}
          <ChevronDown className="h-3.5 w-3.5 text-white/20" />
        </button>

        {/* Style */}
        <button
          ref={setAnchor('style')}
          onClick={() => toggleMenu('style')}
          aria-label="Card style"
          className={`${barBtn} px-1.5 ${openMenu === 'style' ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
        >
          <PaletteGlyph />
          <ChevronDown className="h-3.5 w-3.5 text-white/20" />
        </button>

        {/* Fonts */}
        <button
          ref={setAnchor('fonts')}
          onClick={() => toggleMenu('fonts')}
          aria-label="Card fonts"
          className={`${barBtn} px-1.5 ${openMenu === 'fonts' ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
        >
          <span className="text-[13px]">Aa</span>
          <ChevronDown className="h-3.5 w-3.5 text-white/20" />
        </button>

        {/* Text color */}
        <button
          ref={setAnchor('color')}
          onClick={() => toggleMenu('color')}
          aria-label="Text color"
          className={`${barBtn} px-1.5 hover:bg-white/10`}
        >
          <span
            className="w-4 h-4 rounded-[calc(var(--ds-radius-control,8px)/2)] border border-white/20"
            style={{ backgroundColor: config.textColor || '#ffffff' }}
          />
          <ChevronDown className="h-3.5 w-3.5 text-white/20" />
        </button>

        {/* Align */}
        <button
          ref={setAnchor('align')}
          onClick={() => toggleMenu('align')}
          aria-label="Text align"
          className={`${barBtn} px-1.5 ${openMenu === 'align' ? 'text-white bg-white/10' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
        >
          <AlignIcon className="h-3.5 w-3.5" />
          <ChevronDown className="h-3.5 w-3.5 text-white/20" />
        </button>

        {/* Highlight */}
        <button
          ref={setAnchor('highlight')}
          onClick={() => toggleMenu('highlight')}
          aria-label="Text highlight"
          className={`${barBtn} px-1.5 ${openMenu === 'highlight' ? 'text-white bg-white/10' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
        >
          <Highlighter className="h-3.5 w-3.5" />
          <ChevronDown className="h-3.5 w-3.5 text-white/20" />
        </button>

        {/* Card background */}
        <button
          ref={setAnchor('background')}
          onClick={() => toggleMenu('background')}
          aria-label="Card background"
          className={`${barBtn} px-1.5 ${openMenu === 'background' ? 'text-white bg-white/10' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
        >
          <FrameGlyph />
          <ChevronDown className="h-3.5 w-3.5 text-white/20" />
        </button>

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        <button
          ref={setAnchor('more')}
          onClick={() => toggleMenu('more')}
          aria-label="More card actions"
          className="px-1 py-1 rounded-[var(--ds-radius-control,8px)] text-white/25 hover:text-white hover:bg-white/10 transition-colors"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expand — its own square card, like the reference */}
      {onExpand && (
        <button
          onClick={onExpand}
          aria-label="Expand card"
          className="flex w-10 items-center justify-center bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] shadow-2xl border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      )}

      {/* ── Block menu — the ONE rich Turn into every toolbar opens:
             hover a family → its flyout; rest on a leaf → its preview.
             The Card family's flyout replaces the old "Card type" list —
             a card:* pick lands as a kind change, in place. ──────────── */}
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

      {/* ── Size menu — presets + free number (reference #56) ─────── */}
      {openMenu === 'size' &&
        createPortal(
          <div
            ref={menuRef}
            data-editor-chrome="true"
            style={menuStyle}
            className={`${menuCard} w-52 py-1.5`}
          >
            {CARD_SIZE_PRESETS.map((p) => {
              const active = !sizeDraft && p.px === config.fontSize;
              return (
                <button
                  key={p.id}
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    onChange({ fontSize: p.px });
                    setOpenMenu(null);
                  }}
                  className={`w-full flex items-center px-3.5 py-2 text-[14px] transition-colors ${active ? 'text-white' : 'text-white/55 hover:text-white hover:bg-white/5'}`}
                >
                  <span className="flex-1 text-left">{p.label}</span>
                  {active && <span className="text-white/40 text-[11px]">✓</span>}
                </button>
              );
            })}
            {/* The free number — anything between the presets. */}
            <div className="px-2.5 pt-2 pb-1">
              <input
                aria-label="Custom size"
                inputMode="numeric"
                value={sizeDraft ?? String(config.fontSize)}
                onFocus={(e) => {
                  setSizeDraft(String(config.fontSize));
                  e.currentTarget.select();
                }}
                onChange={(e) => setSizeDraft(e.target.value.replace(/[^\d]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitCustomSize();
                  if (e.key === 'Escape') {
                    setSizeDraft(null);
                    setOpenMenu(null);
                  }
                }}
                onBlur={() => {
                  if (sizeDraft !== null) commitCustomSize();
                }}
                className="w-full px-3 py-2 rounded-[var(--ds-radius-control,8px)] bg-white/[0.06] border border-white/25 text-[14px] text-white outline-none focus:border-white/50"
              />
            </div>
          </div>,
          document.body,
        )}

      {/* ── Style menu — Adornment (none · icon · number) ─────────── */}
      {openMenu === 'style' &&
        createPortal(
          <div
            ref={menuRef}
            data-editor-chrome="true"
            style={menuStyle}
            className={`${menuCard} w-[272px]`}
          >
            <div className="px-3 py-2.5 text-[13px] text-white/80 border-b border-white/[0.06]">
              Style
            </div>
            <div className="px-3 pt-2.5 pb-1 text-[12px] text-white/40">Adornment</div>
            <div className="px-3 pb-3 flex gap-1.5" role="radiogroup" aria-label="Adornment">
              {(
                [
                  { value: 'none', label: 'No adornment', node: <Ban className="h-4 w-4" /> },
                  { value: 'icon', label: 'Icon adornment', node: <Sparkles className="h-4 w-4" /> },
                  { value: 'number', label: 'Number adornment', node: <NumberBadgeGlyph /> },
                ] as Array<{ value: CardAdornment; label: string; node: ReactNode }>
              ).map((opt) => (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={config.adornment === opt.value}
                  aria-label={opt.label}
                  onClick={() => onChange({ adornment: opt.value })}
                  className={`flex-1 flex items-center justify-center py-2 rounded-[var(--ds-radius-control,8px)] border transition-colors ${
                    config.adornment === opt.value
                      ? 'text-white border-white/40 bg-white/5'
                      : 'text-white/50 border-white/10 hover:text-white hover:border-white/25'
                  }`}
                >
                  {opt.node}
                </button>
              ))}
            </div>
            {config.adornment === 'number' && (
              <div className="px-3 pb-3 flex items-center justify-between gap-3">
                <span className="text-[13px] text-white/50">Number</span>
                <input
                  aria-label="Card number label"
                  value={config.numberLabel}
                  onChange={(e) => onChange({ numberLabel: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                  }}
                  className="w-20 px-2.5 py-1.5 rounded-[var(--ds-radius-control,8px)] bg-white/[0.06] border border-white/10 text-[13px] text-white/80 outline-none focus:border-white/30"
                />
              </div>
            )}
            {config.adornment === 'icon' && (
              <div className="px-3 pb-3 text-[11px] text-white/35">
                Click the icon on the card to open the icon library.
              </div>
            )}
            {/* Corners — the reference's four-step radius row. */}
            <div className="px-3 pt-2.5 pb-1 text-[12px] text-white/40 border-t border-white/[0.06]">
              Corners
            </div>
            <div className="px-3 pb-3 flex gap-1.5" role="radiogroup" aria-label="Corners">
              {(
                [
                  { value: 'none', label: 'Sharp corners', r: 0 },
                  { value: 'sm', label: 'Slightly rounded corners', r: 3 },
                  { value: 'md', label: 'Rounded corners', r: 7 },
                  { value: 'lg', label: 'Very rounded corners', r: 12 },
                ] as Array<{ value: CardCorners; label: string; r: number }>
              ).map((opt) => (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={config.corners === opt.value}
                  aria-label={opt.label}
                  onClick={() => onChange({ corners: opt.value })}
                  className={`flex-1 flex items-center justify-center py-2 rounded-[var(--ds-radius-control,8px)] border transition-colors ${
                    config.corners === opt.value
                      ? 'text-white border-white/40 bg-white/5'
                      : 'text-white/50 border-white/10 hover:text-white hover:border-white/25'
                  }`}
                >
                  <CornerGlyph r={opt.r} />
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}

      {/* ── Fonts menu — search + list + weights flyout on hover ──── */}
      {openMenu === 'fonts' &&
        createPortal(
          <div
            ref={menuRef}
            data-editor-chrome="true"
            style={menuStyle}
            className={`${menuCard} w-[290px]`}
          >
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-white/[0.06]">
              <span className="text-[13px] text-white/80">Fonts</span>
              {config.fontFamily && (
                <button
                  onClick={() => onChange({ fontFamily: '', fontWeight: '400' })}
                  className="text-[12px] text-white/40 hover:text-white transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="p-2.5">
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--ds-radius-control,8px)] bg-white/[0.06] border border-white/15 focus-within:border-white/35">
                <Search className="h-3.5 w-3.5 text-white/35" />
                <input
                  aria-label="Search fonts"
                  placeholder="Search"
                  value={fontQuery}
                  onChange={(e) => setFontQuery(e.target.value)}
                  className="flex-1 bg-transparent text-[13px] text-white/85 outline-none placeholder:text-white/30"
                />
              </div>
            </div>
            <div className="max-h-[46vh] overflow-y-auto px-1.5 pb-1.5">
              {fontMatches.list.map((family) => {
                const active = family === config.fontFamily;
                return (
                  <button
                    key={family}
                    role="menuitem"
                    onMouseEnter={(e) => {
                      clearTimeout(weightsIntentRef.current);
                      const top = e.currentTarget.getBoundingClientRect().top;
                      weightsIntentRef.current = setTimeout(() => {
                        loadFontFamily(family, [400, 500, 600, 700]);
                        setWeightsFor(family);
                        setWeightsTop(top);
                      }, FONT_HOVER_INTENT_MS);
                    }}
                    onClick={() => {
                      applyFont(family);
                      setOpenMenu(null);
                    }}
                    className={`w-full flex items-center gap-2 h-9 px-2.5 rounded-[9px] text-[13.5px] transition-colors ${
                      weightsFor === family || active
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="flex-1 text-left truncate">{family}</span>
                    {active && <span className="text-white/40 text-[10px]">✓</span>}
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/25" />
                  </button>
                );
              })}
              {fontMatches.total > fontMatches.list.length && (
                <div className="px-2.5 py-2 text-[11px] text-white/30">
                  {fontMatches.total - fontMatches.list.length} more — keep typing to narrow
                </div>
              )}
              {fontMatches.total === 0 && (
                <div className="px-2.5 py-3 text-[12px] text-white/35">No font matches</div>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* ── Weights flyout — beside the fonts menu (reference #62) ── */}
      {openMenu === 'fonts' &&
        weightsFor &&
        createPortal(
          <div
            ref={subMenuRef}
            data-editor-chrome="true"
            role="menu"
            aria-label={`${weightsFor} weights`}
            style={subPos ?? { top: 0, left: 0, visibility: 'hidden' }}
            className={`${menuCard} w-44 py-1.5 animate-in fade-in duration-150`}
          >
            {CARD_FONT_WEIGHTS.map((w) => {
              const active = config.fontFamily === weightsFor && config.fontWeight === w.value;
              return (
                <button
                  key={w.value}
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    applyFont(weightsFor, w.value);
                    setOpenMenu(null);
                  }}
                  className={`w-full flex items-center px-3.5 py-2 text-[14px] transition-colors ${active ? 'text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                  style={{ fontFamily: `'${weightsFor}', sans-serif`, fontWeight: Number(w.value) }}
                >
                  <span className="flex-1 text-left">{w.label}</span>
                  {active && <span className="text-white/40 text-[11px]">✓</span>}
                </button>
              );
            })}
          </div>,
          document.body,
        )}

      {/* ── Color / Highlight / Background swatch menus ───────────── */}
      {swatchBtn('color', config.textColor, colorPresets, 'Text color')}
      {swatchBtn('highlight', config.highlight, HIGHLIGHT_PRESETS, 'Highlight', true)}
      {swatchBtn('background', config.background, colorPresets, 'Card background')}

      {/* ── Align menu ────────────────────────────────────────────── */}
      {openMenu === 'align' &&
        createPortal(
          <div
            ref={menuRef}
            data-editor-chrome="true"
            style={menuStyle}
            className={`${menuCard} w-28 py-1`}
          >
            {(['left', 'center', 'right'] as const).map((a) => {
              const Icon = ALIGN_ICONS[a];
              return (
                <button
                  key={a}
                  onClick={() => {
                    onChange({ align: a });
                    setOpenMenu(null);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-[13px] capitalize transition-colors flex items-center gap-2 ${config.align === a ? 'text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {a}
                </button>
              );
            })}
          </div>,
          document.body,
        )}

      {/* ── More menu ─────────────────────────────────────────────── */}
      {openMenu === 'more' &&
        createPortal(
          <div
            ref={menuRef}
            data-editor-chrome="true"
            style={menuStyle}
            className={`${menuCard} w-40 py-1`}
          >
            <button
              onClick={() => {
                onDuplicate?.();
                setOpenMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left text-[13px] text-white/50 hover:text-white hover:bg-white/5 flex items-center gap-2"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            <div className="my-1 mx-2 border-t border-white/[0.06]" />
            <button
              onClick={() => {
                onDelete?.();
                setOpenMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left text-[13px] text-red-400 hover:bg-red-400/10 flex items-center gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>,
          document.body,
        )}
    </div>
  );

  return inline ? toolbar : createPortal(toolbar, document.body);
}

/* ── Icon library popover — opened by the card's icon adornment ────── */

export interface IconLibraryPopoverProps {
  /** The icon's rect (viewport coords) the popover anchors beside. */
  anchor: { top: number; left: number; width: number; height: number };
  iconName: string;
  iconColor: string;
  iconScale: number;
  colorPresets?: string[];
  onPick: (name: string) => void;
  onColor: (hex: string) => void;
  onScale: (pct: number) => void;
  onClose: () => void;
}

export function IconLibraryPopover({
  anchor,
  iconName,
  iconColor,
  iconScale,
  colorPresets = DEFAULT_COLOR_PRESETS,
  onPick,
  onColor,
  onScale,
  onClose,
}: IconLibraryPopoverProps) {
  const [tab, setTab] = useState<'icon' | 'emoji'>('icon');
  const [query, setQuery] = useState('');
  const [moreColors, setMoreColors] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const colorRef = useRef(onColor);
  colorRef.current = onColor;
  const handlePickerChange = useCallback((hex: string) => colorRef.current(hex), []);

  useLayoutEffect(() => {
    const place = () => {
      const el = ref.current;
      if (!el) return;
      const { width: w, height: h } = el.getBoundingClientRect();
      let left = anchor.left + anchor.width + 10;
      if (left + w > window.innerWidth - 8) left = Math.max(8, anchor.left - w - 10);
      const top = Math.min(Math.max(8, anchor.top - 12), Math.max(8, window.innerHeight - h - 8));
      setPos({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor.top, anchor.left, anchor.width, anchor.height, moreColors, tab]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const sections = ICON_LIBRARY.map((cat) => ({
    ...cat,
    icons: q
      ? cat.icons.filter(
          (i) => i.name.toLowerCase().includes(q) || i.keywords?.some((k) => k.includes(q)),
        )
      : cat.icons,
  })).filter((cat) => cat.icons.length > 0);

  return createPortal(
    <div
      ref={ref}
      data-icon-library="true"
      data-editor-chrome="true"
      data-workspace="floating-toolbar"
      data-theme="dark"
      style={pos ?? { top: 0, left: 0, visibility: 'hidden' }}
      className="fixed z-[80] w-[300px] bg-[#1f1f21] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] shadow-2xl flex flex-col max-h-[72vh]"
      // A body portal still BUBBLES through the React tree — without this
      // a click inside reaches the stage's mousedown and closes the
      // popover instantly (owner report 2026-08-22).
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Tabs */}
      <div className="flex items-center gap-4 px-4 pt-3">
        {(['icon', 'emoji'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-[13px] capitalize border-b-2 transition-colors ${
              tab === t
                ? 'text-white border-white'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="border-t border-white/[0.06]" />

      {tab === 'icon' && (
        <>
          {/* Icon color */}
          <div className="px-3 pt-2.5 flex items-center gap-1.5">
            {colorPresets.map((c) => (
              <button
                key={c}
                aria-label={`Icon color ${c}`}
                onClick={() => onColor(c)}
                className={`w-6 h-6 rounded-[calc(var(--ds-radius-control,8px)/2)] border-2 transition-all ${
                  iconColor.toLowerCase() === c.toLowerCase()
                    ? 'border-white scale-110'
                    : 'border-white/10 hover:border-white/30'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <span className="flex-1" />
            <button
              aria-label="Custom icon color"
              onClick={() => setMoreColors((v) => !v)}
              className="w-6 h-6"
            >
              <img src={colorCircleRgb} alt="" className="w-6 h-6" draggable={false} />
            </button>
          </div>
          <button
            onClick={() => setMoreColors((v) => !v)}
            aria-expanded={moreColors}
            className="mx-3 mt-2 mb-1 flex items-center gap-1 text-[12px] text-white/45 hover:text-white/80 transition-colors"
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform duration-200 ${moreColors ? 'rotate-90' : ''}`}
            />
            More colors
          </button>
          {moreColors && (
            <div className="cp-toolbar-host px-3 pb-2 border-b border-white/[0.06]">
              <ColorPickerHSV
                hex={iconColor || '#ffffff'}
                onChange={handlePickerChange}
                onCommit={(hex) => {
                  onColor(hex);
                  setMoreColors(false);
                }}
                onCancel={() => setMoreColors(false)}
                compact
                commitLabel="Apply"
              />
            </div>
          )}

          {/* Search */}
          <div className="px-3 pt-1.5 pb-1">
            <input
              aria-label="Search icon"
              placeholder="Search icon"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-[var(--ds-radius-control,8px)] bg-white/[0.06] border border-transparent text-[13px] text-white/85 outline-none focus:border-white/25 placeholder:text-white/30"
            />
          </div>

          {/* The grid */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2">
            {sections.map((cat) => (
              <div key={cat.category}>
                <div className="pt-2 pb-1.5 text-[11.5px] text-white/35">{cat.category}</div>
                <div className="grid grid-cols-6 gap-1">
                  {cat.icons.map(({ name, Icon }) => {
                    const active = name === iconName;
                    return (
                      <button
                        key={name}
                        title={name}
                        aria-label={`Icon ${name}`}
                        onClick={() => onPick(name)}
                        className={`aspect-square flex items-center justify-center rounded-[8px] transition-colors ${
                          active ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon className="h-[19px] w-[19px]" strokeWidth={1.6} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {sections.length === 0 && (
              <div className="py-6 text-center text-[12px] text-white/35">No icon matches</div>
            )}
          </div>

          {/* Size */}
          <div className="border-t border-white/[0.06] px-3 py-2.5 flex items-center gap-3">
            <span className="text-[13px] text-white/50">Size</span>
            <input
              type="range"
              min={0}
              max={100}
              value={iconScale}
              aria-label="Icon size"
              onChange={(e) => onScale(Number(e.target.value))}
              className="flex-1 accent-white"
            />
            <span className="w-14 px-2 py-1.5 rounded-[var(--ds-radius-control,8px)] bg-white/[0.06] border border-white/10 text-[12px] text-white/70 text-right">
              {iconScale} %
            </span>
          </div>
        </>
      )}

      {tab === 'emoji' && (
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
          <div className="grid grid-cols-7 gap-1">
            {EMOJI_SET.map((e) => {
              const active = iconName === `emoji:${e}`;
              return (
                <button
                  key={e}
                  aria-label={`Emoji ${e}`}
                  onClick={() => onPick(`emoji:${e}`)}
                  className={`aspect-square flex items-center justify-center rounded-[8px] text-[18px] transition-colors ${
                    active ? 'bg-white/15' : 'hover:bg-white/10'
                  }`}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

/** Renders a card's adornment icon value — lucide name or `emoji:x`. */
export function CardAdornmentIcon({
  name,
  color,
  scale,
}: {
  name: string;
  color: string;
  scale: number;
}) {
  const size = Math.round(22 * (1 + scale / 100));
  if (name.startsWith('emoji:')) {
    return <span style={{ fontSize: size, lineHeight: 1 }}>{name.slice(6)}</span>;
  }
  const Icon = iconByName(name) ?? Sparkles;
  return <Icon style={{ width: size, height: size, color }} strokeWidth={1.6} aria-hidden />;
}

/* ── Glyphs the bar needs that lucide lacks at this size ───────────── */

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

function FrameGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  );
}

/** One corner stroke at increasing radius — the Corners row's glyphs. */
function CornerGlyph({ r }: { r: number }) {
  const d =
    r <= 0
      ? 'M6 19 V5 H20'
      : `M6 19 V${5 + r} Q6 5 ${5 + r} 5 H20`;
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d={d} />
    </svg>
  );
}

/** The style menu's third option: a numbered label (reference #59). */
function NumberBadgeGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M11 9.5l2-1.2V16" />
    </svg>
  );
}

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
