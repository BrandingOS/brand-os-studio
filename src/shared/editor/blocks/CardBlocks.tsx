/**
 * CardBlocks — the four reference cards (Vertical · Image · Metric ·
 * Horizontal) as one interactive stage, plus the selection model the
 * owner specified (2026-08-22):
 *
 * - The CARD has a selection; each TEXT and IMAGE inside has its own.
 * - Moving the card moves everything still inside it (they are its DOM
 *   children — the group is free).
 * - Dragging an inner item OUT of the card DETACHES it: it becomes a
 *   stage-level item and no longer follows the card.
 * - The metric card's number and bar are ONE value — drag the bar or
 *   type the number, both repaint.
 *
 * The CardToolbar edits the SELECTED card's config; when a text
 * selection is live inside an item, font/color/highlight changes apply
 * to that selection only — several fonts in one sentence.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  CARD_CORNER_RADIUS,
  CardAdornmentIcon,
  CardToolbar,
  defaultCardToolbarConfig,
  IconLibraryPopover,
  type CardKind,
  type CardToolbarConfig,
} from './CardToolbar';
import { FloatingToolbar } from './FloatingToolbar';

/** The editor's ONE selection colour (EditableSlide's rule). */
const SELECTION = '#3B82F6';

export interface CardTextItem {
  id: string;
  type: 'text';
  html: string;
  x: number;
  y: number;
  w: number;
  headline?: boolean;
  /** Corner-resize factor — scales this block's type with its box. */
  fontScale?: number;
  /** The text toolbar's per-block overrides (weight, size, color…). */
  style?: Record<string, string>;
}
export interface CardImageItem {
  id: string;
  type: 'image';
  src: string;
  x: number;
  y: number;
  w: number;
  fit?: string;
  opacity?: string;
}
export type CardItem = CardTextItem | CardImageItem;

export interface StageCard {
  id: string;
  kind: CardKind;
  x: number;
  y: number;
  /** CONTENT-space size — the room the items lay out in. Edge resizes
   *  change these (more room); corner resizes change `scale` (bigger
   *  everything, aspect preserved — the owner's rule 2026-08-22). */
  w: number;
  h: number;
  scale: number;
  config: CardToolbarConfig;
  items: CardItem[];
  metric?: number;
}

interface FreeItem {
  item: CardItem;
  x: number;
  y: number;
  /** Carried from the card it left, so its text keeps its look. */
  style: Pick<CardToolbarConfig, 'fontSize' | 'fontFamily' | 'fontWeight' | 'textColor'>;
}

type Selection =
  | { type: 'card'; cardId: string }
  | { type: 'item'; cardId: string | null; itemId: string }
  | null;

const PAD = 16;

let seq = 0;
const uid = () => `ci${++seq}`;

function cardConfig(kind: CardKind, patch?: Partial<CardToolbarConfig>): CardToolbarConfig {
  return { ...defaultCardToolbarConfig(), kind, ...patch };
}

/** The three upright cards share ONE default size (owner rule
 *  2026-08-22 — reference #65). */
const UPRIGHT_W = 214;
const UPRIGHT_H = 320;

const DEFAULT_KIND_W: Record<CardKind, number> = {
  vertical: UPRIGHT_W,
  image: UPRIGHT_W,
  metric: UPRIGHT_W,
  horizontal: 448,
};

export function initialStageCards(imageSrc: string): StageCard[] {
  // Every card arrives EMPTY — a "Write something" placeholder where its
  // text belongs, nothing pre-written (owner rule 2026-08-22).
  return [
    {
      id: 'card-vertical',
      kind: 'vertical',
      scale: 1,
      x: 12,
      y: 12,
      w: UPRIGHT_W,
      h: UPRIGHT_H,
      config: cardConfig('vertical'),
      items: [{ id: uid(), type: 'text', html: '', x: 0, y: 0, w: 182 }],
    },
    {
      id: 'card-image',
      kind: 'image',
      scale: 1,
      x: 246,
      y: 12,
      w: UPRIGHT_W,
      h: UPRIGHT_H,
      config: cardConfig('image'),
      items: [
        { id: uid(), type: 'text', html: '', x: 0, y: 0, w: 182 },
        { id: uid(), type: 'image', src: imageSrc, x: 0, y: 66, w: 182 },
      ],
    },
    {
      id: 'card-metric',
      kind: 'metric',
      scale: 1,
      x: 480,
      y: 12,
      w: UPRIGHT_W,
      h: UPRIGHT_H,
      config: cardConfig('metric'),
      metric: 50,
      items: [{ id: uid(), type: 'text', html: '', x: 0, y: 240, w: 182 }],
    },
    {
      id: 'card-horizontal',
      kind: 'horizontal',
      scale: 1,
      x: 12,
      y: 376,
      w: 448,
      h: 60,
      config: cardConfig('horizontal'),
      // y centres the 16px/1.45 line in the 60px card: (60−32−23.2)/2.
      items: [{ id: uid(), type: 'text', html: '', x: 0, y: 2, w: 240 }],
    },
  ];
}

