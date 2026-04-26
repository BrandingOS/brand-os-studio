/**
 * InlineEditableSlide — wraps a slide composition in `EditableSlide`
 * and auto-saves any DOM mutation as the slide's frozen HTML.
 *
 * Reusable across the case-study deck and the pitch deck (and any
 * future fixed-canvas slide system). Provides:
 *   - Click-to-select + FloatingToolbar (via EditableSlide)
 *   - Double-click-to-edit text inline
 *   - Drag/resize for leaf elements
 *   - Per-slide undo/redo snapshot stack with Cmd+Z / Cmd+Shift+Z
 *   - Debounced auto-save (800ms) via the `onSave` callback
 *
 * Render-mode lifecycle:
 *   - On mount: render React children. After ~250ms (so FitText and
 *     useLayoutEffects settle), snapshot innerHTML → setDocHtml(baseline)
 *     → from now on the inner tree is mounted via dangerouslySetInnerHTML
 *     and React no longer reconciles it.
 *   - During edits: live DOM mutations are observed; we push history +
 *     debounce-save, but we DO NOT call setDocHtml again — feeding
 *     fresh innerHTML mid-gesture rebuilds the inner tree and detaches
 *     the element being dragged.
 *   - On reset (host clears `frozenHtml`): we drop back to React render
 *     mode and re-capture a fresh baseline.
 *
 * The flip-once-on-mount design is critical. Earlier versions flipped
 * on the first MutationObserver callback, but that lands inside the
 * very gesture (drag start) that creates the mutation, so the inner
 * DOM is replaced mid-drag and selection drops on mouseup.
 *
 * Selection styles (outline, box-shadow, data-original-bg) are stripped
 * from each captured snapshot so click-noise doesn't pollute history.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EditableSlide, type SelectedElement } from './blocks/EditableSlide';

interface InlineEditableSlideProps {
  /** Stable index for keyboard-shortcut gating + observer reset. */
  slideIndex: number;
  /** Previously-saved HTML, if any. Set this back from the host on reset. */
  frozenHtml: string | undefined;
  /** Active = listening for Cmd+Z keyboard shortcuts on this slide only. */
  isActive: boolean;
  /** Frame width in CSS pixels (e.g. 1920 for the deck canvases). */
  width: number;
  /** Frame height in CSS pixels (e.g. 1080). */
  height: number;
  /** Save callback. Called debounced after each edit. */
  onSave: (html: string | undefined) => void;
  /** Selection-change callback for host-rendered property panels. */
  onSelectionChange?: (sel: SelectedElement | null) => void;
  /** The React composition to render on first mount. */
  children: ReactNode;
}

