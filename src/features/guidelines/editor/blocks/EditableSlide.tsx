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
  children: React.ReactNode;
}

interface SelectedElement {
  element: HTMLElement;
  type: BlockType;
  rect: DOMRect;
}

function detectBlockType(el: HTMLElement): BlockType {
  const tag = el.tagName.toLowerCase();
  if (tag === 'img') return 'image';
  if (tag === 'svg') return 'image';
  if (tag === 'h1' || tag === 'h2' || tag === 'h3') return 'heading';
  if (tag === 'blockquote') return 'text';
  if (tag === 'p' || tag === 'span' || tag === 'div') {
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
  if (el.contentEditable === 'true') {
    el.contentEditable = 'false';
    el.blur();
  }
}

/** Apply selection styles to an element */
function applySelectionStyles(el: HTMLElement) {
  el.style.outline = '2px solid rgba(255,255,255,0.35)';
  el.style.outlineOffset = '4px';
}

export function EditableSlide({ children }: EditableSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [editing, setEditing] = useState(false);
  const selectedRef = useRef<SelectedElement | null>(null);

  // Keep ref in sync with state for event handlers
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Find the nearest meaningful element from a click target
  const findMeaningfulElement = useCallback((target: HTMLElement): HTMLElement => {
    let el = target;
    while (el.parentElement && el.parentElement !== containerRef.current) {
      const tag = el.tagName.toLowerCase();
      // Stop at meaningful elements
      if (tag === 'img' || tag === 'svg' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'blockquote') break;
      const text = el.textContent?.trim() || '';
      if (text.length > 2) break;
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
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!selectedRef.current) return;

      if (e.key === 'Escape') {
        clearSelection();
      }

      // Delete/Backspace removes element (only when not editing text)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !editing) {
        e.preventDefault();
        selectedRef.current.element.remove();
        setSelected(null);
        setEditing(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [clearSelection, editing]);

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

  return (
    <div ref={containerRef} className="relative w-full h-full" onClick={handleContainerClick}>
      <div onClick={handleClick} onDoubleClick={handleDoubleClick} className="w-full h-full">
        {children}
      </div>

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
            if (!selected.element) return;
            selected.element.remove();
            setSelected(null);
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
