/**
 * EditableSlide — wraps a slide's render output and makes
 * text elements clickable/editable with floating toolbars.
 *
 * Strategy: We intercept clicks on the slide content. When a user
 * clicks any text or image element, we detect it, show the selection
 * border and floating toolbar. Text becomes contentEditable on double-click.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { FloatingToolbar } from './FloatingToolbar';
import type { BlockType } from './BlockTypes';

interface EditableSlideProps {
  children?: React.ReactNode;
  /**
   * When set, the inner content is injected via dangerouslySetInnerHTML
   * instead of rendering React children. Used by EditorWorkspace to mount
   * a frozen HTML snapshot so the slide is fully decoupled from React
   * re-renders triggered by brand/settings/template prop changes.
   *
   * Click handlers and contentEditable still work because they're attached
   * to the outer wrapper, which delegates events from any child DOM node.
   */
  frozenHtml?: string;
  /**
   * Fires when the selected element changes (or selection clears).
   * Lets a host page render a side-panel property inspector for the
   * currently-selected layer. The host may keep the HTMLElement ref
   * and mutate its style directly; the MutationObserver will pick up
   * the change and persist it.
   */
  onSelectionChange?: (sel: SelectedElement | null) => void;
}

export interface SelectedElement {
  element: HTMLElement;
  type: BlockType;
  rect: DOMRect;
}

function detectBlockType(el: HTMLElement): BlockType {
  const tag = el.tagName.toLowerCase();
  if (tag === 'img' || tag === 'svg' || tag === 'picture') return 'image';
  if (tag === 'h1' || tag === 'h2' || tag === 'h3') return 'heading';
  if (tag === 'blockquote') return 'text';
  // SVG text nodes
  if (tag === 'text' || tag === 'tspan') return 'text';
  // Generic text-bearing tags
  const TEXT_TAGS = new Set(['p', 'span', 'div', 'a', 'li', 'td', 'th', 'dt', 'dd', 'label', 'button', 'figcaption', 'em', 'strong', 'small', 'b', 'i', 'mark', 'code']);
  if (TEXT_TAGS.has(tag)) {
    const fontSize = window.getComputedStyle(el).fontSize;
    const size = parseFloat(fontSize);
    if (size > 24) return 'heading';
    return 'text';
  }
  return 'text';
}

/** Screen rects of the element's rendered text lines. */
function textLineRects(el: HTMLElement): DOMRect[] {
  const range = document.createRange();
  range.selectNodeContents(el);
  return Array.from(range.getClientRects());
}

/**
 * Editing fills a text element with INLINE children — <br> per Enter,
 * styled <span>s per highlighted toolbar change, b/i from formatting.
 * None of that makes it a container: an element is a text LEAF until it
 * holds a real block child. Every leaf/container decision (selection,
 * drag, delete, the words-only rule) must go through this, or a paragraph
 * stops being selectable the moment the user presses Enter in it
 * (owner bug 2026-08-22).
 */
const INLINE_FORMAT_TAGS = new Set([
  'BR', 'SPAN', 'B', 'I', 'EM', 'STRONG', 'U', 'S', 'FONT', 'MARK', 'SUB', 'SUP', 'SMALL', 'WBR',
]);
function hasBlockChildren(el: HTMLElement): boolean {
  for (const child of Array.from(el.children)) {
    if (!INLINE_FORMAT_TAGS.has(child.tagName)) return true;
  }
  return false;
}

/**
 * Whether a point lands on the element's CONTENT, not merely inside its
 * box. A text element's box can be far wider than its words (an explicit
 * width, a stretched block) — and grabbing the empty part of that box makes
 * whatever sits under or beside it unreachable (owner request 2026-08-21:
 * "البوكس يظهر لو دوست فقط عالكلام"). The slop keeps the words comfortable
 * to hit without swallowing the neighbourhood.
 */
const TEXT_HIT_SLOP = 8;
function hitsContent(el: HTMLElement, x: number, y: number): boolean {
  const type = detectBlockType(el);
  if (type !== 'text' && type !== 'heading') return true;
  if (hasBlockChildren(el)) return true; // containers keep box behaviour
  const rects = textLineRects(el);
  if (rects.length === 0) return true;
  return rects.some(
    (r) =>
      x >= r.left - TEXT_HIT_SLOP &&
      x <= r.right + TEXT_HIT_SLOP &&
      y >= r.top - TEXT_HIT_SLOP &&
      y <= r.bottom + TEXT_HIT_SLOP,
  );
}

/**
 * The one selection colour. Deliberately NOT a DS token: the DS is warm
 * charcoal/cream and owns no blue at all (its focus ring is charcoal by
 * rule), while canvas selection must stay readable over arbitrary brand
 * artwork — which is exactly why every canvas editor picks an
 * out-of-palette hue. Everything else the selection draws — radius,
 * surface, shadow — comes from `--ds-*` tokens.
 */
const SELECTION_COLOR = '#3B82F6';

/** Remove selection styles from an element */
function removeSelectionStyles(el: HTMLElement) {
  el.style.outline = '';
  el.style.outlineOffset = '';
  el.style.borderRadius = '';
  el.style.boxShadow = '';
  el.style.backgroundColor = el.dataset.originalBg || '';
  el.style.userSelect = '';
  (el.style as any).webkitUserSelect = '';
  el.style.cursor = '';
  delete el.dataset.originalBg;
  delete el.dataset.draggable;
  if (el.contentEditable === 'true') {
    el.contentEditable = 'false';
    el.blur();
  }
}