export function InlineEditableSlide({
  slideIndex,
  frozenHtml,
  isActive,
  width,
  height,
  onSave,
  onSelectionChange,
  children,
}: InlineEditableSlideProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [docHtml, setDocHtml] = useState<string | null>(frozenHtml ?? null);
  // Mirrors `docHtml` for use inside callbacks/observers without making
  // the observer effect re-run (which would tear down + recreate the
  // observer mid-edit and lose state).
  const docHtmlRef = useRef<string | null>(frozenHtml ?? null);
  useEffect(() => {
    docHtmlRef.current = docHtml;
  }, [docHtml]);
  const isApplyingRef = useRef(false);
  const didMountRef = useRef(false);

  const historyRef = useRef<{ stack: string[]; index: number }>({
    stack: [],
    index: -1,
  });
  const isHistoryNavRef = useRef(false);

  // Re-seed when the host hands down a new frozenHtml (e.g. brand
  // change or reset). Skip self-save echoes by comparing to the
  // history top.
  useEffect(() => {
    const hist = historyRef.current;
    const currentTop = hist.stack[hist.index];
    if (frozenHtml && currentTop === frozenHtml) return;
    setDocHtml(frozenHtml ?? null);
    docHtmlRef.current = frozenHtml ?? null;
    historyRef.current = {
      stack: frozenHtml ? [frozenHtml] : [],
      index: frozenHtml ? 0 : -1,
    };
  }, [frozenHtml, slideIndex]);

  // Capture the React-rendered baseline AND flip into frozen mode.
  // 250ms gives FitText / useLayoutEffects time to settle.
  //
  // The flip happens here (on mount), NOT in the MutationObserver. If
  // we waited for the first user mutation to flip, the swap to
  // dangerouslySetInnerHTML would land mid-drag and detach the dragged
  // element — see header comment.
  useEffect(() => {
    if (frozenHtml !== undefined) return;
    if (docHtmlRef.current !== null) return;
    const t = setTimeout(() => {
      if (docHtmlRef.current !== null) return;
      const baseline = readSlideHtml();
      if (!baseline) return;
      if (historyRef.current.stack.length === 0) {
        historyRef.current = { stack: [baseline], index: 0 };
      }
      docHtmlRef.current = baseline;
      setDocHtml(baseline);
    }, 250);
    return () => clearTimeout(t);
  }, [slideIndex, frozenHtml]);

  // Suppress observer reactions to our own swap. Skip the first run.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    isApplyingRef.current = true;
    const t = setTimeout(() => {
      isApplyingRef.current = false;
    }, 60);
    return () => clearTimeout(t);
  }, [docHtml]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const readSlideHtml = (): string | null => {
    const root = containerRef.current;
    if (!root) return null;
    const editableOuter = root.firstElementChild as HTMLElement | null;
    const editableInner = editableOuter?.firstElementChild as HTMLElement | null;
    if (!editableInner) return null;
    const clone = editableInner.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[style*="outline"]').forEach((el) => {
      const e = el as HTMLElement;
      e.style.outline = '';
      e.style.outlineOffset = '';
      e.style.boxShadow = '';
      e.style.borderRadius = '';
      e.removeAttribute('data-original-bg');
    });
    clone.querySelectorAll('.resize-handle').forEach((el) => el.remove());
    return clone.innerHTML;
  };

  // Pending HTML to commit when the coalesce window closes. Refresh
  // on each mutation; commit ONCE after 300ms of idle. This is
  // critical for drag/resize: 60+ mutations per second would create
  // 60+ history entries and make Cmd+Z step back pixel-by-pixel
  // instead of undoing the whole gesture.
  const pendingHtmlRef = useRef<string | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const commit = () => {
      const html = pendingHtmlRef.current;
      pendingHtmlRef.current = null;
      if (html === null) return;
      const hist = historyRef.current;
      if (html === hist.stack[hist.index]) return;
      const trimmed = hist.stack.slice(0, hist.index + 1);
      trimmed.push(html);
      while (trimmed.length > 100) trimmed.shift();
      historyRef.current = { stack: trimmed, index: trimmed.length - 1 };
      onSave(html);
    };

    const observer = new MutationObserver(() => {
      if (isApplyingRef.current) return;
      if (isHistoryNavRef.current) return;
      const next = readSlideHtml();
      if (next === null) return;
      // Update the pending snapshot and reset the debounce. ONE
      // history entry will be pushed once mutations settle.
      pendingHtmlRef.current = next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(commit, 300);
    });
    observer.observe(node, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });

    // Listen for a global "flush all pending edits" signal — fired by
    // the dock's manual Save button so the user gets immediate
    // confirmation that everything is on disk.
    const onFlush = () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      commit();
    };
    window.addEventListener('deck-flush-edits', onFlush);

    return () => {
      observer.disconnect();
      window.removeEventListener('deck-flush-edits', onFlush);
      // Flush any pending edit before unmount so an in-flight resize
      // doesn't get lost on slide switch.
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        commit();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex]);

  // Cmd/Ctrl+Z + Cmd/Ctrl+Shift+Z + Ctrl+Y — only on the active slide.
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      if (!cmd) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const hist = historyRef.current;
        if (hist.index <= 0) return;
        const nextIdx = hist.index - 1;
        const html = hist.stack[nextIdx];
        historyRef.current = { stack: hist.stack, index: nextIdx };
        isHistoryNavRef.current = true;
        setDocHtml(html);
        onSave(html);
        setTimeout(() => {
          isHistoryNavRef.current = false;
        }, 80);
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        const hist = historyRef.current;
        if (hist.index >= hist.stack.length - 1) return;
        const nextIdx = hist.index + 1;
        const html = hist.stack[nextIdx];
        historyRef.current = { stack: hist.stack, index: nextIdx };
        isHistoryNavRef.current = true;
        setDocHtml(html);
        onSave(html);
        setTimeout(() => {
          isHistoryNavRef.current = false;
        }, 80);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, onSave]);

  return (
    <div ref={containerRef} style={{ width, height, position: 'relative' }}>
      <EditableSlide frozenHtml={docHtml ?? undefined} onSelectionChange={onSelectionChange}>
        {docHtml === null ? children : null}
      </EditableSlide>
    </div>
  );
}
