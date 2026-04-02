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
  if (tag === 'p' || tag === 'span' || tag === 'div') {
    const fontSize = window.getComputedStyle(el).fontSize;
    const size = parseFloat(fontSize);
    if (size > 24) return 'heading';
    return 'text';
  }
  return 'text';
}

export function EditableSlide({ children }: EditableSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [editing, setEditing] = useState(false);

  // Handle click on slide content
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!containerRef.current?.contains(target)) return;

    // Don't select the root container
    if (target === containerRef.current) {
      setSelected(null);
      setEditing(false);
      return;
    }

    // Find the nearest meaningful element
    let el = target;
    // Walk up to find text/img elements (skip tiny spans)
    while (el.parentElement && el.parentElement !== containerRef.current) {
      const text = el.textContent?.trim() || '';
      if (text.length > 2 || el.tagName === 'IMG' || el.tagName === 'SVG') break;
      el = el.parentElement;
    }

    const rect = el.getBoundingClientRect();
    const type = detectBlockType(el);
    setSelected({ element: el, type, rect });
    setEditing(false);

    // Add visual selection
    el.style.outline = '2px solid rgba(255,255,255,0.35)';
    el.style.outlineOffset = '4px';
    el.style.borderRadius = '8px';
  }, []);

  // Handle double-click for text editing
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!selected) return;
    const target = e.target as HTMLElement;
    const type = detectBlockType(target);

    if (type === 'text' || type === 'heading') {
      target.contentEditable = 'true';
      target.focus();
      setEditing(true);

      // Select all text
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [selected]);

  // Clear selection when clicking outside
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      clearSelection();
    }
  }, []);

  const clearSelection = useCallback(() => {
    if (selected?.element) {
      selected.element.style.outline = '';
      selected.element.style.outlineOffset = '';
      selected.element.style.borderRadius = '';
      selected.element.contentEditable = 'false';
    }
    setSelected(null);
    setEditing(false);
  }, [selected]);

  // Escape clears selection
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selected) {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selected, clearSelection]);

  // Update toolbar position on scroll/resize
  useEffect(() => {
    if (!selected) return;
    const update = () => {
      const rect = selected.element.getBoundingClientRect();
      setSelected(prev => prev ? { ...prev, rect } : null);
    };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [selected]);

  return (
    <div ref={containerRef} className="relative" onClick={handleContainerClick}>
      <div onClick={handleClick} onDoubleClick={handleDoubleClick}>
        {children}
      </div>

      {/* Floating toolbar for selected element */}
      {selected && (
        <FloatingToolbar
          blockType={selected.type}
          style={{
            fontWeight: selected.element.style.fontWeight || window.getComputedStyle(selected.element).fontWeight || undefined,
            color: selected.element.style.color || undefined,
            textAlign: (selected.element.style.textAlign as 'left' | 'center' | 'right') || undefined,
          }}
          onChangeType={(newType) => {
            if (!selected.element) return;
            // Apply type change visually
            if (newType === 'heading') {
              selected.element.style.fontSize = '2em';
              selected.element.style.fontWeight = '700';
            } else if (newType === 'text') {
              selected.element.style.fontSize = '';
              selected.element.style.fontWeight = '400';
            }
            setSelected({ ...selected, type: newType });
          }}
          onChangeStyle={(key, value) => {
            if (!selected.element) return;
            (selected.element.style as any)[key] = value;
            // Force re-render to update toolbar state
            const rect = selected.element.getBoundingClientRect();
            setSelected({ ...selected, rect });
          }}
          onDelete={() => {
            if (!selected.element) return;
            selected.element.style.display = 'none';
            clearSelection();
          }}
          onDuplicate={() => {
            if (!selected.element) return;
            const clone = selected.element.cloneNode(true) as HTMLElement;
            clone.style.outline = '';
            clone.style.outlineOffset = '';
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