/** Document-level drag helper — move/up listeners live on the document
 *  so a fast pointer never escapes the handle. */
function startDrag(
  e: React.MouseEvent,
  onMove: (dx: number, dy: number) => void,
  onEnd?: (dx: number, dy: number, moved: boolean) => void,
) {
  e.preventDefault();
  const x0 = e.clientX;
  const y0 = e.clientY;
  let moved = false;
  const move = (ev: MouseEvent) => {
    const dx = ev.clientX - x0;
    const dy = ev.clientY - y0;
    if (!moved && Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    if (moved) onMove(dx, dy);
  };
  const up = (ev: MouseEvent) => {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    onEnd?.(ev.clientX - x0, ev.clientY - y0, moved);
  };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}

/** Uncontrolled contentEditable — the DOM owns the text while editing;
 *  state only learns it on commit, so re-renders never eat the caret. */
function EditableHtml({
  html,
  editing,
  style,
  onCommit,
  onDoubleClick,
}: {
  html: string;
  editing: boolean;
  style?: CSSProperties;
  onCommit: (html: string) => void;
  onDoubleClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!editing && el.innerHTML !== html) el.innerHTML = html;
  }, [html, editing]);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);
  return (
    <div
      ref={ref}
      contentEditable={editing}
      suppressContentEditableWarning
      style={{ outline: 'none', ...style }}
      onDoubleClick={onDoubleClick}
      onMouseDown={(e) => {
        if (editing) e.stopPropagation();
      }}
      onBlur={() => onCommit(ref.current?.innerHTML ?? '')}
      onKeyDown={(e) => {
        if (e.key === 'Escape') (e.currentTarget as HTMLElement).blur();
      }}
    />
  );
}

/** The metric number — LIVE (owner request 2026-08-22): every typed
 *  digit repaints the bar instantly, and ArrowUp/ArrowDown (held —
 *  key-repeat) climb and fall continuously. React never renders the
 *  text: effects own it, so mid-typing state updates can repaint the
 *  BAR without rewriting the number under the caret. */
