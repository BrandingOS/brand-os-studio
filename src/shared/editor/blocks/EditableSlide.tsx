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

/** Apply visible selection highlight to an element */
function applySelectionStyles(el: HTMLElement) {
  if (!el.dataset.originalBg) {
    el.dataset.originalBg = el.style.backgroundColor || '';
  }
  el.style.outline = '2px solid #3B82F6';
  el.style.outlineOffset = '3px';
  el.style.borderRadius = '6px';
  el.style.boxShadow = '0 0 0 6px rgba(59, 130, 246, 0.12)';

  // Only LEAF elements (no element children) and images can be dragged.
  // Dragging a container would visually move all its descendants because
  // they live in its coordinate space — the user hits this as "moving
  // the first layer moves the whole slide".
  const isImage = el.tagName === 'IMG' || el.tagName === 'SVG';
  const isLeaf = el.children.length === 0;
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
 * Add resize handles overlay for the selected element. Works for
 * images, text blocks, divs — any element that can take an explicit
 * width / height. Text blocks reflow inside the new bounding box.
 *
 * Eight handles: four corners + four edge midpoints. The corner /
 * edge directions encode in `cursor`:
 *   n → top, s → bottom, w → left, e → right.
 *
 * For absolutely-positioned elements, dragging the n/w sides also
 * adjusts left/top so the OPPOSITE corner stays anchored.
 */
function addResizeHandles(el: HTMLElement, container: HTMLElement) {
  // Remove existing handles
  container.querySelectorAll('.resize-handle').forEach(h => h.remove());

  // Inline / inline-block elements need 'inline-block' display to
  // honor explicit width. <span> defaults to inline; force it.
  const display = window.getComputedStyle(el).display;
  if (display === 'inline') {
    el.style.display = 'inline-block';
  }

  const rect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  // The pitch-deck stage scales 1920×1080 down to fit the viewport via
  // SlideScaler's `transform: scale(s)`. getBoundingClientRect returns
  // SCREEN-space coords (scaled), but handles are positioned in the
  // CONTAINER's local 1920-space. Divide every offset by the scale so
  // handles land on the actual element corners.
  const scale = containerRect.width && container.offsetWidth
    ? containerRect.width / container.offsetWidth
    : 1;

  // Keep handles ~12px on screen regardless of the slide zoom.
  const HANDLE_SCREEN_PX = 12;
  const HANDLE_SIZE = HANDLE_SCREEN_PX / scale;
  const BORDER_PX = 2 / scale;
  const off = HANDLE_SIZE / 2;
  const top = (rect.top - containerRect.top) / scale;
  const left = (rect.left - containerRect.left) / scale;
  const right = (rect.right - containerRect.left) / scale;
  const bottom = (rect.bottom - containerRect.top) / scale;
  const midX = (left + right) / 2;
  const midY = (top + bottom) / 2;

  const positions: Array<{ cursor: string; top: number; left: number }> = [
    { cursor: 'nw-resize', top: top - off,    left: left - off },
    { cursor: 'n-resize',  top: top - off,    left: midX - off },
    { cursor: 'ne-resize', top: top - off,    left: right - off },
    { cursor: 'e-resize',  top: midY - off,   left: right - off },
    { cursor: 'se-resize', top: bottom - off, left: right - off },
    { cursor: 's-resize',  top: bottom - off, left: midX - off },
    { cursor: 'sw-resize', top: bottom - off, left: left - off },
    { cursor: 'w-resize',  top: midY - off,   left: left - off },
  ];

  positions.forEach(pos => {
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.style.cssText = [
      'position:absolute',
      `width:${HANDLE_SIZE}px`,
      `height:${HANDLE_SIZE}px`,
      'background:#3B82F6',
      `border:${BORDER_PX}px solid #fff`,
      'border-radius:50%',
      `cursor:${pos.cursor}`,
      'z-index:60',
      `top:${pos.top}px`,
      `left:${pos.left}px`,
      `box-shadow:0 ${1 / scale}px ${4 / scale}px rgba(0,0,0,0.25)`,
      'pointer-events:auto',
    ].join(';');

    const startResize = (clientX: number, clientY: number) => {
      const startX = clientX;
      const startY = clientY;
      const startW = el.offsetWidth;
      const startH = el.offsetHeight;
      const computed = window.getComputedStyle(el);
      const isAbsolute = computed.position === 'absolute' || computed.position === 'fixed';
      const startLeft = parseFloat(el.style.left || '0') || 0;
      const startTop  = parseFloat(el.style.top  || '0') || 0;
      const cursor = pos.cursor;

      const onMove = (moveX: number, moveY: number) => {
        // Mouse events are in screen pixels; the element lives in
        // local 1920-space. Convert by the same scale factor used to
        // place the handles.
        const dx = (moveX - startX) / scale;
        const dy = (moveY - startY) / scale;
        let newW = startW;
        let newH = startH;
        let newL = startLeft;
        let newT = startTop;

        if (cursor.includes('e')) newW = Math.max(20, startW + dx);
        if (cursor.includes('w')) {
          newW = Math.max(20, startW - dx);
          if (isAbsolute) newL = startLeft + dx;
        }
        if (cursor.includes('s')) newH = Math.max(20, startH + dy);
        if (cursor.includes('n')) {
          newH = Math.max(20, startH - dy);
          if (isAbsolute) newT = startTop + dy;
        }

        if (cursor.includes('e') || cursor.includes('w')) el.style.width  = `${Math.round(newW)}px`;
        if (cursor.includes('s') || cursor.includes('n')) el.style.height = `${Math.round(newH)}px`;
        if (isAbsolute) {
          if (cursor.includes('w')) el.style.left = `${Math.round(newL)}px`;
          if (cursor.includes('n')) el.style.top  = `${Math.round(newT)}px`;
        }
      };

      const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        // Re-place the handles so they track the new size.
        addResizeHandles(el, container);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      startResize(e.clientX, e.clientY);
    });

    container.appendChild(handle);
  });
}

