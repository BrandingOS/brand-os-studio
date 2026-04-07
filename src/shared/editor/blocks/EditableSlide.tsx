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
}

interface SelectedElement {
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
  delete el.dataset.originalBg;
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
  el.style.cursor = 'move';
  // Make draggable
  if (!el.dataset.draggable) {
    el.dataset.draggable = 'true';
    if (!el.style.position || el.style.position === 'static') {
      el.style.position = 'relative';
    }
  }
}

/** Add resize handles overlay for images */
function addResizeHandles(el: HTMLElement, container: HTMLElement) {
  // Remove existing handles
  container.querySelectorAll('.resize-handle').forEach(h => h.remove());

  if (el.tagName !== 'IMG') return;

  const rect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const positions = [
    { cursor: 'nw-resize', top: rect.top - containerRect.top - 4, left: rect.left - containerRect.left - 4 },
    { cursor: 'ne-resize', top: rect.top - containerRect.top - 4, left: rect.right - containerRect.left - 4 },
    { cursor: 'sw-resize', top: rect.bottom - containerRect.top - 4, left: rect.left - containerRect.left - 4 },
    { cursor: 'se-resize', top: rect.bottom - containerRect.top - 4, left: rect.right - containerRect.left - 4 },
  ];

  positions.forEach(pos => {
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.style.cssText = `position:absolute;width:8px;height:8px;background:#3B82F6;border:1px solid white;border-radius:2px;cursor:${pos.cursor};z-index:50;top:${pos.top}px;left:${pos.left}px;`;

    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = el.offsetWidth;
      const startH = el.offsetHeight;

      const onMove = (moveE: MouseEvent) => {
        const dx = moveE.clientX - startX;
        const dy = moveE.clientY - startY;
        if (pos.cursor.includes('e')) {
          el.style.width = Math.max(20, startW + dx) + 'px';
        }
        if (pos.cursor.includes('s')) {
          el.style.height = Math.max(20, startH + dy) + 'px';
        }
        if (pos.cursor === 'nw-resize') {
          el.style.width = Math.max(20, startW - dx) + 'px';
          el.style.height = Math.max(20, startH - dy) + 'px';
        }
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    container.appendChild(handle);
  });
}

function removeResizeHandles(container: HTMLElement) {
  container.querySelectorAll('.resize-handle').forEach(h => h.remove());
}

export function EditableSlide({ children, frozenHtml }: EditableSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [editing, setEditing] = useState(false);
  const selectedRef = useRef<SelectedElement | null>(null);

  // Keep ref in sync with state for event handlers
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

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

    // Clear previous selection styles
    if (selectedRef.current?.element && selectedRef.current.element !== el) {
      removeSelectionStyles(selectedRef.current.element);
    }

    const rect = el.getBoundingClientRect();
    const type = detectBlockType(el);

    applySelectionStyles(el);
    if (containerRef.current) {
      removeResizeHandles(containerRef.current);
      if (type === 'image' || type === 'logo') {
        addResizeHandles(el, containerRef.current);
      }
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
      el.focus();
      setEditing(true);

      // Select all text in the element
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);

      // Update selected to this element
      const rect = el.getBoundingClientRect();
      applySelectionStyles(el);
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

  // Close selection when clicking outside the entire editor
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        clearSelection();
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [clearSelection]);

  // Escape and Delete key handling
  const editingRef = useRef(editing);
  editingRef.current = editing;

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
    <div ref={containerRef} className="relative w-full h-full" onClick={handleContainerClick}>
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={(e) => {
          if (!selected || editing) return;
          const el = selected.element;
          if (!el.dataset.draggable) return;
          // Don't drag if clicking on toolbar or resize handle
          if ((e.target as HTMLElement).closest('.resize-handle')) return;

          const startX = e.clientX;
          const startY = e.clientY;
          const startLeft = parseInt(el.style.left || '0') || 0;
          const startTop = parseInt(el.style.top || '0') || 0;
          let moved = false;

          const onMove = (moveE: MouseEvent) => {
            const dx = moveE.clientX - startX;
            const dy = moveE.clientY - startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
            if (!moved) return;
            el.style.position = 'relative';
            el.style.left = (startLeft + dx) + 'px';
            el.style.top = (startTop + dy) + 'px';
          };
          const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (moved) {
              // Update toolbar position
              const rect = el.getBoundingClientRect();
              setSelected(prev => prev ? { ...prev, rect } : null);
            }
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
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