/** Apply selection state to an element (cursor + drag affordance).
 *  The VISIBLE box is not drawn here: it is the `.scale-zone-box` overlay
 *  that addScaleZones tracks every frame, sized to the rendered WORDS
 *  (3px off them) rather than the element's box — a block element can be
 *  far wider than its own text (owner request 2026-08-22). */
function applySelectionStyles(el: HTMLElement) {
  if (!el.dataset.originalBg) {
    el.dataset.originalBg = el.style.backgroundColor || '';
  }

  // Only LEAF elements (no element children) and images can be dragged.
  // Dragging a container would visually move all its descendants because
  // they live in its coordinate space — the user hits this as "moving
  // the first layer moves the whole slide".
  const isImage = el.tagName === 'IMG' || el.tagName === 'SVG';
  const isLeaf = !hasBlockChildren(el);
  const canDrag = isImage || isLeaf;

  if (canDrag) {
    el.style.cursor = 'move';
    if (!el.dataset.draggable) {
      el.dataset.draggable = 'true';
      if (!el.style.position || el.style.position === 'static') {
        el.style.position = 'relative';
      }
    }
  } else {
    el.style.cursor = 'default';
    delete el.dataset.draggable;
  }
  // Don't put userSelect:'none' on the element. The canvas-wide rule
  // already blocks accidental selection in non-editable areas, and the
  // pointer handler defers preventDefault until movement crosses the
  // drag threshold — so a static click won't paint a text-selection,
  // and a real drag is owned by setPointerCapture before native
  // selection extends. Putting userSelect:'none' here would also fight
  // contentEditable when the user double-clicks into edit mode.
}

/**
 * Selection box + scale zones — every handle is invisible; the CURSOR is
 * the affordance (owner decisions 2026-08-21/22: the arcs experiment was
 * dropped, then the edge pills too).
 *
 *   the box — `.scale-zone-box`, the ONLY visible selection chrome. It
 *     hugs the rendered WORDS (a Range over the element's contents), 3
 *     screen-px off them, never the element's own box, which for a block
 *     element can be far wider than its text. Stroke, gap and the DS
 *     control radius are divided by the canvas scale so they look
 *     identical at any zoom and any text size.
 *   corners (4) — an invisible hover target centered ON the corner.
 *     Dragging SCALES the element — font size for text (the words
 *     themselves grow), the whole box for images — smoothed through a
 *     rAF ease so it feels light, never steppy.
 *   edges (2, left + right midpoints) — invisible, ew-resize cursor.
 *     Dragging sets the element's WIDTH; text re-wraps inside the box the
 *     user sized ("اسحب يمين وشمال والكلام يكون جوه البوكس").
 *
 * A per-container rAF loop re-places the box and every zone each frame,
 * so the selection rides the words instantly through moves, scaling and
 * typing — it never lags behind and never snaps at the end of a gesture.
 */

/** Character-level styles that may hit a HIGHLIGHTED range instead of the
 *  whole element. Layout styles (align, width, opacity…) stay element-level. */
const RANGE_STYLE_KEYS = new Set(['fontWeight', 'fontStyle', 'color', 'fontSize']);

/** While editing, a toolbar change lands on the words the user highlighted
 *  — wrapped in a styled span — not on the whole block. Returns false when
 *  there is no usable in-element selection; the caller styles the element. */
function applyStyleToHighlight(el: HTMLElement, key: string, value: string): boolean {
  if (!RANGE_STYLE_KEYS.has(key)) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed || !el.contains(range.commonAncestorContainer)) return false;
  const span = document.createElement('span');
  (span.style as any)[key] = value;
  try {
    range.surroundContents(span);
  } catch {
    // A range that partially covers nodes cannot be surrounded — extract
    // (which splits the boundary text nodes) and wrap what came out.
    span.appendChild(range.extractContents());
    range.insertNode(span);
  }
  // Keep the words highlighted so the next toolbar change stacks on them.
  sel.removeAllRanges();
  const keep = document.createRange();
  keep.selectNodeContents(span);
  sel.addRange(keep);
  return true;
}

/** The rect the user SEES as selected: the rendered words for text (what
 *  the `.scale-zone-box` hugs), the element box for everything else. The
 *  floating toolbar centers on this, so bar and box always agree.
 *
 *  `data-user-sized` flips a text element to element-box mode: it is set
 *  the moment the user drags an edge to size the box themselves, and it
 *  serializes into snapshots so a sized box stays sized. Typing alone
 *  never sets it — an untouched box keeps hugging the words. */
function visualRect(el: HTMLElement): DOMRect {
  const type = detectBlockType(el);
  if ((type === 'text' || type === 'heading') && !el.dataset.userSized) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rr = range.getBoundingClientRect();
    if (rr.width > 0 && rr.height > 0) return rr;
  }
  return el.getBoundingClientRect();
}

/** One tracking loop per container, cancelled by removeScaleZones. */
const zoneLoops = new WeakMap<HTMLElement, number>();