function MetricNumber({
  value,
  editing,
  style,
  onLive,
  onCommit,
  onDoubleClick,
  onMouseDown,
}: {
  value: number;
  editing: boolean;
  style: CSSProperties;
  onLive: (n: number) => void;
  onCommit: (n: number | null) => void;
  onDoubleClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const read = () => {
    const n = parseInt(ref.current?.textContent?.replace(/[^\d]/g, '') ?? '', 10);
    return Number.isFinite(n) ? clamp(n) : null;
  };
  useEffect(() => {
    const el = ref.current;
    if (!el || editing) return;
    const text = `${value}%`;
    if (el.textContent !== text) el.textContent = text;
  }, [value, editing]);
  useEffect(() => {
    const el = ref.current;
    if (!el || !editing) return;
    // The % sign STAYS while editing (owner request 2026-08-22) — only
    // the DIGITS are selected, so typing replaces the number and never
    // eats the sign.
    const digits = el.textContent?.replace(/[^\d]/g, '') || String(value);
    el.textContent = `${digits}%`;
    el.focus();
    const node = el.firstChild;
    if (node) {
      const sel = window.getSelection();
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, digits.length);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    // The starting value must not depend on `value` re-running this —
    // the effect keys on `editing` alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);
  return (
    <div
      ref={ref}
      data-metric-value="true"
      contentEditable={editing}
      suppressContentEditableWarning
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onInput={() => {
        const n = read();
        if (n !== null) onLive(n);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = clamp((read() ?? value) + (e.key === 'ArrowUp' ? 1 : -1));
          const el = ref.current;
          if (el) el.textContent = `${next}%`;
          onLive(next);
          const node = el?.firstChild;
          if (node) {
            // Caret at the end of the DIGITS, before the sign.
            const sel = window.getSelection();
            const range = document.createRange();
            range.setStart(node, String(next).length);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
          return;
        }
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      onBlur={() => onCommit(read())}
      style={style}
    />
  );
}

type ResizeZone = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const ZONE_CURSOR: Record<ResizeZone, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};

const CARD_ZONES: ResizeZone[] = ['n', 's', 'e', 'w', 'nw', 'ne', 'se', 'sw'];
const ITEM_ZONES: ResizeZone[] = ['e', 'w', 'nw', 'ne', 'se', 'sw'];

/** Invisible resize regions hugging a selected box — the cursor is the
 *  affordance, exactly like the slide selection (owner rule 2026-08-22).
 *  Edges resize ONE side; corners scale the whole thing, aspect kept. */
function ResizeZones({
  zones,
  dataAttr,
  onStart,
}: {
  zones: ResizeZone[];
  dataAttr: 'data-card-resize' | 'data-item-resize';
  onStart: (zone: ResizeZone, e: React.MouseEvent) => void;
}) {
  const T = 10;
  const C = 16;
  const style = (z: ResizeZone): CSSProperties => {
    const base: CSSProperties = { position: 'absolute', zIndex: 6, cursor: ZONE_CURSOR[z] };
    switch (z) {
      case 'n':
        return { ...base, top: -T / 2, left: C, right: C, height: T };
      case 's':
        return { ...base, bottom: -T / 2, left: C, right: C, height: T };
      case 'e':
        return { ...base, top: C, bottom: C, right: -T / 2, width: T };
      case 'w':
        return { ...base, top: C, bottom: C, left: -T / 2, width: T };
      case 'nw':
        return { ...base, top: -T / 2, left: -T / 2, width: C, height: C };
      case 'ne':
        return { ...base, top: -T / 2, right: -T / 2, width: C, height: C };
      case 'se':
        return { ...base, bottom: -T / 2, right: -T / 2, width: C, height: C };
      case 'sw':
        return { ...base, bottom: -T / 2, left: -T / 2, width: C, height: C };
    }
  };
  return (
    <>
      {zones.map((z) => (
        <div
          key={z}
          {...({ [dataAttr]: z } as Record<string, string>)}
          style={style(z)}
          onMouseDown={(e) => {
            e.stopPropagation();
            onStart(z, e);
          }}
        />
      ))}
    </>
  );
}

export function CardStage({
  imageSrc,
  kinds,
  height,
  onTurnInto,
}: {
  imageSrc: string;
  /** Show only these card kinds, packed from the top-left — the element
   *  library mounts one stage per card. Omit for the full four-card set. */
  kinds?: CardKind[];
  height?: number;
  /** A NON-card pick in the card toolbar's Turn into — the HOST owns
   *  leaving card-land (card:* picks are applied here as kind changes). */
  onTurnInto?: (id: string) => void;
}) {
  const [cards, setCards] = useState<StageCard[]>(() => {
    const all = initialStageCards(imageSrc);
    if (!kinds) return all;
    let x = 12;
    return all
      .filter((c) => kinds.includes(c.kind))
      .map((c) => {
        const placed = { ...c, x, y: 12 };
        x += c.w + 22;
        return placed;
      });
  });
  const [free, setFree] = useState<FreeItem[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [iconAnchor, setIconAnchor] = useState<{
    cardId: string;
    rect: { top: number; left: number; width: number; height: number };
  } | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  /** The live text selection inside an editing item — restored before a
   *  toolbar change applies, so one sentence can wear several fonts. */
  const savedRangeRef = useRef<Range | null>(null);

  // The card toolbar shows ONLY for a card selection; picking an item
  // swaps it for that item's OWN toolbar (owner rule 2026-08-22).
  const selectedCardId = selection?.type === 'card' ? selection.cardId : null;
  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;
  const selectedItemId = selection?.type === 'item' ? selection.itemId : null;
  const selectedItemEntry = (() => {
    if (!selectedItemId) return null;
    for (const c of cards) {
      const item = c.items.find((i) => i.id === selectedItemId);
      if (item) return { item, card: c as StageCard | null };
    }
    const f = free.find((p) => p.item.id === selectedItemId);
    return f ? { item: f.item, card: null } : null;
  })();

  // The toolbars follow their anchors — the card's box or the item's.
  type Rect = { top: number; left: number; width: number; height: number };
  const [barRect, setBarRect] = useState<Rect | null>(null);
  const [itemRect, setItemRect] = useState<Rect | null>(null);
  const measureBar = useCallback(() => {
    const read = (el: HTMLElement | null | undefined): Rect | null => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    };
    setBarRect(selectedCardId ? read(cardRefs.current[selectedCardId]) : null);
    setItemRect(selectedItemId ? read(itemRefs.current[selectedItemId]) : null);
  }, [selectedCardId, selectedItemId]);
  useLayoutEffect(() => {
    measureBar();
  }, [measureBar, cards, free]);
  useEffect(() => {
    if (!selectedCardId && !selectedItemId) return;
    window.addEventListener('resize', measureBar);
    window.addEventListener('scroll', measureBar, true);
    return () => {
      window.removeEventListener('resize', measureBar);
      window.removeEventListener('scroll', measureBar, true);
    };
  }, [selectedCardId, selectedItemId, measureBar]);

  // A press OUTSIDE the stage clears the selection — the stage can sit
  // frameless on a larger canvas (the sandbox), and its toolbar must
  // leave when the user moves on to another block. CAPTURE phase: other
  // blocks stopPropagation their mousedown, which kills a bubble-phase
  // document listener; capture runs before anyone can stop anything.
  // The editor chrome portals are exempt (they ARE the selection's UI).
  useEffect(() => {
    if (!selection) return;
    const onDown = (e: MouseEvent) => {
      // Document-level listener: e.target can be document itself or a text
      // node — only Elements have closest().
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      if (stageRef.current?.contains(t)) return;
      if (t.closest('[data-editor-chrome],[data-icon-library]')) return;
      setSelection(null);
      setEditingId(null);
      setIconAnchor(null);
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [selection]);

  // Remember the in-editable selection so toolbar clicks can restore it.
  useEffect(() => {
    if (!editingId) return;
    const remember = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      const host = stageRef.current;
      if (host && host.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    };
    document.addEventListener('selectionchange', remember);
    return () => document.removeEventListener('selectionchange', remember);
  }, [editingId]);

  const patchCard = (id: string, patch: Partial<StageCard>) =>
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const patchConfig = (id: string, patch: Partial<CardToolbarConfig>) =>
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, config: { ...c.config, ...patch } } : c)),
    );
  const patchItem = (cardId: string, itemId: string, patch: Partial<CardItem>) =>
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              items: c.items.map((i) => (i.id === itemId ? ({ ...i, ...patch } as CardItem) : i)),
            }
          : c,
      ),
    );

  /** Patch an item WHEREVER it lives — inside a card or freed. */
  const patchAnyItem = (itemId: string, up: (i: CardItem) => CardItem) => {
    setCards((prev) =>
      prev.map((c) => ({ ...c, items: c.items.map((i) => (i.id === itemId ? up(i) : i)) })),
    );
    setFree((prev) => prev.map((f) => (f.item.id === itemId ? { ...f, item: up(f.item) } : f)));
  };
  const removeAnyItem = (itemId: string) => {
    setCards((prev) =>
      prev.map((c) => ({ ...c, items: c.items.filter((i) => i.id !== itemId) })),
    );
    setFree((prev) => prev.filter((f) => f.item.id !== itemId));
    setSelection(null);
  };
  const duplicateAnyItem = (itemId: string) => {
    const copyId = uid();
    setCards((prev) =>
      prev.map((c) => {
        const item = c.items.find((i) => i.id === itemId);
        if (!item) return c;
        return { ...c, items: [...c.items, { ...item, id: copyId, x: item.x + 12, y: item.y + 12 }] };
      }),
    );
    setFree((prev) => {
      const f = prev.find((p) => p.item.id === itemId);
      if (!f) return prev;
      return [...prev, { ...f, item: { ...f.item, id: copyId }, x: f.x + 12, y: f.y + 12 }];
    });
  };

  /** The item toolbars' style channel. Text: a live word selection wins
   *  (several styles in one sentence), else the whole block; image:
   *  replace / fit / opacity. */
  const changeItemStyle = (key: string, value: string) => {
    if (!selectedItemEntry) return;
    const { item } = selectedItemEntry;
    if (item.type === 'image') {
      if (key === '__replaceImageSrc')
        patchAnyItem(item.id, (i) => ({ ...i, src: value }) as CardItem);
      else if (key === 'objectFit') patchAnyItem(item.id, (i) => ({ ...i, fit: value }) as CardItem);
      else if (key === 'opacity')
        patchAnyItem(item.id, (i) => ({ ...i, opacity: value }) as CardItem);
      return;
    }
    const range = savedRangeRef.current;
    if (key === 'color' && editingId === item.id && range && !range.collapsed) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('foreColor', false, value);
        return;
      }
    }
    patchAnyItem(item.id, (i) =>
      i.type === 'text' ? { ...i, style: { ...i.style, [key]: value } } : i,
    );
  };

  /** Selection-scoped rich edit — the "several fonts in one sentence"
   *  path. Returns false when there is no live selection to restyle. */
  const applyToSelection = (patch: Partial<CardToolbarConfig>): boolean => {
    const range = savedRangeRef.current;
    if (!editingId || !range || range.collapsed) return false;
    const keys = Object.keys(patch);
    const rich = keys.every((k) => ['fontFamily', 'textColor', 'highlight'].includes(k));
    if (!rich || keys.length === 0) return false;
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('styleWithCSS', false, 'true');
    if (patch.fontFamily) document.execCommand('fontName', false, patch.fontFamily);
    if (patch.textColor) document.execCommand('foreColor', false, patch.textColor);
    if (patch.highlight !== undefined)
      document.execCommand('hiliteColor', false, patch.highlight || 'transparent');
    return true;
  };

  const handleToolbarChange = (patch: Partial<CardToolbarConfig>) => {
    if (!selectedCard) return;
    if (applyToSelection(patch)) return;
    // A KIND pick transforms the card ITSELF — body, box and defaults —
    // not just the config flag the menu's ✓ reads. Without this the menu
    // said "changed" while the card stayed what it was (owner bug
    // 2026-08-23).
    if (patch.kind && patch.kind !== selectedCard.kind) {
      const kind = patch.kind;
      setCards((prev) =>
        prev.map((c) =>
          c.id === selectedCard.id
            ? {
                ...c,
                kind,
                w: DEFAULT_KIND_W[kind],
                h: kind === 'horizontal' ? 60 : UPRIGHT_H,
                metric: kind === 'metric' ? (c.metric ?? 50) : c.metric,
                config: { ...c.config, ...patch },
              }
            : c,
        ),
      );
      return;
    }
    patchConfig(selectedCard.id, patch);
  };

  const detachItem = (card: StageCard, item: CardItem, atX: number, atY: number) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id ? { ...c, items: c.items.filter((i) => i.id !== item.id) } : c,
      ),
    );
    const s = card.scale;
    setFree((prev) => [
      ...prev,
      {
        // The card's scale is BAKED into the freed item's box and type,
        // so it keeps its visual size on the unscaled stage.
        item: { ...item, x: 0, y: 0, w: item.w * s },
        x: card.x + (PAD + atX) * s,
        y: card.y + (PAD + atY) * s,
        style: {
          fontSize: Math.round(
            (item.type === 'text' && item.headline
              ? card.config.fontSize * 1.15
              : card.config.fontSize) * s,
          ),
          fontFamily: card.config.fontFamily,
          fontWeight: card.config.fontWeight,
          textColor: card.config.textColor,
        },
      },
    ]);
    setSelection({ type: 'item', cardId: null, itemId: item.id });
  };

  const duplicateCard = (card: StageCard) => {
    const copy: StageCard = {
      ...card,
      id: uid(),
      x: card.x + 24,
      y: card.y + 24,
      items: card.items.map((i) => ({ ...i, id: uid() })),
    };
    setCards((prev) => [...prev, copy]);
    setSelection({ type: 'card', cardId: copy.id });
  };

  const renderItem = (card: StageCard, item: CardItem, adornOffset: number) => {
    const isSelected = selection?.type === 'item' && selection.itemId === item.id;
    const editing = editingId === item.id;
    const s = card.scale;
    const base: CSSProperties = {
      position: 'absolute',
      left: PAD + item.x,
      top: PAD + item.y + adornOffset,
      width: item.w,
      cursor: editing ? 'text' : 'move',
      borderRadius: 4,
      outline: isSelected ? `${1.5 / s}px solid ${SELECTION}` : undefined,
      outlineOffset: 2,
    };
    const onMouseDown = (e: React.MouseEvent) => {
      if (editing) return;
      e.stopPropagation();
      setSelection({ type: 'item', cardId: card.id, itemId: item.id });
      const startX = item.x;
      const startY = item.y;
      startDrag(
        e,
        // Screen deltas ÷ the card's scale = content-space deltas.
        (dx, dy) => patchItem(card.id, item.id, { x: startX + dx / s, y: startY + dy / s }),
        (dx, dy, moved) => {
          if (!moved) {
            // A bare CLICK on an empty text starts writing in place —
            // the placeholder's whole point (owner request 2026-08-22).
            if (item.type === 'text' && !item.html) setEditingId(item.id);
            return;
          }
          const nx = startX + dx / s;
          const ny = startY + dy / s;
          // Detach when the item's CENTER leaves the card (owner rule:
          // pulled outside = out of the group).
          const cx = PAD + nx + item.w / 2;
          const cy = PAD + ny + adornOffset + 12;
          const outside = cx < 0 || cx > card.w || cy < 0 || cy > card.h;
          if (outside) detachItem(card, { ...item, x: nx, y: ny }, nx, ny + adornOffset);
        },
      );
    };
    // The same selection language as the card: sides give room, corners
    // scale the whole block (text grows its type with its box).
    const startItemResize = (zone: ResizeZone, e: React.MouseEvent) => {
      setSelection({ type: 'item', cardId: card.id, itemId: item.id });
      const x0 = item.x;
      const w0 = item.w;
      const f0 = item.type === 'text' ? (item.fontScale ?? 1) : 1;
      startDrag(e, (dx) => {
        if (zone === 'e') {
          patchItem(card.id, item.id, { w: Math.max(32, w0 + dx / s) });
        } else if (zone === 'w') {
          const w = Math.max(32, w0 - dx / s);
          patchItem(card.id, item.id, { w, x: x0 + (w0 - w) });
        } else {
          const east = zone === 'ne' || zone === 'se';
          const f = Math.max(0.3, (w0 * s + (east ? dx : -dx)) / (w0 * s));
          const w = Math.max(24, w0 * f);
          const patch: Partial<CardTextItem> = { w, x: east ? x0 : x0 + (w0 - w) };
          if (item.type === 'text') patch.fontScale = f0 * f;
          patchItem(card.id, item.id, patch);
        }
      });
    };
    const zones = isSelected && !editing && (
      <ResizeZones zones={ITEM_ZONES} dataAttr="data-item-resize" onStart={startItemResize} />
    );
    const setItemRef = (el: HTMLDivElement | null) => {
      itemRefs.current[item.id] = el;
    };
    if (item.type === 'image') {
      return (
        <div key={item.id} ref={setItemRef} data-card-item={item.id} data-item-selected={isSelected || undefined} style={base} onMouseDown={onMouseDown}>
          <img
            src={item.src}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              borderRadius: 10,
              display: 'block',
              objectFit: (item.fit as CSSProperties['objectFit']) ?? undefined,
              opacity: item.opacity ? Number(item.opacity) : undefined,
            }}
          />
          {zones}
        </div>
      );
    }
    const textStyle: CSSProperties = {
      fontSize:
        (item.headline ? Math.round(card.config.fontSize * 1.15) : card.config.fontSize) *
        (item.fontScale ?? 1),
      fontWeight: item.headline ? 600 : Number(card.config.fontWeight),
      lineHeight: 1.45,
      opacity: item.headline ? 1 : 0.72,
      minHeight: 18,
      // The text toolbar's own overrides win over the card's.
      ...(item.style as CSSProperties | undefined),
    };
    return (
      <div key={item.id} ref={setItemRef} data-card-item={item.id} data-item-selected={isSelected || undefined} style={base} onMouseDown={onMouseDown}>
        {!item.html && !editing && (
          <span
            data-card-placeholder="true"
            style={{
              ...textStyle,
              position: 'absolute',
              inset: 0,
              opacity: 0.4,
              pointerEvents: 'none',
            }}
          >
            Write something
          </span>
        )}
        <EditableHtml
          html={item.html}
          editing={editing}
          onDoubleClick={() => setEditingId(item.id)}
          onCommit={(html) => {
            patchItem(card.id, item.id, { html });
            setEditingId((prev) => (prev === item.id ? null : prev));
            savedRangeRef.current = null;
          }}
          style={textStyle}
        />
        {zones}
      </div>
    );
  };

  const renderMetric = (card: StageCard) => {
    const value = Math.round(card.metric ?? 0);
    const editing = editingId === `${card.id}-metric`;
    return (
      <>
        {/* The bar — dragging it writes the value. */}
        <div
          data-metric-track="true"
          style={{
            position: 'absolute',
            left: PAD,
            right: PAD,
            top: PAD + 4,
            height: 6,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.22)',
            cursor: 'ew-resize',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setSelection({ type: 'card', cardId: card.id });
            const track = e.currentTarget.getBoundingClientRect();
            const apply = (clientX: number) => {
              const pct = Math.round(((clientX - track.left) / track.width) * 100);
              patchCard(card.id, { metric: Math.max(0, Math.min(100, pct)) });
            };
            apply(e.clientX);
            startDrag(e, (dx) => apply(e.clientX + dx));
          }}
        >
          <div
            data-metric-fill="true"
            style={{
              width: `${value}%`,
              height: '100%',
              borderRadius: 3,
              background: card.config.textColor,
              pointerEvents: 'none',
            }}
          />
        </div>
        {/* The number — one value with the bar. LIVE: each typed digit
            and each ArrowUp/ArrowDown (held = continuous) repaints the
            bar instantly (owner request 2026-08-22). */}
        <MetricNumber
          value={value}
          editing={editing}
          onLive={(n) => patchCard(card.id, { metric: n })}
          onCommit={(n) => {
            if (n !== null) patchCard(card.id, { metric: n });
            setEditingId((prev) => (prev === `${card.id}-metric` ? null : prev));
          }}
          onDoubleClick={() => setEditingId(`${card.id}-metric`)}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (!editing) setSelection({ type: 'card', cardId: card.id });
          }}
          style={{
            position: 'absolute',
            top: PAD + 22,
            insetInlineStart: PAD,
            fontSize: Math.round(card.config.fontSize * 3.4),
            fontWeight: 500,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            cursor: editing ? 'text' : 'default',
            outline: 'none',
          }}
        />
      </>
    );
  };

  const renderCard = (card: StageCard) => {
    const isSelected = selectedCardId === card.id;
    const s = card.scale;
    const dir = card.items.some(
      (i) => i.type === 'text' && /[؀-ۿ]/.test(i.html),
    )
      ? 'rtl'
      : 'ltr';
    const adornOffset =
      card.config.adornment !== 'none' && card.kind !== 'horizontal' ? 38 : 0;
    // Edges give the card ROOM (content reflows); corners scale the whole
    // card — content included, aspect preserved (owner rule 2026-08-22).
    const startCardResize = (zone: ResizeZone, e: React.MouseEvent) => {
      setSelection({ type: 'card', cardId: card.id });
      const { x: x0, y: y0, w: w0, h: h0 } = card;
      const s0 = card.scale;
      const pxW = w0 * s0;
      startDrag(e, (dx, dy) => {
        if (zone === 'e') {
          patchCard(card.id, { w: Math.max(120, w0 + dx / s0) });
        } else if (zone === 'w') {
          const w = Math.max(120, w0 - dx / s0);
          patchCard(card.id, { w, x: x0 + (w0 - w) * s0 });
        } else if (zone === 's') {
          patchCard(card.id, { h: Math.max(48, h0 + dy / s0) });
        } else if (zone === 'n') {
          const h = Math.max(48, h0 - dy / s0);
          patchCard(card.id, { h, y: y0 + (h0 - h) * s0 });
        } else {
          const east = zone === 'ne' || zone === 'se';
          const south = zone === 'se' || zone === 'sw';
          const f = Math.max(0.35, (pxW + (east ? dx : -dx)) / pxW);
          const next = s0 * f;
          patchCard(card.id, {
            scale: next,
            x: east ? x0 : x0 + w0 * (s0 - next),
            y: south ? y0 : y0 + h0 * (s0 - next),
          });
        }
      });
    };
    return (
      <div
        key={card.id}
        ref={(el) => {
          cardRefs.current[card.id] = el;
        }}
        data-card={card.kind}
        data-card-selected={isSelected || undefined}
        dir={dir}
        style={{
          position: 'absolute',
          left: card.x,
          top: card.y,
          width: card.w * s,
          height: card.h * s,
          background: card.config.background,
          borderRadius: CARD_CORNER_RADIUS[card.config.corners] * s,
          border: '1px solid rgba(255,255,255,0.06)',
          outline: isSelected ? `1.5px solid ${SELECTION}` : undefined,
          outlineOffset: 2,
          cursor: 'move',
          userSelect: editingId ? undefined : 'none',
        }}
        onMouseDown={(e) => {
          const t = e.target as HTMLElement;
          if (
            t.closest(
              '[data-card-item],[data-card-icon],[data-card-number],[data-metric-track],[data-metric-value],[data-card-resize],[data-item-resize]',
            )
          )
            return;
          e.stopPropagation();
          setSelection({ type: 'card', cardId: card.id });
          const sx = card.x;
          const sy = card.y;
          startDrag(e, (dx, dy) => patchCard(card.id, { x: sx + dx, y: sy + dy }));
        }}
      >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: card.w,
          height: card.h,
          transform: `scale(${s})`,
          transformOrigin: 'top left',
          color: card.config.textColor,
          textAlign: card.config.align,
          fontFamily: card.config.fontFamily ? `'${card.config.fontFamily}', sans-serif` : undefined,
        }}
      >
        {/* Adornment — icon or number pill at the reading start. */}
        {card.config.adornment === 'icon' && (
          <button
            type="button"
            data-card-icon="true"
            aria-label="Card icon"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setSelection({ type: 'card', cardId: card.id });
              setIconAnchor({
                cardId: card.id,
                rect: { top: r.top, left: r.left, width: r.width, height: r.height },
              });
            }}
            style={{
              position: 'absolute',
              top: PAD - 2,
              insetInlineStart: PAD,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: card.config.iconColor,
            }}
          >
            <CardAdornmentIcon
              name={card.config.iconName}
              color={card.config.iconColor}
              scale={card.config.iconScale}
            />
          </button>
        )}
        {card.config.adornment === 'number' && (
          <span
            data-card-number="true"
            onMouseDown={(e) => {
              e.stopPropagation();
              setSelection({ type: 'card', cardId: card.id });
            }}
            style={{
              position: 'absolute',
              top: PAD - 2,
              insetInlineStart: PAD,
              padding: '2px 8px',
              borderRadius: 8,
              border: '1px solid',
              borderColor: 'color-mix(in srgb, currentColor 35%, transparent)',
              fontSize: 12,
              lineHeight: '18px',
            }}
          >
            {card.config.numberLabel}
          </span>
        )}
        {card.items.map((item) => renderItem(card, item, adornOffset))}
        {card.kind === 'metric' && renderMetric(card)}
      </div>
        {isSelected && (
          <ResizeZones zones={CARD_ZONES} dataAttr="data-card-resize" onStart={startCardResize} />
        )}
      </div>
    );
  };

  const renderFree = (f: FreeItem, index: number) => {
    const isSelected = selection?.type === 'item' && selection.itemId === f.item.id;
    const editing = editingId === f.item.id;
    const item = f.item;
    const startFreeResize = (zone: ResizeZone, e: React.MouseEvent) => {
      setSelection({ type: 'item', cardId: null, itemId: item.id });
      const x0 = f.x;
      const w0 = item.w;
      const f0 = item.type === 'text' ? (item.fontScale ?? 1) : 1;
      const apply = (patch: Partial<FreeItem>, itemPatch?: Partial<CardTextItem>) =>
        setFree((prev) =>
          prev.map((p, i) =>
            i === index
              ? { ...p, ...patch, item: itemPatch ? ({ ...p.item, ...itemPatch } as CardItem) : p.item }
              : p,
          ),
        );
      startDrag(e, (dx) => {
        if (zone === 'e') {
          apply({}, { w: Math.max(32, w0 + dx) });
        } else if (zone === 'w') {
          const w = Math.max(32, w0 - dx);
          apply({ x: x0 + (w0 - w) }, { w });
        } else {
          const east = zone === 'ne' || zone === 'se';
          const factor = Math.max(0.3, (w0 + (east ? dx : -dx)) / w0);
          const w = Math.max(24, w0 * factor);
          apply(
            { x: east ? x0 : x0 + (w0 - w) },
            item.type === 'text' ? { w, fontScale: f0 * factor } : { w },
          );
        }
      });
    };
    return (
      <div
        key={item.id}
        ref={(el) => {
          itemRefs.current[item.id] = el;
        }}
        data-free-item={item.id}
        data-item-selected={isSelected || undefined}
        style={{
          position: 'absolute',
          left: f.x,
          top: f.y,
          width: item.w,
          cursor: editing ? 'text' : 'move',
          borderRadius: 4,
          outline: isSelected ? `1.5px solid ${SELECTION}` : undefined,
          outlineOffset: 2,
          color: f.style.textColor,
          fontFamily: f.style.fontFamily ? `'${f.style.fontFamily}', sans-serif` : undefined,
        }}
        onMouseDown={(e) => {
          if (editing) return;
          e.stopPropagation();
          setSelection({ type: 'item', cardId: null, itemId: item.id });
          const sx = f.x;
          const sy = f.y;
          startDrag(e, (dx, dy) =>
            setFree((prev) =>
              prev.map((p, i) => (i === index ? { ...p, x: sx + dx, y: sy + dy } : p)),
            ),
          );
        }}
      >
        {item.type === 'image' ? (
          <img
            src={item.src}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              borderRadius: 10,
              display: 'block',
              objectFit: (item.fit as CSSProperties['objectFit']) ?? undefined,
              opacity: item.opacity ? Number(item.opacity) : undefined,
            }}
          />
        ) : (
          <EditableHtml
            html={item.html}
            editing={editing}
            onDoubleClick={() => setEditingId(item.id)}
            onCommit={(html) => {
              setFree((prev) =>
                prev.map((p, i) =>
                  i === index ? { ...p, item: { ...p.item, html } as CardItem } : p,
                ),
              );
              setEditingId((prev) => (prev === item.id ? null : prev));
            }}
            style={{
              fontSize: f.style.fontSize * (item.fontScale ?? 1),
              fontWeight: Number(f.style.fontWeight),
              lineHeight: 1.45,
              minHeight: 18,
              ...(item.style as CSSProperties | undefined),
            }}
          />
        )}
        {isSelected && !editing && (
          <ResizeZones zones={ITEM_ZONES} dataAttr="data-item-resize" onStart={startFreeResize} />
        )}
      </div>
    );
  };

  const iconCard = iconAnchor ? cards.find((c) => c.id === iconAnchor.cardId) : null;

  return (
    <div
      ref={stageRef}
      data-card-stage="true"
      style={{
        position: 'relative',
        // Every child is absolutely positioned, so the stage has NO
        // intrinsic width — in a centering flex parent (the element
        // library's showcase ground) auto width collapses to 0. The
        // packed layout's width is spelled out instead.
        width: kinds
          ? 24 + kinds.reduce((acc, k, i) => acc + DEFAULT_KIND_W[k] + (i ? 22 : 0), 0)
          : undefined,
        height: height ?? 452,
        // Single-card mode is FRAMELESS (owner request 2026-08-23): no
        // box around the card, no clipping — the card is the thing, and
        // it can be dragged anywhere.
        borderRadius: kinds ? undefined : 12,
        border: kinds ? undefined : '1px solid var(--ds-border)',
        background: kinds ? 'transparent' : '#141416',
        overflow: kinds ? 'visible' : 'hidden',
        color: '#E9E9EB',
      }}
      onMouseDown={() => {
        setSelection(null);
        setEditingId(null);
        setIconAnchor(null);
      }}
    >
      {cards.map(renderCard)}
      {free.map(renderFree)}

      {/* The CARD toolbar shows only while the card itself is selected;
          picking a text or an image swaps it for that item's own bar,
          anchored over the item (owner rules 2026-08-22). */}
      {selectedCard && barRect && (
        <CardToolbar
          label="Card"
          config={selectedCard.config}
          position={barRect}
          onChange={handleToolbarChange}
          onTurnInto={onTurnInto}
          onExpand={() => {}}
          onDuplicate={() => duplicateCard(selectedCard)}
          onDelete={() => {
            setCards((prev) => prev.filter((c) => c.id !== selectedCard.id));
            setSelection(null);
          }}
        />
      )}
      {selectedItemEntry && itemRect && (
        <FloatingToolbar
          blockType={
            selectedItemEntry.item.type === 'image'
              ? 'image'
              : selectedItemEntry.item.headline
                ? 'heading'
                : 'text'
          }
          style={
            selectedItemEntry.item.type === 'image'
              ? { objectFit: selectedItemEntry.item.fit ?? 'cover' }
              : {
                  fontWeight:
                    selectedItemEntry.item.style?.fontWeight ??
                    (selectedItemEntry.item.headline ? '600' : '400'),
                  fontStyle: selectedItemEntry.item.style?.fontStyle,
                  textAlign: selectedItemEntry.item.style?.textAlign,
                  color: selectedItemEntry.item.style?.color,
                  fontSize: selectedItemEntry.item.style?.fontSize,
                }
          }
          position={itemRect}
          onChangeType={() => {}}
          onChangeStyle={changeItemStyle}
          onDuplicate={() => duplicateAnyItem(selectedItemEntry.item.id)}
          onDelete={() => removeAnyItem(selectedItemEntry.item.id)}
        />
      )}

      {iconCard && iconAnchor && (
        <IconLibraryPopover
          anchor={iconAnchor.rect}
          iconName={iconCard.config.iconName}
          iconColor={iconCard.config.iconColor}
          iconScale={iconCard.config.iconScale}
          onPick={(name) => patchConfig(iconCard.id, { iconName: name })}
          onColor={(hex) => patchConfig(iconCard.id, { iconColor: hex })}
          onScale={(pct) => patchConfig(iconCard.id, { iconScale: pct })}
          onClose={() => setIconAnchor(null)}
        />
      )}
    </div>
  );
}
