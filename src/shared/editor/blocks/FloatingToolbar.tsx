/**
 * FloatingToolbar — appears above a selected block.
 * Every button is functional.
 */
import { useState, useRef, useEffect, useLayoutEffect, useCallback, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, MoreHorizontal, Maximize2, Trash2, Copy, AlignLeft, AlignCenter, AlignRight, Upload, FolderOpen, ImageIcon } from 'lucide-react';
import type { BlockType } from './BlockTypes';
import { type ReactNode } from 'react';
import type { InsertMenuItem } from './CanvasToolbar';
import { WIDGET_MENU_SECTION } from './insertMenu';
import { useEditorContext } from '../EditorContext';
import { ColorPickerHSV } from '@/shared/components/ColorPickerHSV';
import colorCircleRgb from './color-circle-rgb.svg';
import { toast } from 'sonner';

interface FloatingToolbarProps {
  blockType: BlockType;
  style: { fontWeight?: string; fontStyle?: string; textAlign?: string; color?: string; fontSize?: string; objectFit?: string };
  onChangeType: (type: BlockType) => void;
  onChangeStyle: (key: string, value: string) => void;
  position: { top: number; left: number; width: number; height?: number };
  onDelete?: () => void;
  onDuplicate?: () => void;
  onReplace?: () => void;
  /** A pick in the rich Turn into menu (`family:variant` leaf id). When
   *  absent, the pick degrades to onChangeType with the family's
   *  BlockType — hosts that only know block types keep working. */
  onTurnIntoWidget?: (id: string) => void;
  /** The block's CURRENT widget leaf (e.g. 'text:heading') — names the
   *  variant button and marks it in the variant menu. Hosts that don't
   *  track leaf ids get a blockType-derived fallback. */
  variant?: string;
  /**
   * Render in place instead of the fixed top-center portal. Production
   * editors never set this — it exists for the dev component lab, where
   * several toolbars sit on one page, each inside its own section.
   */
  inline?: boolean;
}

const FONT_WEIGHTS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
  { value: '900', label: 'Black' },
];

const FONT_SIZES = [
  { value: '12px', label: '12' }, { value: '14px', label: '14' }, { value: '16px', label: '16' },
  { value: '20px', label: '20' }, { value: '24px', label: '24' }, { value: '32px', label: '32' },
  { value: '40px', label: '40' }, { value: '48px', label: '48' }, { value: '64px', label: '64' },
  { value: '72px', label: '72' }, { value: '96px', label: '96' },
];

const COLORS = ['#ffffff', '#000000', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];

const ALIGN_ICONS: Record<string, typeof AlignLeft> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
};

/** Turn into is the SAME rich widget menu every toolbar opens (the
 *  CanvasToolbar interaction): one vocabulary tree, hover flyouts,
 *  preview cards, same timing numbers. */
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

/** Gap between the BAR and an open menu — the menu floats, never touches it. */
const MENU_GAP = 2;
/** Horizontal anchor per menu; unlisted menus align to their button's left. */
const MENU_ALIGN: Record<string, 'start' | 'center' | 'end'> = {
  color: 'center',
  more: 'end',
};