function removeResizeHandles(container: HTMLElement) {
  container.querySelectorAll('.resize-handle').forEach(h => h.remove());
}

export function EditableSlide({ children, frozenHtml, onSelectionChange }: EditableSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [editing, setEditing] = useState(false);
  const selectedRef = useRef<SelectedElement | null>(null);
  const editingRef = useRef(false);

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
      if (containerRef.current) removeResizeHandles(containerRef.current);
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
    // Container click → select the container as-is
    if (target.children.length > 0) return target;

    // Leaf click → walk up until we find a meaningful node
    let el = target;
    while (el.parentElement && el.parentElement !== containerRef.current) {
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

      // Single-text-child leaf
      if (el.children.length === 0) {
        const leafText = (el.textContent ?? '').trim();
        if (leafText.length >= 1) break;
      }

      el = el.parentElement;
    }
    return el;
  }, []);

  // Handle click on slide content — select element
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!containerRef.current?.contains(target)) return;

    // Don't select the root container itself
    if (target === containerRef.current) {
      clearSelection();
      return;
    }

    const el = findMeaningfulElement(target);

    // If the clicked element is the SAME one already selected and we
    // are currently in editing mode, this is the user clicking inside
    // the contentEditable to position the cursor — leave edit state
    // alone. (Otherwise we'd kick them out of edit mode every time
    // they click to place a caret or start a text-selection range.)
    if (selectedRef.current?.element === el && editingRef.current) {
      return;
    }

    // Clear previous selection styles
    if (selectedRef.current?.element && selectedRef.current.element !== el) {
      removeSelectionStyles(selectedRef.current.element);
    }

    const rect = el.getBoundingClientRect();
    const type = detectBlockType(el);

    applySelectionStyles(el);
    if (containerRef.current) {
      removeResizeHandles(containerRef.current);
      // Resize handles for ANY selected element — text blocks reflow
      // inside the new bounding box, images / logos scale.
      addResizeHandles(el, containerRef.current);
    }
    setSelected({ element: el, type, rect });
    setEditing(false);
  }, [findMeaningfulElement]);

  // Handle double-click for text editing
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const el = findMeaningfulElement(target);
    const type = detectBlockType(el);

    if (type === 'text' || type === 'heading') {
      el.contentEditable = 'true';
      // Make sure the editable element can receive caret/selection.
      // Canvas-wide user-select:none does NOT block contentEditable
      // selection in modern browsers, but force it just in case any
      // ancestor inline style was leaking.
      el.style.userSelect = 'text';
      (el.style as any).webkitUserSelect = 'text';
      el.style.cursor = 'text';
      el.focus();
      setEditing(true);

      // Select all text in the element so the user can immediately
      // overtype, or click to position the caret precisely.
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);

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
    if (containerRef.current) {
      removeResizeHandles(containerRef.current);
    }
    setSelected(null);
    setEditing(false);
  }, []);

  // Click on the outer container (not on any child) clears selection
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      clearSelection();
    }
  }, [clearSelection]);

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
      const target = e.target as HTMLElement | null;
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

        const isLeaf = el.children.length === 0;
        const isSlideRoot = el.parentElement === containerRef.current;

        if (isLeaf && !isSlideRoot) {
          // Real removal — leaf element with no children
          removeSelectionStyles(el);
          if (containerRef.current) removeResizeHandles(containerRef.current);
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

  // Get computed styles for toolbar
  const getElementStyles = useCallback(() => {
    if (!selected?.element) return {};
    const computed = window.getComputedStyle(selected.element);
    return {
      fontWeight: selected.element.style.fontWeight || computed.fontWeight || undefined,
      fontStyle: selected.element.style.fontStyle || computed.fontStyle || undefined,
      color: selected.element.style.color || undefined,
      textAlign: (selected.element.style.textAlign || computed.textAlign || undefined) as string | undefined,
      fontSize: selected.element.style.fontSize || computed.fontSize || undefined,
      objectFit: (selected.element as HTMLImageElement).style?.objectFit || undefined,
    };
  }, [selected]);

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
          if (targetEl.closest('.resize-handle')) return;

          // If we're inside an actively-editing element, let the
          // browser handle native selection / caret entirely.
          if (editingRef.current && selectedRef.current?.element?.contains(targetEl)) {
            return;
          }

          const candidate = findMeaningfulElement(targetEl);
          const isImage = candidate.tagName === 'IMG' || candidate.tagName === 'SVG';
          const isLeaf = candidate.children.length === 0;
          if (!candidate || !(isImage || isLeaf) || candidate === containerRef.current) return;

          // Phase A — pre-select. Click-then-no-drag still works as
          // selection. Click event downstream confirms the same thing.
          if (selectedRef.current?.element !== candidate) {
            if (selectedRef.current?.element && selectedRef.current.element !== candidate) {
              removeSelectionStyles(selectedRef.current.element);
            }
            applySelectionStyles(candidate);
            setSelected({ element: candidate, type: detectBlockType(candidate), rect: candidate.getBoundingClientRect() });
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
            dispatcher.removeEventListener('pointermove', onMove);
            dispatcher.removeEventListener('pointerup', onUp);
            dispatcher.removeEventListener('pointercancel', onUp);
            if (committed) {
              try { dispatcher.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
              document.body.style.userSelect = previousBodySelect;
              setSelected((prev) => (prev ? { ...prev, rect: candidate.getBoundingClientRect() } : null));
              window.getSelection()?.removeAllRanges();
            }
          };
          dispatcher.addEventListener('pointermove', onMove);
          dispatcher.addEventListener('pointerup', onUp);
          dispatcher.addEventListener('pointercancel', onUp);
        }}
        className="w-full h-full"
        {...innerProps}
      />

      {/* Floating toolbar for selected element */}
      {selected && (
        <FloatingToolbar
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
            } else {
              // Apply the style directly to the DOM element
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
            if (containerRef.current) removeResizeHandles(containerRef.current);
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
          position={{
            top: selected.rect.top,
            left: selected.rect.left,
            width: selected.rect.width,
          }}
        />
      )}
    </div>
  );
}