export function addScaleZones(el: HTMLElement, container: HTMLElement) {
  removeScaleZones(container);

  // Inline elements need inline-block so an explicit width sticks when a
  // non-text element is scaled.
  if (window.getComputedStyle(el).display === 'inline') {
    el.style.display = 'inline-block';
  }

  const type = detectBlockType(el);
  const isText = type === 'text' || type === 'heading';

  // sx/sy: which direction counts as "outward", so dragging away from the
  // element always grows it. `edge` marks the width-only zones.
  const specs: Array<{
    kind: 'nw' | 'ne' | 'se' | 'sw' | 'w' | 'e';
    sx: number; sy: number; cursor: string; edge?: boolean;
  }> = [
    { kind: 'nw', sx: -1, sy: -1, cursor: 'nwse-resize' },
    { kind: 'ne', sx: 1,  sy: -1, cursor: 'nesw-resize' },
    { kind: 'se', sx: 1,  sy: 1,  cursor: 'nwse-resize' },
    { kind: 'sw', sx: -1, sy: 1,  cursor: 'nesw-resize' },
    { kind: 'w',  sx: -1, sy: 0,  cursor: 'ew-resize', edge: true },
    { kind: 'e',  sx: 1,  sy: 0,  cursor: 'ew-resize', edge: true },
  ];

  const zones = specs.map((spec) => {
    const zone = document.createElement('div');
    zone.className = 'scale-zone';
    zone.dataset.zone = spec.edge ? 'edge' : 'corner';
    zone.style.cssText = [
      'position:absolute',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:transparent',
      `cursor:${spec.cursor}`,
      'z-index:60',
      'pointer-events:auto',
    ].join(';');
    container.appendChild(zone);
    return zone;
  });

  // The visible selection box. pointer-events:none — it is chrome, never
  // a hit target; elementsFromPoint skips it, so fall-through selection
  // keeps working under it.
  const box = document.createElement('div');
  box.className = 'scale-zone-box';
  box.style.cssText = [
    'position:absolute',
    'pointer-events:none',
    'box-sizing:border-box',
    'z-index:59',
    `border:1px solid ${SELECTION_COLOR}`,
  ].join(';');
  container.appendChild(box);

  // The DS control radius, resolved once — kept screen-constant below by
  // dividing by the canvas scale ("الراوندد مظبوط في كل الأحوال").
  const controlRadius =
    parseFloat(getComputedStyle(container).getPropertyValue('--ds-radius-control')) || 8;

  /**
   * Position the box and every zone from the CURRENT rendered bounds.
   * Runs every frame (below), which is what keeps the selection glued to
   * the words through drags, scaling and typing — instantly, no
   * end-of-gesture snap.
   */
  const place = () => {
    // The selection hugs the WORDS for untouched text — but an element
    // the user has sized (data-user-sized, set by an edge drag) shows its
    // own box. Everything (box, corners, edges) rides this visual rect.
    const vis = visualRect(el);
    const containerRect = container.getBoundingClientRect();
    // The deck stage scales 1920×1080 down via `transform: scale(s)`;
    // rects are screen-space, zones live in the container's local space.
    const scale = containerRect.width && container.offsetWidth
      ? containerRect.width / container.offsetWidth
      : 1;
    // ~18px on screen: forgiving to aim for, still tight to the corner.
    const ZONE = 18 / scale;
    // 3 SCREEN px between the words and the stroke, at any zoom — but an
    // IMAGE is its own crisp rectangle: the box sits flush on it, no gap.
    const isMedia = el.tagName === 'IMG' || el.tagName === 'SVG';
    const pad = isMedia ? 0 : 3 / scale;
    // A HAIRLINE: half a screen px — retina draws it truly finer, and it
    // reads as a guide, not a frame (owner request 2026-08-22).
    const stroke = 0.5 / scale;
    const t = (vis.top - containerRect.top) / scale;
    const l = (vis.left - containerRect.left) / scale;
    const r = (vis.right - containerRect.left) / scale;
    const b = (vis.bottom - containerRect.top) / scale;

    box.style.top = `${t - pad - stroke}px`;
    box.style.left = `${l - pad - stroke}px`;
    box.style.width = `${r - l + 2 * (pad + stroke)}px`;
    box.style.height = `${b - t + 2 * (pad + stroke)}px`;
    box.style.borderWidth = `${stroke}px`;
    // Text gets the DS control radius (screen-constant). An IMAGE'S box
    // takes the image's OWN corner radius — the selection follows the
    // artwork's shape: a rounded image gets a rounded box, a sharp one a
    // sharp box. Computed values are local px, same space as the box.
    if (isMedia) {
      const cs = getComputedStyle(el);
      box.style.borderRadius = cs.borderRadius || cs.borderTopLeftRadius;
    } else {
      box.style.borderRadius = `${controlRadius / scale}px`;
    }

    // Corners CENTER on the box's corner point, so the hover works from
    // inside AND outside (owner request 2026-08-21). The edge zones are
    // STRIPS on the stroke line spanning the whole side — grab anywhere
    // along the edge, not just its midpoint (owner request 2026-08-22) —
    // inset by the corner zones so the corners keep their scale gesture.
    // On a box too small for a strip they fall back to a centered square.
    const lineOff = pad + stroke / 2;
    const edgeH = Math.max(ZONE, b - t - ZONE);
    const edgeTop = (t + b) / 2 - edgeH / 2;
    const pos: Record<string, [number, number]> = {
      nw: [t - ZONE / 2, l - ZONE / 2],
      ne: [t - ZONE / 2, r - ZONE / 2],
      se: [b - ZONE / 2, r - ZONE / 2],
      sw: [b - ZONE / 2, l - ZONE / 2],
      w:  [edgeTop, l - lineOff - ZONE / 2],
      e:  [edgeTop, r + lineOff - ZONE / 2],
    };
    zones.forEach((zone, i) => {
      const spec = specs[i];
      const [zt, zl] = pos[spec.kind];
      zone.style.top = `${zt}px`;
      zone.style.left = `${zl}px`;
      zone.style.width = `${ZONE}px`;
      zone.style.height = `${spec.edge ? edgeH : ZONE}px`;
    });
    return scale;
  };
  place();

  const tick = () => {
    if (!el.isConnected || !container.isConnected) {
      removeScaleZones(container);
      return;
    }
    place();
    zoneLoops.set(container, requestAnimationFrame(tick));
  };
  zoneLoops.set(container, requestAnimationFrame(tick));

  zones.forEach((zone, i) => {
    const spec = specs[i];
    zone.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const startRect = el.getBoundingClientRect();
      const startDiag = Math.hypot(startRect.width, startRect.height) || 1;
      const cs = window.getComputedStyle(el);
      const startFont = parseFloat(cs.fontSize) || 16;
      // Everything scales together, Adobe-shift-drag style: the font, the
      // element's own padding, and any explicit width/height it carries.
      // Scaling width WITH the font is what keeps the line breaks where
      // they are — the whole block grows as one object.
      const startPad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft]
        .map((p) => parseFloat(p) || 0);
      const hadExplicitW = el.style.width !== '';
      const hadExplicitH = el.style.height !== '';
      const containerRect = container.getBoundingClientRect();
      const scale = containerRect.width && container.offsetWidth
        ? containerRect.width / container.offsetWidth
        : 1;
      // An edge drag on text that was never sized starts from the WORDS'
      // width — the edge the user grabbed sits on the words-hugging box,
      // so the drag continues from there, never jumping to the element's
      // (often much wider) block width.
      const startW =
        spec.edge && isText && !el.dataset.userSized
          ? Math.max(30, Math.round(visualRect(el).width / scale))
          : el.offsetWidth;
      const startH = el.offsetHeight;

      // Smoothed drag: mousemove only records the TARGET; a rAF loop eases
      // the applied value toward it (critically-damped-ish lerp), so the
      // gesture feels light and fluid instead of stepping per mouse event.
      // mouseup lands exactly on the target — no residual lag.
      let factorTarget = 1;
      let factorApplied = 1;
      let widthTarget = startW;
      let widthApplied = startW;
      let raf = 0;

      const apply = () => {
        if (spec.edge) {
          // Width only — the text re-wraps inside the box the user sizes.
          el.style.width = `${Math.max(30, Math.round(widthApplied))}px`;
          return;
        }
        const f = factorApplied;
        el.style.padding = startPad.map((p) => `${(p * f).toFixed(1)}px`).join(' ');
        if (isText) {
          el.style.fontSize = `${Math.max(6, startFont * f).toFixed(1)}px`;
          if (hadExplicitW) el.style.width = `${Math.max(20, Math.round(startW * f))}px`;
          if (hadExplicitH) el.style.height = `${Math.max(20, Math.round(startH * f))}px`;
        } else {
          el.style.width = `${Math.max(20, Math.round(startW * f))}px`;
          el.style.height = `${Math.max(20, Math.round(startH * f))}px`;
        }
      };

      const ease = () => {
        factorApplied += (factorTarget - factorApplied) * 0.35;
        widthApplied += (widthTarget - widthApplied) * 0.35;
        apply();
        raf = requestAnimationFrame(ease);
      };
      raf = requestAnimationFrame(ease);

      const onMouseMove = (moveE: MouseEvent) => {
        if (spec.edge) {
          // The first real movement marks the element USER-SIZED: from now
          // on the selection box IS the element box being sized, not the
          // words (typing alone never sets this). Width applied at once so
          // the box never flashes at the block's full width.
          if (!el.dataset.userSized) {
            el.dataset.userSized = 'true';
            el.style.width = `${Math.max(30, Math.round(startW))}px`;
          }
          // dx is screen px; the width is set in local px → divide by scale.
          widthTarget = startW + ((moveE.clientX - startX) * spec.sx) / scale;
          return;
        }
        // Corner: project the drag onto the outward diagonal and turn it
        // into a proportional factor of the element's own diagonal.
        const d = (moveE.clientX - startX) * spec.sx + (moveE.clientY - startY) * spec.sy;
        factorTarget = Math.min(8, Math.max(0.2, (startDiag + d) / startDiag));
      };
      const onMouseUp = () => {
        cancelAnimationFrame(raf);
        factorApplied = factorTarget;
        widthApplied = widthTarget;
        apply();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });
}