export function FloatingToolbar({ blockType, style, onChangeType, onChangeStyle, position, onDelete, onDuplicate, onReplace, onTurnIntoWidget, variant, inline }: FloatingToolbarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  // "Custom" in the color menu expands the shared HSV picker inline.
  const [customOpen, setCustomOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  // Measured toolbar box — needed to anchor it above the selection without
  // an inline transform (the animate-in keyframes own `transform`).
  const [toolbarSize, setToolbarSize] = useState({ w: 0, h: 0 });
  const isText = blockType === 'text' || blockType === 'heading';
  const isImage = blockType === 'image' || blockType === 'logo';

  // Brand assets from editor context — used to populate the asset picker
  const editorCtx = useEditorContext();
  const brand = editorCtx?.brand;
  const imageAssets = (brand?.assets || []).filter(a =>
    a.type === 'image' || a.type === 'logo' || a.type === 'icon'
  );

  const toggleDropdown = (id: string) => setOpenDropdown(prev => prev === id ? null : id);

  useLayoutEffect(() => {
    if (inline) return;
    const el = toolbarRef.current;
    if (!el) return;
    const measure = () => setToolbarSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [inline]);

  // ── Menu placement ────────────────────────────────────────────────
  // An open menu FLOATS: MENU_GAP px below the whole bar, flipping to
  // MENU_GAP px above it when the space below can't fit the menu and the
  // space above can (standard popover flip). Horizontally it anchors to
  // the button that opened it, clamped to the viewport. position:fixed
  // takes it out of the bar's box; it stays a DOM child of the toolbar so
  // the click-outside close keeps working. Only one menu is open at a
  // time, so a single ref + position serves them all.
  const menuRef = useRef<HTMLDivElement>(null);
  const anchorRefs = useRef<Record<string, HTMLElement | null>>({});
  const setAnchor = (id: string) => (el: HTMLElement | null) => { anchorRefs.current[id] = el; };
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!openDropdown) { setMenuPos(null); return; }
    const place = () => {
      const bar = toolbarRef.current;
      const anchor = anchorRefs.current[openDropdown];
      const menu = menuRef.current;
      if (!bar || !anchor || !menu) return;
      const barRect = bar.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const { width: mw, height: mh } = menu.getBoundingClientRect();
      const spaceBelow = window.innerHeight - barRect.bottom - MENU_GAP;
      const spaceAbove = barRect.top - MENU_GAP;
      const below = mh <= spaceBelow || spaceBelow >= spaceAbove;
      const top = below
        ? barRect.bottom + MENU_GAP
        : Math.max(8, barRect.top - MENU_GAP - mh);
      const align = MENU_ALIGN[openDropdown] ?? 'start';
      let left =
        align === 'end' ? anchorRect.right - mw
        : align === 'center' ? anchorRect.left + anchorRect.width / 2 - mw / 2
        : anchorRect.left;
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
    // customOpen changes the color menu's height — re-anchor when it toggles.
  }, [openDropdown, customOpen, position.top, position.left, position.width]);

  // Leaving the color menu collapses the picker back to the swatch row.
  useEffect(() => {
    if (openDropdown !== 'color') setCustomOpen(false);
  }, [openDropdown]);

  // The HSV picker calls onChange from an effect keyed on the callback's
  // IDENTITY, and onChangeStyle is a fresh closure on every host render —
  // passing it straight through would re-fire the effect after each
  // re-render it causes: an infinite loop. A ref-backed stable callback
  // breaks the cycle while keeping the live preview.
  const changeStyleRef = useRef(onChangeStyle);
  changeStyleRef.current = onChangeStyle;
  const handlePickerChange = useCallback((hex: string) => changeStyleRef.current('color', hex), []);

  // Hidden until the first measurement so a menu never flashes unplaced.
  const menuStyle: CSSProperties = menuPos ?? { top: 0, left: 0, visibility: 'hidden' };

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
    if (openDropdown === 'turnInto') return;
    setTurnPath([]);
    setTurnAnchors([]);
    setTurnPreview(null);
    turnPreviewShownRef.current = false;
    clearTimeout(turnIntentRef.current);
    clearTimeout(turnPreviewTimerRef.current);
  }, [openDropdown]);
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

  /** A leaf pick: the host's rich handler when given; otherwise degrade
   *  to the family's BlockType through onChangeType. */
  const pickTurnInto = (id: string) => {
    if (onTurnIntoWidget) {
      onTurnIntoWidget(id);
      return;
    }
    const family = id.split(':')[0];
    const mapped =
      id === 'text:heading' || id === 'text:display'
        ? 'heading'
        : family === 'text'
          ? 'text'
          : family === 'media'
            ? 'image'
            : family === 'card'
              ? 'card'
              : family === 'chart'
                ? 'chart'
                : id === 'table'
                  ? 'table'
                  : family === 'mockup'
                    ? 'mockup'
                    : family === 'embed'
                      ? 'embed'
                      : id === 'sticky'
                        ? 'sticky'
                        : null;
    if (mapped) onChangeType(mapped as BlockType);
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
    setOpenDropdown(null);
    pickTurnInto(item.id);
  };

  // Close dropdown when clicking outside toolbar AND outside the menu —
  // menus are portaled to document.body (see below), so containment must
  // be checked against both.
  useEffect(() => {
    if (!openDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (toolbarRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      if (turnLayerRef.current?.contains(t)) return;
      setOpenDropdown(null);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Walk back ONE layer: preview → flyout → the menu itself.
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
      setOpenDropdown(null);
    };
    // Delay to avoid closing immediately from the click that opened it
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openDropdown]);

  const currentWeightLabel = FONT_WEIGHTS.find(w => w.value === style.fontWeight)?.label || 'Medium';
  const currentFontSize = style.fontSize ? parseInt(style.fontSize) + 'px' : 'Aa';

  const currentAlign = style.textAlign || 'left';
  const AlignIcon = ALIGN_ICONS[currentAlign] || AlignLeft;

  const isBold = style.fontWeight === '700' || style.fontWeight === 'bold';
  const isItalic = style.fontStyle === 'italic';

  const handleReplace = () => {
    if (onReplace) {
      onReplace();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChangeStyle('__replaceImageSrc', url);
    toast.success('Image replaced');
  };

  // Portal to document.body so the toolbar escapes any ancestor that
  // has `transform: scale(...)` — without it, position:fixed gets
  // anchored to the transformed parent and the toolbar shrinks with
  // the slide canvas. (Slides render at 1920×1080 inside a CSS-scaled
  // wrapper; the toolbar must live above that wrapper at 1×.)
  // `inline` skips both the portal and the pinning — the toolbar renders
  // where it is mounted (the dev component lab's per-section showcase).
  //
  // Anchored to the SELECTION: centered over the selected block, GAP px
  // above it; flips below the block when there is no room above. `position`
  // is the block's getBoundingClientRect (viewport coords), which matches
  // position:fixed on a body portal. Hidden until the first measurement so
  // it never flashes at an unanchored spot.
  const GAP = 15;
  let anchoredStyle: CSSProperties | undefined;
  let flippedBelow = false;
  if (!inline) {
    const centerX = position.left + position.width / 2;
    const left = Math.min(
      Math.max(centerX - toolbarSize.w / 2, 8),
      Math.max(8, window.innerWidth - toolbarSize.w - 8),
    );
    const above = position.top - GAP - toolbarSize.h;
    flippedBelow = above < 8;
    const top = flippedBelow ? position.top + (position.height ?? 0) + GAP : above;
    anchoredStyle = { top, left, visibility: toolbarSize.w ? 'visible' : 'hidden' };
  }

  // The entrance rises OUT OF the selection: it starts nearer the text and
  // eases to its resting spot (reversed when the bar sits below the block).
  // DS easing, large tier — deliberately unhurried.
  const entrance = `animate-in fade-in ${flippedBelow ? 'slide-in-from-top-3' : 'slide-in-from-bottom-3'} duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]`;

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
    const isCurrent = (item.id === 'text' && isText) || (item.id === 'media' && isImage);
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

  // ── Family + variant — the left PAIR (owner request 2026-08-23):
  // the FAMILY button (Text / Media) opens the cross-family Turn into;
  // the VARIANT button beside it switches within the family only
  // (Display/Heading/… for text, Image/Video/Logo for media).
  const familyId = isText ? 'text' : isImage ? 'media' : null;
  const familyLabel = isText ? 'Text' : isImage ? 'Media' : blockType;
  const variantLeaves = familyId
    ? (turnIntoItems().find((i) => i.id === familyId)?.children ?? []).filter((c) => !c.divider)
    : [];
  const fallbackVariantId = isText
    ? blockType === 'heading'
      ? 'text:heading'
      : 'text:paragraph'
    : 'media:image';
  const currentVariantId = variant ?? fallbackVariantId;
  const variantLabel =
    variantLeaves.find((c) => c.id === currentVariantId)?.label ??
    (isText ? (blockType === 'heading' ? 'Heading' : 'Paragraph') : 'Image');
  const pickVariant = (id: string) => {
    if (onTurnIntoWidget) {
      onTurnIntoWidget(id);
      return;
    }
    if (isText) onChangeType(id === 'text:heading' || id === 'text:display' ? 'heading' : 'text');
    else onChangeType('image');
  };

  const toolbar = (
    <div
      ref={toolbarRef}
      className={`${inline ? 'relative inline-flex w-max' : 'fixed flex'} z-[60] items-center gap-0.5 bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] px-2 py-1 shadow-2xl border border-white/[0.08] ${entrance}`}
      style={anchoredStyle}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Hidden file input for image replace */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

      {/* Block type / Turn Into — family + variant sit SIDE BY SIDE in
          the bar's row (each button is display:flex, i.e. block-level, so
          the wrapper must be a flex row or they stack). */}
      <div className="relative flex items-center gap-0.5">
        <button ref={setAnchor('turnInto')} onClick={() => toggleDropdown('turnInto')} className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--ds-radius-control,8px)] text-[13px] text-white/70 hover:text-white hover:bg-white/10 transition-colors">
          {familyLabel}
          <ChevronDown className="h-3.5 w-3.5 text-white/30" />
        </button>
        {/* VARIANT — the family's own kinds, beside the family button */}
        {familyId && (
          <button ref={setAnchor('variant')} onClick={() => toggleDropdown('variant')} className="flex items-center gap-1 px-2 py-1 rounded-[var(--ds-radius-control,8px)] text-[13px] text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            {variantLabel}
            <ChevronDown className="h-3.5 w-3.5 text-white/20" />
          </button>
        )}
        {openDropdown === 'variant' && createPortal(
          <div ref={menuRef} data-editor-chrome="true" style={menuStyle} className="fixed w-56 bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] py-1 shadow-2xl z-[70]">
            {variantLeaves.map((leaf) => {
              const active = leaf.id === currentVariantId;
              return (
                <button
                  key={leaf.id}
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setOpenDropdown(null);
                    pickVariant(leaf.id);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors ${active ? 'text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                >
                  <span className="flex-1 text-left">{leaf.label}</span>
                  {active && <span className="text-white/40 text-[10px]">✓</span>}
                  {leaf.kbd && (
                    <span className="min-w-[20px] h-5 px-1 rounded-md bg-white/[0.07] border border-white/[0.06] inline-flex items-center justify-center text-[11px] text-white/45">
                      {leaf.kbd}
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
        {/* Menus PORTAL to document.body: each toolbar is its own z-60
            stacking context, so a menu kept inside would paint UNDER any
            later toolbar/panel. At body level with z-70 a menu beats all
            editor chrome — the click-outside handler checks menuRef.

            Turn into is the RICH widget menu (the CanvasToolbar
            interaction): hover a family → its flyout; rest on a leaf →
            its preview card. One transparent layer holds panel + flyouts
            + preview so click-outside sees them all. */}
        {openDropdown === 'turnInto' && createPortal(
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
                onClick={() => { onDuplicate?.(); setOpenDropdown(null); }}
                className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[9px] text-[13px] text-white/75 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Copy className="h-[17px] w-[17px] shrink-0 text-white opacity-45" strokeWidth={1.8} />
                <span className="flex-1 text-left">Duplicate</span>
              </button>
              <button
                type="button"
                onClick={() => { onDelete?.(); setOpenDropdown(null); }}
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
      </div>

      {isText && (
        <>
          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* Font weight dropdown */}
          <div className="relative">
            <button ref={setAnchor('weight')} onClick={() => toggleDropdown('weight')} className="flex items-center gap-1 px-2 py-1 rounded-[var(--ds-radius-control,8px)] text-[13px] text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              {currentWeightLabel} <ChevronDown className="h-3.5 w-3.5 text-white/20" />
            </button>
            {openDropdown === 'weight' && createPortal(
              <div ref={menuRef} data-editor-chrome="true" style={menuStyle} className="fixed w-36 bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] py-1 shadow-2xl z-[70]">
                {FONT_WEIGHTS.map(w => (
                  <button key={w.value} onClick={() => { onChangeStyle('fontWeight', w.value); setOpenDropdown(null); }}
                    className={`w-full px-3 py-1.5 text-left text-[13px] transition-colors ${style.fontWeight === w.value ? 'text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                    style={{ fontWeight: Number(w.value) }}>{w.label}</button>
                ))}
              </div>,
              document.body,
            )}
          </div>

          {/* Font size dropdown */}
          <div className="relative">
            <button ref={setAnchor('fontSize')} onClick={() => toggleDropdown('fontSize')} className="flex items-center gap-1 px-2 py-1 rounded-[var(--ds-radius-control,8px)] text-[13px] text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              {currentFontSize} <ChevronDown className="h-3.5 w-3.5 text-white/20" />
            </button>
            {openDropdown === 'fontSize' && createPortal(
              <div ref={menuRef} data-editor-chrome="true" style={menuStyle} className="fixed w-28 bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] py-1 shadow-2xl z-[70] max-h-48 overflow-auto">
                {FONT_SIZES.map(s => (
                  <button key={s.value} onClick={() => { onChangeStyle('fontSize', s.value); setOpenDropdown(null); }}
                    className={`w-full px-3 py-1 text-left text-[13px] transition-colors ${style.fontSize === s.value ? 'text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>{s.label}px</button>
                ))}
              </div>,
              document.body,
            )}
          </div>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* Color picker */}
          <div className="relative">
            <button ref={setAnchor('color')} onClick={() => toggleDropdown('color')} className="flex items-center gap-1 px-1.5 py-1 rounded-[var(--ds-radius-control,8px)] hover:bg-white/10 transition-colors">
              {/* Rounded SQUARE, half the DS control radius — never a circle */}
              <div className="w-4 h-4 rounded-[calc(var(--ds-radius-control,8px)/2)] border border-white/20" style={{ backgroundColor: style.color || '#ffffff' }} />
              <ChevronDown className="h-3.5 w-3.5 text-white/20" />
            </button>
            {openDropdown === 'color' && createPortal(
              <div
                ref={menuRef}
                data-editor-chrome="true"
                style={menuStyle}
                // The HSV picker's cp-* styles live in workspace.css scoped
                // under [data-workspace], and this menu is portaled to
                // document.body — carry the scope here, pinned to the bar's
                // own dark theme so the picker chrome matches the bar.
                data-workspace="floating-toolbar"
                data-theme="dark"
                // Width is PINNED to the swatch row (9×24 + 8×6 content + p-2
                // + border) so opening the picker can never resize the popup —
                // the picker fits itself into this width, not the other way.
                className="fixed w-[282px] bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] p-2 shadow-2xl z-[70]"
              >
                <div className="flex gap-1.5 mb-1.5">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => { onChangeStyle('color', c); setOpenDropdown(null); }}
                      className={`w-6 h-6 rounded-[calc(var(--ds-radius-control,8px)/2)] border-2 transition-all ${style.color === c ? 'border-white scale-110' : 'border-white/10 hover:border-white/30'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                {customOpen ? (
                  <div className="cp-toolbar-host pt-1.5 border-t border-white/[0.06]">
                    <ColorPickerHSV
                      hex={style.color || '#ffffff'}
                      onChange={handlePickerChange}
                      onCommit={(hex) => { onChangeStyle('color', hex); setOpenDropdown(null); }}
                      onCancel={() => setCustomOpen(false)}
                      compact
                      commitLabel="Apply"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setCustomOpen(true)}
                    className="w-full flex items-center gap-1.5 pt-1 border-t border-white/[0.06] text-[10px] text-white/30 hover:text-white/70 transition-colors"
                  >
                    <img src={colorCircleRgb} alt="" className="w-6 h-6" draggable={false} />
                    Custom
                  </button>
                )}
              </div>,
              document.body,
            )}
          </div>

          {/* Alignment */}
          <div className="relative">
            <button ref={setAnchor('align')} onClick={() => toggleDropdown('align')} className="flex items-center gap-1 px-1.5 py-1 rounded-[var(--ds-radius-control,8px)] text-[13px] text-white/50 hover:text-white hover:bg-white/10 transition-colors">
              <AlignIcon className="h-3.5 w-3.5" /> <ChevronDown className="h-3.5 w-3.5 text-white/20" />
            </button>
            {openDropdown === 'align' && createPortal(
              <div ref={menuRef} data-editor-chrome="true" style={menuStyle} className="fixed w-28 bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] py-1 shadow-2xl z-[70]">
                {(['left', 'center', 'right'] as const).map(a => {
                  const Icon = ALIGN_ICONS[a];
                  return (
                    <button key={a} onClick={() => { onChangeStyle('textAlign', a); setOpenDropdown(null); }}
                      className={`w-full px-3 py-1.5 text-left text-[13px] capitalize transition-colors flex items-center gap-2 ${style.textAlign === a ? 'text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {a}
                    </button>
                  );
                })}
              </div>,
              document.body,
            )}
          </div>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* Bold toggle — active is LIT (bright glyph), never a filled pill */}
          <button onClick={() => onChangeStyle('fontWeight', isBold ? '400' : '700')}
            className={`px-1.5 py-1 rounded-[var(--ds-radius-control,8px)] text-[13px] font-bold transition-colors ${isBold ? 'text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}>B</button>
          {/* Italic toggle */}
          <button onClick={() => onChangeStyle('fontStyle', isItalic ? 'normal' : 'italic')}
            className={`px-1.5 py-1 rounded-[var(--ds-radius-control,8px)] text-[13px] italic transition-colors ${isItalic ? 'text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}>I</button>
        </>
      )}

      {isImage && (
        <>
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          {/* Replace dropdown — Upload + Brand Assets */}
          <div className="relative">
            <button
              ref={setAnchor('replace')}
              onClick={() => toggleDropdown('replace')}
              className="flex items-center gap-1 px-2 py-1 rounded-[var(--ds-radius-control,8px)] text-[11px] text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              Replace <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {openDropdown === 'replace' && createPortal(
              <div ref={menuRef} data-editor-chrome="true" style={menuStyle} className="fixed w-72 bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] shadow-2xl z-[70] overflow-hidden">
                {/* Upload from device */}
                <button
                  onClick={() => { fileInputRef.current?.click(); setOpenDropdown(null); }}
                  className="w-full px-3 py-2.5 text-left text-[13px] text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2 border-b border-white/[0.04]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <div className="flex-1">
                    <div>Upload from device</div>
                    <div className="text-[10px] text-white/30">PNG, JPG, SVG, WebP</div>
                  </div>
                </button>

                {/* Brand Assets section */}
                <div className="px-3 py-2 flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Brand Assets ({imageAssets.length})
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {imageAssets.length === 0 ? (
                    <div className="px-3 py-6 text-center text-[11px] text-white/25">
                      No image assets in brand library
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 p-2">
                      {imageAssets.map((asset) => (
                        <button
                          key={asset.id}
                          onClick={() => {
                            onChangeStyle('__replaceImageSrc', asset.url);
                            setOpenDropdown(null);
                            toast.success(`Replaced with ${asset.name}`);
                          }}
                          className="group relative aspect-square rounded-[var(--ds-radius-tile,10px)] overflow-hidden bg-white/[0.04] border border-white/[0.06] hover:border-white/20 transition-colors"
                          title={asset.name}
                        >
                          <img
                            src={asset.url}
                            alt={asset.name}
                            className="w-full h-full object-contain p-1"
                            loading="lazy"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="text-[8px] text-white/80 truncate">{asset.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>,
              document.body,
            )}
          </div>

          <button onClick={() => {
            const currentFit = style.objectFit || 'cover';
            const nextFit = currentFit === 'cover' ? 'contain' : currentFit === 'contain' ? 'fill' : 'cover';
            onChangeStyle('objectFit', nextFit);
            toast.success(`Object fit: ${nextFit}`);
          }} className="px-2 py-1 rounded-[var(--ds-radius-control,8px)] text-[11px] text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            {style.objectFit === 'contain' ? 'Contain' : style.objectFit === 'fill' ? 'Fill' : 'Cover'}
          </button>
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          <button onClick={() => {
            onChangeStyle('width', '100%');
            onChangeStyle('height', '100%');
            toast.success('Expanded to full size');
          }} className="px-1.5 py-1 rounded-[var(--ds-radius-control,8px)] text-white/30 hover:text-white hover:bg-white/10 transition-colors"><Maximize2 className="h-3.5 w-3.5" /></button>
        </>
      )}

      <div className="w-px h-4 bg-white/10 mx-0.5" />

      {/* Duplicate / Delete / More */}
      <button onClick={() => { onDuplicate?.(); toast.success('Duplicated'); }} className="px-1 py-1 rounded-[var(--ds-radius-control,8px)] text-white/25 hover:text-white hover:bg-white/10 transition-colors"><Copy className="h-3.5 w-3.5" /></button>
      <button onClick={() => { onDelete?.(); toast.success('Deleted'); }} className="px-1 py-1 rounded-[var(--ds-radius-control,8px)] text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
      <button ref={setAnchor('more')} onClick={() => toggleDropdown('more')} className="px-1 py-1 rounded-[var(--ds-radius-control,8px)] text-white/25 hover:text-white hover:bg-white/10 transition-colors"><MoreHorizontal className="h-3.5 w-3.5" /></button>

      {openDropdown === 'more' && createPortal(
        <div ref={menuRef} data-editor-chrome="true" style={menuStyle} className="fixed w-40 bg-[#2a2a2a] rounded-[var(--ds-radius-menu,12px)] border border-white/[0.08] py-1 shadow-2xl z-[70]">
          <button onClick={() => { onDuplicate?.(); setOpenDropdown(null); }} className="w-full px-3 py-1.5 text-left text-[13px] text-white/50 hover:text-white hover:bg-white/5 flex items-center gap-2"><Copy className="h-3.5 w-3.5" /> Duplicate</button>
          <button onClick={() => { onChangeStyle('opacity', '0.5'); setOpenDropdown(null); }} className="w-full px-3 py-1.5 text-left text-[13px] text-white/50 hover:text-white hover:bg-white/5">Set opacity 50%</button>
          <button onClick={() => { onChangeStyle('opacity', '1'); setOpenDropdown(null); }} className="w-full px-3 py-1.5 text-left text-[13px] text-white/50 hover:text-white hover:bg-white/5">Reset opacity</button>
          <div className="my-1 mx-2 border-t border-white/[0.06]" />
          <button onClick={() => { onDelete?.(); setOpenDropdown(null); }} className="w-full px-3 py-1.5 text-left text-[13px] text-red-400 hover:bg-red-400/10 flex items-center gap-2"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
        </div>,
        document.body,
      )}
    </div>
  );

  return inline ? toolbar : createPortal(toolbar, document.body);
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