export function removeScaleZones(container: HTMLElement) {
  const loop = zoneLoops.get(container);
  if (loop !== undefined) {
    cancelAnimationFrame(loop);
    zoneLoops.delete(container);
  }
  container.querySelectorAll('.scale-zone, .scale-zone-box').forEach((z) => z.remove());
}

export function EditableSlide({ children, frozenHtml, onSelectionChange }: EditableSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [editing, setEditing] = useState(false);
  const selectedRef = useRef<SelectedElement | null>(null);
  const editingRef = useRef(false);
  // Set when a move-drag just committed. Pointer capture makes the click
  // that follows the drag target the CONTENT WRAPPER, and handleClick would
  // re-select that wrapper — the selection (and its pills) visibly jumped
  // from the dragged text to the whole canvas. A drag is not a click.
  const suppressClickRef = useRef(false);

  // Keep refs in sync with state for event handlers
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  // Notify host on selection change so it can render a property panel.
  useEffect(() => {
    onSelectionChange?.(selected);
  }, [selected, onSelectionChange]);

  // When the host re-feeds frozenHtml (undo/redo, brand reset, variant
  // swap), the previously-selected DOM ref points to a detached node.
  // Clear selection so the FloatingToolbar doesn't render at (0,0,0,0)
  // and the host's property panel doesn't reference stale state.
  useEffect(() => {
    if (selectedRef.current) {
      setSelected(null);
      setEditing(false);
      if (containerRef.current) removeScaleZones(containerRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frozenHtml]);

  // Find the nearest meaningful element from a click target.
  //
  // Two modes:
  //   1. Click landed ON a leaf (no element children) → walk UP looking
  //      for the nearest text-bearing or image element. Lets you click
  //      on a wrapping span and select the inner text element.
  //   2. Click landed on a CONTAINER (has element children) → that means
  //      you clicked the empty background area inside it. Select the
  //      container itself; do NOT walk up. Otherwise selecting the
  //      background would walk all the way up to the slide root and
  //      "delete background" would nuke the whole slide.
  const findMeaningfulElement = useCallback((target: HTMLElement): HTMLElement => {
    // Container click → select the container as-is. Inline formatting
    // children (brs, styled spans) do NOT make a container — see
    // hasBlockChildren.
    if (hasBlockChildren(target)) return target;

    // Leaf click → walk up until we find a meaningful node
    let el = target;
    while (el.parentElement && el.parentElement !== containerRef.current) {
      // Inline formatting created while editing (a styled highlight span,
      // b/i, the text around a <br>) belongs to its text BLOCK — climb
      // while the parent is itself a pure text block. A standalone label
      // span in a layout div stays its own thing: its parent has block
      // children, so the climb refuses.
      const parent = el.parentElement;
      if (
        INLINE_FORMAT_TAGS.has(el.tagName) &&
        parent !== containerRef.current &&
        !hasBlockChildren(parent) &&
        (parent.textContent ?? '').trim().length >= 1
      ) {
        el = parent;
        continue;
      }

      const tag = el.tagName.toLowerCase();

      // Hard stops — these are always "the thing"
      if (tag === 'img' || tag === 'svg' || tag === 'picture' || tag === 'video') break;
      if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'blockquote') break;
      if (tag === 'text' || tag === 'tspan') break;

      // Direct text content (text node children, NOT descendant text)
      const directText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => (n.textContent ?? '').trim())
        .join('');
      if (directText.length >= 1) break;

      // A text block whose children are only inline formatting is the
      // thing itself — never walk past it to its layout parent.
      if (!hasBlockChildren(el)) {
        const leafText = (el.textContent ?? '').trim();
        if (leafText.length >= 1) break;
      }

      el = el.parentElement;
    }
    return el;
  }, []);

  /** Apply full selection (styles + zones + state) to one element. */
  const selectElement = useCallback((el: HTMLElement) => {
    if (selectedRef.current?.element && selectedRef.current.element !== el) {
      removeSelectionStyles(selectedRef.current.element);
    }
    applySelectionStyles(el);
    if (containerRef.current) addScaleZones(el, containerRef.current);
    setSelected({ element: el, type: detectBlockType(el), rect: el.getBoundingClientRect() });
    setEditing(false);
  }, []);

  /**
   * What a point actually selects. findMeaningfulElement names the
   * candidate; the words-only rule (hitsContent) can veto it, and a veto
   * falls through to the next element under the point that IS hit — so
   * things sitting under a wide, mostly-empty text box stay reachable.
   *
   * A CONTAINER is selectable only when it is visibly a thing — it paints
   * its own background or border (a card, a coloured section). A
   * transparent layout wrapper turning into a giant do-nothing selection
   * on every between-the-elements click is exactly what this refuses
   * (owner request 2026-08-22).
   */
  const isSelectable = useCallback((cand: HTMLElement): boolean => {
    if (!hasBlockChildren(cand)) return true;
    const cs = window.getComputedStyle(cand);
    const bg = cs.backgroundColor;
    const hasBg = bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)';
    const hasImage = cs.backgroundImage !== 'none';
    const hasBorder =
      parseFloat(cs.borderTopWidth) > 0 ||
      parseFloat(cs.borderRightWidth) > 0 ||
      parseFloat(cs.borderBottomWidth) > 0 ||
      parseFloat(cs.borderLeftWidth) > 0;
    return hasBg || hasImage || hasBorder;
  }, []);

  const resolveHit = useCallback(
    (target: HTMLElement, x: number, y: number): HTMLElement | null => {
      const el = findMeaningfulElement(target);
      if (isSelectable(el) && hitsContent(el, x, y)) return el;
      for (const below of document.elementsFromPoint(x, y)) {
        if (!containerRef.current?.contains(below)) continue;
        if (below === containerRef.current) break;
        const c = below as HTMLElement;
        if (c.closest('.scale-zone')) continue;
        // Never fall through to the missed element itself, its descendants,
        // or its ANCESTORS — beside-the-words is background, not "select my
        // whole container".
        if (c === el || el.contains(c) || c.contains(el)) continue;
        const m = findMeaningfulElement(c);
        if (m !== el && !m.contains(el) && isSelectable(m) && hitsContent(m, x, y)) return m;
      }
      return null;
    },
    [findMeaningfulElement, isSelectable],
  );

  /** True when a click is just the tail of a TEXT-SELECTION drag: while
   *  editing, highlighted words inside the element mean the user was
   *  selecting text — a release that strayed outside the box must not
   *  read as "clicked away" and kill the selection they just made. */
  const isSelectionDragTail = useCallback(() => {
    if (!editingRef.current) return false;
    const el = selectedRef.current?.element;
    if (!el) return false;
    const sel = window.getSelection();
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    return !!range && !range.collapsed && el.contains(range.commonAncestorContainer);
  }, []);

  // Handle click on slide content — select element
  const handleClick = useCallback((e: React.MouseEvent) => {
    // The click that follows a committed move-drag is the drag's tail, not
    // a selection gesture — swallow it (see suppressClickRef).
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (isSelectionDragTail()) return;
    const target = e.target as HTMLElement;
    if (!containerRef.current?.contains(target)) return;

    // Don't select the root container itself
    if (target === containerRef.current) {
      clearSelection();
      return;
    }

    // Clicks inside the actively-editing element are caret placement —
    // leave them entirely to the browser.
    if (editingRef.current && selectedRef.current?.element?.contains(target)) {
      return;
    }

    // A click on the empty part of a wide text box selects what is under
    // it — or, when nothing is, clears like a background click.
    const el = resolveHit(target, e.clientX, e.clientY);
    if (!el) {
      clearSelection();
      return;
    }
    selectElement(el);
  }, [resolveHit, selectElement]);

  // Handle double-click for text editing
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const el = findMeaningfulElement(target);
    const type = detectBlockType(el);

    // Same words-only rule as selection: double-clicking the empty part of
    // a wide box must not start editing the text far away from the cursor.
    if (!hitsContent(el, e.clientX, e.clientY)) return;

    if (type === 'text' || type === 'heading') {
      el.contentEditable = 'true';
      // Make sure the editable element can receive caret/selection.
      // Canvas-wide user-select:none does NOT block contentEditable
      // selection in modern browsers, but force it just in case any
      // ancestor inline style was leaking.
      el.style.userSelect = 'text';
      (el.style as any).webkitUserSelect = 'text';
      el.style.cursor = 'text';
      // The browser paints its own focus ring around a focused
      // contentEditable — a second box around the whole element. The
      // selection overlay is the only chrome; keep the native one off.
      el.style.outline = 'none';
      el.focus();
      setEditing(true);

      // Native-like double-click: select the WORD under the cursor, not
      // the whole block. The canvas carries user-select:none, so the
      // browser's own double-click word selection was suppressed before
      // contentEditable flipped on — recreate it at the click point.
      // Everything after this first gesture IS native: drag to select a
      // word or two, triple-click for the line, click for the caret.
      const sel = window.getSelection();
      const caret = document.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (sel && caret && el.contains(caret.startContainer)) {
        sel.removeAllRanges();
        sel.addRange(caret);
        const modify = (sel as any).modify?.bind(sel);
        if (modify) {
          modify('move', 'backward', 'word');
          modify('extend', 'forward', 'word');
        }
      }

      // Update selected to this element
      const rect = el.getBoundingClientRect();
      applySelectionStyles(el);
      // applySelectionStyles set cursor:'move' — we want the text
      // caret cursor while editing.
      el.style.cursor = 'text';
      setSelected({ element: el, type, rect });
    }
  }, [findMeaningfulElement]);

  const clearSelection = useCallback(() => {
    if (selectedRef.current?.element) {
      removeSelectionStyles(selectedRef.current.element);
    }
    if (containerRef.current) removeScaleZones(containerRef.current);
    setSelected(null);
    setEditing(false);
  }, []);

  // Click on the outer container (not on any child) clears selection —
  // unless it is the tail of a text-selection drag that strayed outside.
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      if (isSelectionDragTail()) return;
      clearSelection();
    }
  }, [clearSelection, isSelectionDragTail]);

  // Close selection when clicking outside the entire editor.
  //
  // Caveat: a host page typically renders editor chrome (a property
  // inspector aside, a floating dock, etc.) OUTSIDE this container.
  // Clicks on those should NOT clear selection — otherwise every
  // weight-chip / color-picker / alignment-button click would deselect
  // and snap the inspector back to "Nothing selected" before the
  // mutation could even land. We opt-in via `data-editor-chrome="true"`
  // on any wrapper the host wants protected.
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      // Document-level listener: e.target can be document itself or a text
      // node — only Elements have closest().
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      if (containerRef.current?.contains(target)) return;
      if (target.closest('[data-editor-chrome="true"]')) return;
      clearSelection();
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [clearSelection]);

  // Escape and Delete key handling
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Enter while TYPING inserts a line break INSIDE the element. The
      // contentEditable default wraps every new line in its own <div>,
      // and each of those divs then selects as an element of its own —
      // one paragraph became a selection per line (owner bug 2026-08-22).
      if (e.key === 'Enter' && editingRef.current) {
        const el = selectedRef.current?.element;
        if (el && el.isConnected && el.contains(document.activeElement ?? null)) {
          e.preventDefault();
          document.execCommand('insertLineBreak');
        }
        return;
      }

      if (e.key === 'Escape') {
        if (selectedRef.current) {
          clearSelection();
        }
        return;
      }

      // Delete/Backspace
      //   - leaf element (no children) → remove from DOM
      //   - container with children → only clear its background so the
      //     user's intent ("delete background") doesn't nuke the whole
      //     slide and everything inside it
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRef.current && !editingRef.current) {
        e.preventDefault();
        const el = selectedRef.current.element;
        if (!el || !el.isConnected) {
          setSelected(null);
          setEditing(false);
          return;
        }

        const isLeaf = !hasBlockChildren(el);
        const isSlideRoot = el.parentElement === containerRef.current;

        if (isLeaf && !isSlideRoot) {
          // Real removal — leaf element with no children
          removeSelectionStyles(el);
          if (containerRef.current) removeScaleZones(containerRef.current);
          el.remove();
          setSelected(null);
          setEditing(false);
        } else {
          // Container or slide root — only clear its background fills.
          // The element stays, so its children survive.
          el.style.backgroundColor = 'transparent';
          el.style.backgroundImage = 'none';
          if (el.dataset.originalBg !== undefined) {
            el.dataset.originalBg = '';
          }
          // Refresh selection so the toolbar updates
          const rect = el.getBoundingClientRect();
          setSelected((prev) => (prev ? { ...prev, rect } : null));
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [clearSelection]);

  // Update toolbar position on scroll/resize
  useEffect(() => {
    if (!selected) return;
    const update = () => {
      if (!selected.element.isConnected) {
        setSelected(null);
        return;
      }
      const rect = selected.element.getBoundingClientRect();
      setSelected(prev => prev ? { ...prev, rect } : null);
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [selected]);

  // Get computed styles for toolbar. While EDITING they come from the
  // CARET/HIGHLIGHT position, not the block — standing on bold words must
  // light the B button, so pressing it again UN-bolds them (toggle).
  const getElementStyles = useCallback(() => {
    if (!selected?.element) return {};
    let src: HTMLElement = selected.element;
    if (editingRef.current) {
      const sel = window.getSelection();
      const node = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).commonAncestorContainer : null;
      const elOf =
        node && (node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement));
      if (elOf && selected.element.contains(elOf)) src = elOf;
    }
    const computed = window.getComputedStyle(src);
    return {
      fontWeight: src.style.fontWeight || computed.fontWeight || undefined,
      fontStyle: src.style.fontStyle || computed.fontStyle || undefined,
      color: src.style.color || undefined,
      textAlign: (src.style.textAlign || computed.textAlign || undefined) as string | undefined,
      fontSize: src.style.fontSize || computed.fontSize || undefined,
      objectFit: (selected.element as HTMLImageElement).style?.objectFit || undefined,
    };
  }, [selected]);

  // While editing, moving the caret or the highlight changes what the
  // toolbar should show — re-render on selectionchange so B/I/color/size
  // always describe the words under the cursor.
  useEffect(() => {
    if (!editing) return;
    const onSelectionChange = () => {
      setSelected((prev) => (prev ? { ...prev } : prev));
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [editing]);

  // Remount the toolbar per selected ELEMENT so its entrance animation
  // replays for each new selection — but not for rect updates (scroll,
  // style edits) on the same one. Render-time ref mutation is safe here:
  // the guard makes it idempotent across StrictMode double-renders.
  const toolbarKeyRef = useRef({ el: null as HTMLElement | null, key: 0 });
  if (selected && toolbarKeyRef.current.el !== selected.element) {
    toolbarKeyRef.current = { el: selected.element, key: toolbarKeyRef.current.key + 1 };
  }

  // When a frozen snapshot is supplied, render it via dangerouslySetInnerHTML
  // so React never reconciles the inner DOM. The wrapper stays React-managed
  // for click/dblclick/mousedown delegation.
  const innerProps = frozenHtml
    ? { dangerouslySetInnerHTML: { __html: frozenHtml } }
    : { children };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onClick={handleContainerClick}
      // Slide canvas is a LAYOUT surface, not a document — disable
      // browser-native text-selection across the whole frame so
      // click-and-drag gestures can't trigger a partial text highlight
      // before our React handlers run. contentEditable overrides
      // user-select, so double-click-to-edit still works as expected.
      style={{ userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}
    >
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        // Native HTML5 drag — disable; we own dragging via Pointer Events.
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          // Two-phase pointer handler:
          //   Phase A — "armed": pointerdown lands. We pre-select the
          //   element visually but do NOT preventDefault, NOT capture,
          //   NOT touch user-select. Native browser stuff still runs:
          //   focus moves, contentEditable caret sets, click event
          //   will fire if no movement.
          //   Phase B — "committed": once pointermove crosses 3px, we
          //   commit to a drag — capture the pointer, lock body
          //   user-select, clear native text selection, mutate
          //   style.left/top.
          //
          // This split is what lets text selection inside a
          // double-click contentEditable work. The previous version
          // preventDefault'd on pointerdown, killing native focus and
          // selection-range start.
          if (e.button !== 0) return; // primary button only
          const targetEl = e.target as HTMLElement;

          // If we're inside an actively-editing element, let the
          // browser handle native selection / caret entirely.
          if (editingRef.current && selectedRef.current?.element?.contains(targetEl)) {
            return;
          }

          // Words-only rule applies to drags too: the empty part of a wide
          // text box must not start moving it.
          const candidate = resolveHit(targetEl, e.clientX, e.clientY);
          if (!candidate) return;
          const isImage = candidate.tagName === 'IMG' || candidate.tagName === 'SVG';
          const isLeaf = !hasBlockChildren(candidate);
          if (!(isImage || isLeaf) || candidate === containerRef.current) return;

          // Phase A — pre-select. Click-then-no-drag still works as
          // selection. Click event downstream confirms the same thing.
          if (selectedRef.current?.element !== candidate) {
            selectElement(candidate);
          }

          const dispatcher = e.currentTarget as HTMLElement;
          const startX = e.clientX;
          const startY = e.clientY;
          const startLeft = parseInt(candidate.style.left || '0') || 0;
          const startTop = parseInt(candidate.style.top || '0') || 0;
          let committed = false;
          let previousBodySelect = '';

          const commit = (moveE: PointerEvent) => {
            if (committed) return;
            committed = true;
            try { dispatcher.setPointerCapture(e.pointerId); } catch { /* unsupported */ }
            previousBodySelect = document.body.style.userSelect;
            document.body.style.userSelect = 'none';
            window.getSelection()?.removeAllRanges();
            moveE.preventDefault();
          };

          const onMove = (moveE: PointerEvent) => {
            if (moveE.pointerId !== e.pointerId) return;
            // A release the browser never delivered (pointer left the
            // window, capture failed, OS ate the up) would leave the drag
            // stuck to the cursor forever — the element following a mouse
            // whose button is UP. Any move without a pressed button IS the
            // missed release: finish exactly as pointerup would.
            if (moveE.buttons === 0) {
              onUp(moveE);
              return;
            }
            const dx = moveE.clientX - startX;
            const dy = moveE.clientY - startY;
            if (!committed) {
              if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return;
              commit(moveE);
            }
            candidate.style.position = 'relative';
            candidate.style.left = (startLeft + dx) + 'px';
            candidate.style.top = (startTop + dy) + 'px';
          };
          const onUp = (upE: PointerEvent) => {
            if (upE.pointerId !== e.pointerId) return;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            if (committed) {
              try { dispatcher.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
              document.body.style.userSelect = previousBodySelect;
              setSelected((prev) => (prev ? { ...prev, rect: candidate.getBoundingClientRect() } : null));
              window.getSelection()?.removeAllRanges();
              // No zone re-place needed: the per-frame tracking loop in
              // addScaleZones already followed the element while it moved.
              // Swallow the click this pointerup is about to synthesize —
              // under pointer capture it targets the content wrapper and
              // would re-select it out from under the dragged element. The
              // timeout is the backstop for a release that fires no click.
              suppressClickRef.current = true;
              setTimeout(() => { suppressClickRef.current = false; }, 0);
            }
          };
          // WINDOW, not the dispatcher: without capture (it can fail, and
          // is only requested after the 3px commit) a release outside the
          // slide never reaches the dispatcher — the drag would never end.
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
          window.addEventListener('pointercancel', onUp);
        }}
        // Stable content boundary. This element's innerHTML is exactly what
        // `frozenHtml` is fed back in as, so a host that captures HERE gets a
        // lossless round trip. (EditorWorkspace captures the outer slide
        // canvas instead, which nests one wrapper per save — harmless there
        // because it saves on an explicit click, not on every keystroke.)
        data-slide-content=""
        className="w-full h-full"
        {...innerProps}
      />

      {/* Floating toolbar for selected element */}
      {selected && (
        <FloatingToolbar
          key={toolbarKeyRef.current.key}
          blockType={selected.type}
          style={getElementStyles()}
          onChangeType={(newType) => {
            if (!selected.element) return;
            const el = selected.element;

            // Apply type change visually
            if (newType === 'heading') {
              el.style.fontSize = '2em';
              el.style.fontWeight = '700';
            } else if (newType === 'text') {
              el.style.fontSize = '';
              el.style.fontWeight = '400';
            } else if (newType === 'sticky') {
              el.style.background = '#FEF3C7';
              el.style.color = '#92400E';
              el.style.padding = '12px';
              el.style.borderRadius = '4px';
              el.style.fontSize = '13px';
            } else if (newType === 'card') {
              el.style.background = 'rgba(255,255,255,0.05)';
              el.style.padding = '16px';
              el.style.borderRadius = '12px';
              el.style.border = '1px solid rgba(255,255,255,0.1)';
            }

            setSelected({ ...selected, type: newType });
          }}
          onChangeStyle={(key, value) => {
            if (!selected.element) return;
            const el = selected.element;

            // Special case: replace image src
            if (key === '__replaceImageSrc') {
              if (el.tagName === 'IMG') {
                (el as HTMLImageElement).src = value;
              } else {
                // If it's a div/container, set as background
                el.style.backgroundImage = `url(${value})`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
              }
            } else if (!(editingRef.current && applyStyleToHighlight(el, key, value))) {
              // No highlighted words to scope to — the whole element it is.
              // (The editing guard matters: a stale document selection can
              // outlive edit mode and would silently steal the style.)
              (el.style as any)[key] = value;
            }

            // Force toolbar to re-render with updated styles
            const rect = el.getBoundingClientRect();
            setSelected({ ...selected, rect });
          }}
          onDelete={() => {
            const el = selectedRef.current?.element || selected?.element;
            if (!el) return;
            removeSelectionStyles(el);
            if (containerRef.current) removeScaleZones(containerRef.current);
            el.remove();
            setSelected(null);
            setEditing(false);
            setEditing(false);
          }}
          onDuplicate={() => {
            if (!selected.element) return;
            const clone = selected.element.cloneNode(true) as HTMLElement;
            clone.style.outline = '';
            clone.style.outlineOffset = '';
            clone.contentEditable = 'false';
            selected.element.parentElement?.insertBefore(clone, selected.element.nextSibling);
          }}
          position={(() => {
            const vr = visualRect(selected.element);
            return { top: vr.top, left: vr.left, width: vr.width, height: vr.height };
          })()}
        />
      )}
    </div>
  );
}
